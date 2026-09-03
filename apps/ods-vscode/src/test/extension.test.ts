import * as assert from "node:assert/strict";
import { existsSync, promises as fs } from "node:fs";
import * as path from "node:path";
import type { WebviewMessage } from "@open-domain-specification/pages";
import * as vscode from "vscode";
import type { OdsTestApi } from "../extension";
import {
	capture,
	DARK_THEME,
	LIGHT_THEME,
	prepareWindow,
	SCREENSHOTS_ENABLED,
	settle,
	useTheme,
} from "./screenshots";

const EXTENSION_ID = "open-domain-specification.ods-vscode";
const PETSTORE = "petstore.json";
const WORKSPACE_REF = "#";
const SALES_BC_REF = "#/boundedcontexts/sales_bc";
const ORDER_REF = "#/boundedcontexts/sales_bc/aggregates/order";
const TEAM_REF = "#/teams/orders_team";

/** The webview loads a ~1MB bundle in a real Electron window; be patient. */
const WEBVIEW_TIMEOUT = 15_000;

function folderUri(): vscode.Uri {
	const folder = vscode.workspace.workspaceFolders?.[0];
	assert.ok(folder, "the test window must be opened on the example workspace");
	return folder.uri;
}

async function delay(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Polls the filesystem or other passive state until `check` is true, or fails after `timeout` ms. */
async function waitFor(
	check: () => boolean | Promise<boolean>,
	message: string,
	timeout: number,
): Promise<void> {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await check()) return;
		await delay(100);
	}
	assert.fail(`${message} (waited ${timeout}ms)`);
}

/**
 * Records every message the real webview posts back, so a test can assert on the
 * app's own boot and routing rather than on anything the test stubbed. Waiting is
 * event-driven: a matching message resolves the wait as soon as it arrives.
 */
class MessageLog {
	readonly messages: WebviewMessage[] = [];
	private readonly waiters: {
		predicate: (msg: WebviewMessage) => boolean;
		resolve: (msg: WebviewMessage) => void;
	}[] = [];
	private readonly subscription: vscode.Disposable;

	constructor(panel: OdsTestApi["panel"]) {
		this.subscription = panel.onDidReceiveWebviewMessage((msg) => {
			this.messages.push(msg);
			for (const w of this.waiters.splice(0)) {
				if (w.predicate(msg)) w.resolve(msg);
				else this.waiters.push(w);
			}
		});
	}

	/** Resolves with the first message matching `predicate`, describing the log on timeout. */
	waitFor(
		predicate: (msg: WebviewMessage) => boolean,
		what: string,
		timeout = WEBVIEW_TIMEOUT,
	): Promise<WebviewMessage> {
		const already = this.messages.find(predicate);
		if (already) return Promise.resolve(already);
		return new Promise((resolve, reject) => {
			const timer = setTimeout(
				() =>
					reject(
						new assert.AssertionError({
							message: `timed out after ${timeout}ms waiting for ${what}; webview posted: ${JSON.stringify(this.messages)}`,
						}),
					),
				timeout,
			);
			this.waiters.push({
				predicate,
				resolve: (msg) => {
					clearTimeout(timer);
					resolve(msg);
				},
			});
		});
	}

	dispose(): void {
		this.subscription.dispose();
	}
}

/** The petstore workspace file as loaded by the extension. */
function petstoreFile(
	api: OdsTestApi,
): OdsTestApi["project"]["workspaces"][number] {
	const file = api.project.workspaces.find((f) => f.relativePath === PETSTORE);
	assert.ok(file, `${PETSTORE} should be loaded`);
	return file;
}

describe("ODS extension in a real VS Code window", function () {
	this.timeout(60_000);

	let api: OdsTestApi;

	before(async () => {
		const extension = vscode.extensions.getExtension<OdsTestApi>(EXTENSION_ID);
		assert.ok(extension, `extension ${EXTENSION_ID} is not installed`);
		api = await extension.activate();
	});

	it("activates and loads the example workspace", () => {
		assert.ok(api, "activate() returned no test API");
		const names = api.project.workspaces.map((f) => f.relativePath).sort();
		assert.deepEqual(names, [PETSTORE]);
	});

	describe("ods.openPage", () => {
		let log: MessageLog;

		before(() => {
			log = new MessageLog(api.panel);
		});

		after(() => {
			log.dispose();
		});

		it("boots the pages app in the webview and routes to the ref", async () => {
			const file = petstoreFile(api);

			await vscode.commands.executeCommand("ods.openPage", {
				file,
				ref: ORDER_REF,
			});

			await log.waitFor((m) => m.type === "ready", '{ type: "ready" }');
			await log.waitFor(
				(m) => m.type === "navigated" && m.ref === ORDER_REF,
				`{ type: "navigated", ref: "${ORDER_REF}" }`,
			);
		});

		it("opens a relationship's page from its row in the tree", async () => {
			const file = petstoreFile(api);
			const root = api.tree.getChildren()[0];
			const relationships = api.tree
				.getChildren(root)
				.find((n) => n.label === "Relationships");
			assert.ok(relationships, "the tree has no Relationships group");
			const [first] = api.tree.getChildren(relationships);
			assert.ok(first?.ref, "a relationship row carries no ref to open");
			assert.match(first.ref, /^#\/relationships\//);

			// Exactly what clicking the row does: the command its tree item carries.
			const item = api.tree.getTreeItem(first);
			assert.equal(item.command?.command, "ods.openPage");
			await vscode.commands.executeCommand("ods.openPage", first);

			const navigated = await log.waitFor(
				(m) => m.type === "navigated" && m.ref === first.ref,
				`{ type: "navigated", ref: "${first.ref}" }`,
			);
			assert.equal(navigated.type, "navigated");
			assert.equal(first.file.relativePath, file.relativePath);
		});

		it("reuses the webview for a second ref in the same file", async () => {
			const file = petstoreFile(api);
			const readyCount = log.messages.filter((m) => m.type === "ready").length;

			await vscode.commands.executeCommand("ods.openPage", {
				file,
				ref: TEAM_REF,
			});

			await log.waitFor(
				(m) => m.type === "navigated" && m.ref === TEAM_REF,
				`{ type: "navigated", ref: "${TEAM_REF}" }`,
			);
			assert.equal(
				log.messages.filter((m) => m.type === "ready").length,
				readyCount,
				"the panel reloaded the webview instead of posting navigate to it",
			);
		});
	});

	describe("ods.exportSite", () => {
		const outDir = () => path.join(folderUri().fsPath, "ods-site");

		// Start from nothing, so the assertions cannot pass on a stale export.
		before(async () => {
			await fs.rm(outDir(), { recursive: true, force: true });
		});

		after(async () => {
			await fs.rm(outDir(), { recursive: true, force: true });
		});

		it("writes a static site into the workspace folder", async () => {
			// The command awaits its own "Exported ..." notification, which has a
			// button and so never auto-dismisses; watch the output instead of awaiting.
			void vscode.commands.executeCommand("ods.exportSite");

			const index = path.join(outDir(), "index.html");
			await waitFor(
				() => existsSync(index),
				`${index} was not written`,
				30_000,
			);
			const html = await fs.readFile(index, "utf8");
			assert.ok(
				html.includes("window.__ODS__="),
				"index.html carries no bootstrap payload",
			);
			const assets = await fs.stat(path.join(outDir(), "assets"));
			assert.ok(assets.isDirectory(), "no assets folder was written");
		});
	});

	describe("ods.revealInJson", () => {
		it("opens the workspace file with the ref selected", async () => {
			const file = petstoreFile(api);

			await vscode.commands.executeCommand("ods.revealInJson", {
				file,
				ref: ORDER_REF,
			});

			const editor = vscode.window.visibleTextEditors.find((e) =>
				e.document.uri.fsPath.endsWith(PETSTORE),
			);
			assert.ok(editor, `${PETSTORE} was not opened in an editor`);
			assert.ok(
				!editor.selection.isEmpty,
				"the ref was opened without a selection",
			);
		});
	});

	/**
	 * Marketplace images, regenerated from the running extension rather than
	 * taken by hand. Off unless ODS_SCREENSHOTS=1 (`npm run screenshots`), and
	 * last in the file so nothing it does to the window affects the assertions.
	 */
	describe("marketplace screenshots", () => {
		let log: MessageLog;

		before(async function () {
			if (!SCREENSHOTS_ENABLED) return this.skip();
			log = new MessageLog(api.panel);
			// The export test leaves a sticky notification; it must not be in shot.
			await vscode.commands.executeCommand("notifications.clearAll");
			await prepareWindow();
			await useTheme(LIGHT_THEME);
			await vscode.commands.executeCommand("workbench.view.extension.ods");
			await settle();
		});

		after(() => {
			log?.dispose();
		});

		/** Opens `ref`, waiting for the app's own confirmation that it routed there. */
		async function openPage(ref: string): Promise<void> {
			// A ref can be opened twice in this block, so only count a fresh message.
			const seen = new Set(log.messages);
			await vscode.commands.executeCommand("ods.openPage", {
				file: petstoreFile(api),
				ref,
			});
			await log.waitFor(
				(m) => !seen.has(m) && m.type === "navigated" && m.ref === ref,
				`{ type: "navigated", ref: "${ref}" }`,
			);
			// Only the page in shot: the reveal test left a JSON editor open.
			await vscode.commands.executeCommand(
				"workbench.action.closeOtherEditors",
			);
			await settle();
		}

		it("captures the Workspaces tree beside a page", async () => {
			await openPage(WORKSPACE_REF);
			await capture("workspaces-tree");
		});

		it("captures an aggregate page", async () => {
			await openPage(ORDER_REF);
			await capture("aggregate-page");
		});

		it("captures the search spotlight", async () => {
			// The quick pick only resolves once it is answered, so do not await it.
			void vscode.commands.executeCommand("ods.search");
			await settle();
			await capture("search-spotlight");
			await vscode.commands.executeCommand("workbench.action.closeQuickOpen");
		});

		it("captures a bounded context and its context map in dark mode", async () => {
			await useTheme(DARK_THEME);
			await openPage(SALES_BC_REF);
			await capture("context-map-dark");
			await useTheme(LIGHT_THEME);
		});
	});
});
