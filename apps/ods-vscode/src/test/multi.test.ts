import * as assert from "node:assert/strict";
import {
	existsSync,
	promises as fs,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import type {
	ProbedElement,
	WebviewMessage,
} from "@open-domain-specification/pages";
import * as vscode from "vscode";
import type { FormInit, FormToHost } from "../authoring/form-protocol";
import type { FormSession } from "../authoring/session";
import type { OdsTestApi } from "../extension";
import { searchIndex } from "../search";
import type { ModelNode } from "../tree";

const EXTENSION_ID = "open-domain-specification.ods-vscode";
const FILES = ["a#%.json", "my team.json", "ü/é.json"];
const TEAMS = ["Team Hash", "Team Space", "Team Accent"];
const LEDGER = "#/boundedcontexts/ledger";
const LEDGER_ROUTES = [
	"#/workspaces/a%23%25.json/boundedcontexts/ledger",
	"#/workspaces/my%20team.json/boundedcontexts/ledger",
	"#/workspaces/%C3%BC~1%C3%A9.json/boundedcontexts/ledger",
];

/**
 * A folder of three team files read as one set in a real VS Code: names that
 * need encoding, the same local ids in every file, and a ring of file-qualified
 * consumptions. What is held here is that every surface of the extension names
 * the file that owns what it shows: Problems, the tree, search, Reveal in JSON,
 * the webview's routes and the static export.
 */
async function until(
	check: () => boolean | Promise<boolean>,
	message: string,
	timeout = 30_000,
) {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (await check()) return;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	assert.fail(`${message} (waited ${timeout}ms)`);
}

const trimmed = (els: ProbedElement[] | undefined) =>
	(els ?? []).map((e) => e.text.replace(/\s+/g, " ").trim());

describe("a folder of files read as one set in a real VS Code", function () {
	this.timeout(120_000);

	let api: OdsTestApi;
	type WorkspaceFile = OdsTestApi["project"]["workspaces"][number];
	/** The project replaces a file's entry on every reload, so a file is looked up afresh each time. */
	const fileOf = (name: string): WorkspaceFile => {
		const found = api.project.workspaces.find((f) => f.relativePath === name);
		assert.ok(found, `${name} should be loaded`);
		return found;
	};
	let files: WorkspaceFile[];
	let readyMessages = 0;
	/** Every route the webview has reported, kept apart from `posted`, which each read clears. */
	const routesSeen = new Set<string>();
	const posted: WebviewMessage[] = [];
	let subscription: vscode.Disposable;

	/**
	 * The committed fixture is opened in place, so every byte of its .ods folder
	 * is taken before any test and put back after (and by the test that writes).
	 */
	let odsRoot = "";
	const fixtureBytes = new Map<string, Buffer>();
	const walk = (dir: string): string[] =>
		readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
			e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
		);
	const restoreFixture = () => {
		for (const file of walk(odsRoot))
			if (!fixtureBytes.has(file)) rmSync(file, { force: true });
		for (const [file, bytes] of fixtureBytes)
			if (!existsSync(file) || !readFileSync(file).equals(bytes))
				writeFileSync(file, bytes);
	};
	const fixtureIntact = () =>
		walk(odsRoot).length === fixtureBytes.size &&
		[...fixtureBytes].every(
			([file, bytes]) => existsSync(file) && readFileSync(file).equals(bytes),
		);

	before(async () => {
		odsRoot = path.join(
			vscode.workspace.workspaceFolders?.[0].uri.fsPath as string,
			".ods",
		);
		for (const file of walk(odsRoot))
			fixtureBytes.set(file, readFileSync(file));
		const extension = vscode.extensions.getExtension<OdsTestApi>(EXTENSION_ID);
		assert.ok(extension, `extension ${EXTENSION_ID} is not installed`);
		api = await extension.activate();
		await until(
			() => api.project.workspaces.length === FILES.length,
			"the three files were not all loaded",
		);
		files = FILES.map(fileOf);
		subscription = api.panel.onDidReceiveWebviewMessage((m) => {
			posted.push(m);
			if (m.type === "ready") readyMessages += 1;
			if (m.type === "navigated") routesSeen.add(m.ref);
		});
	});

	after(async () => {
		subscription.dispose();
		await vscode.commands.executeCommand("workbench.action.closeAllEditors");
		restoreFixture();
		assert.ok(fixtureIntact(), "the committed fixture ends byte-identical");
	});

	/** Asks the webview until its heading names the page and `ready` holds of what the selectors matched. */
	async function read(
		selectors: string[],
		ready: (probed: Record<string, ProbedElement[]>) => boolean,
		what: string,
	) {
		const all = ["main h1", ...selectors];
		let last: Record<string, ProbedElement[]> | undefined;
		await until(
			async () => {
				posted.length = 0;
				api.panel.probe(all);
				await new Promise((resolve) => setTimeout(resolve, 300));
				const answer = [...posted]
					.reverse()
					.find(
						(m): m is Extract<WebviewMessage, { type: "rendered" }> =>
							m.type === "rendered",
					);
				last = answer?.probed;
				return !!last && ready(last);
			},
			`the webview never showed ${what}; it last said ${JSON.stringify(last)}`,
			45_000,
		);
		return last as Record<string, ProbedElement[]>;
	}

	it("loads the three files as one folder, in code-point order, each with the team it holds", () => {
		assert.deepEqual(
			api.project.folderFiles(files[0]).map((f) => f.relativePath),
			FILES,
		);
		assert.deepEqual(
			api.project.folderFiles(files[2]).map((f) => f.workspace?.name),
			TEAMS,
		);
		assert.equal(
			new Set(files.map((f) => api.project.folderKey(f))).size,
			1,
			"one set for the folder",
		);
	});

	it("puts each file's findings on that file in the Problems panel, six each, from its own element", () => {
		for (const file of files) {
			const entries = vscode.languages
				.getDiagnostics(file.uri)
				.filter((d) => d.source === "ods");
			assert.equal(
				entries.length,
				6,
				`${file.relativePath}: ${entries.length}`,
			);
			assert.deepEqual(entries.map((d) => String(d.code)).sort(), [
				"aggregate-consumes-inside",
				"consumption-by-required",
				"relationship-declared",
				"role-coherence",
				"role-coherence",
				"root-identity",
			]);
		}
	});

	it("has one tree root per file, and a consumption link that reveals the file that provides it", () => {
		const roots = api.tree.getChildren();
		assert.deepEqual(
			roots.map((r) => r.label),
			TEAMS,
		);
		assert.deepEqual(
			roots.map(
				(r) => String(api.tree.getTreeItem(r).description).split(" · ")[0],
			),
			FILES,
		);
		const child = (n: ModelNode | undefined, label: string) => {
			const found = api.tree.getChildren(n).find((c) => c.label === label);
			assert.ok(found, `no ${label}`);
			return found;
		};
		for (const i of FILES.keys()) {
			const ledger = child(child(roots[i], "Bounded Contexts"), "Ledger");
			const account = child(child(ledger, "Aggregates"), "Account");
			const [link] = api.tree.getChildren(child(account, "Consumes"));
			const item = api.tree.getTreeItem(link);
			const args = item.command?.arguments as [(typeof files)[number], string];
			// The ring: each file's Account consumes the next file's Post.
			assert.equal(args[0].relativePath, FILES[(i + 1) % FILES.length]);
			assert.equal(args[0].uri.toString() === files[i].uri.toString(), false);
		}
	});

	it("finds the same name in each file as separate hits, each opening the page in its own file", () => {
		const ledgers = files.flatMap((f) =>
			[...searchIndex(f)].filter((h) => h.label.endsWith("Ledger")),
		);
		assert.equal(ledgers.length, 3);
		assert.deepEqual(
			ledgers.map((h) => h.file.relativePath),
			FILES,
		);
		assert.deepEqual(
			ledgers.map((h) => h.detail),
			FILES.map((f, i) => `${TEAMS[i]} (${f})`),
		);
	});

	it("opens each file's Ledger in the one webview, naming the file in the route, without reloading the page", async () => {
		await vscode.commands.executeCommand("ods.openPage", {
			file: files[0],
			ref: LEDGER,
		});
		await read(
			[".crumbs"],
			(p) =>
				trimmed(p["main h1"]).some((h) => h.includes("Ledger")) &&
				trimmed(p[".crumbs"]).some((c) => c.includes("Team Hash")),
			"Team Hash's Ledger",
		);
		const before = readyMessages;
		for (let i = 1; i < FILES.length; i++) {
			await vscode.commands.executeCommand("ods.openPage", {
				file: files[i],
				ref: LEDGER,
			});
			await read(
				[".crumbs"],
				(p) => trimmed(p[".crumbs"]).some((c) => c.includes(TEAMS[i])),
				`${TEAMS[i]}'s Ledger`,
			);
		}
		assert.equal(
			readyMessages,
			before,
			"another file of the folder reloaded the page",
		);
		// The webview reported where the reader is as a route that names the file.
		await until(
			() => routesSeen.has(LEDGER_ROUTES[2]),
			`no navigated message for ${LEDGER_ROUTES[2]}; saw ${JSON.stringify([...routesSeen])}`,
		);
		for (const route of LEDGER_ROUTES) assert.ok(routesSeen.has(route), route);
	});

	it("follows a route of the webview back to the file that owns it, in the tree and in Reveal", async () => {
		const opened: Array<[string, string]> = [];
		const watch = api.panel.onDidOpen((l) =>
			opened.push([l.file.relativePath, l.ref]),
		);
		try {
			// The reader follows a link to Team Space's Ledger inside the page: the
			// app navigates by itself and reports a route that names the file.
			await vscode.commands.executeCommand("ods.openPage", {
				file: files[0],
				ref: LEDGER,
			});
			(api.panel as unknown as { post(m: unknown): void }).post({
				type: "navigate",
				ref: LEDGER_ROUTES[1],
			});
			await until(
				() => opened.some(([f, r]) => f === "my team.json" && r === LEDGER),
				`the tree was not told the file: ${JSON.stringify(opened)}`,
			);
		} finally {
			watch.dispose();
		}
		// Reveal in JSON opens the file that owns the page and selects the element in it,
		// for each file, though all three hold a `ledger` at one ref.
		for (const [i, name] of FILES.entries()) {
			await vscode.commands.executeCommand("ods.revealInJson", {
				file: files[i],
				ref: LEDGER,
			});
			const editor = vscode.window.activeTextEditor;
			assert.ok(editor, `no editor opened for ${name}`);
			assert.equal(
				editor.document.uri.fsPath.normalize("NFC"),
				path
					.join(
						vscode.workspace.workspaceFolders?.[0].uri.fsPath as string,
						".ods",
						...name.split("/"),
					)
					.normalize("NFC"),
			);
			assert.equal(editor.document.getText(editor.selection), '"ledger"');
			assert.match(
				editor.document.getText(),
				new RegExp(`"name": "${TEAMS[i]}"`),
			);
		}
	});

	it("labels a file whose text stops loading as its last good load, in the tree, in Problems and beside its pages, then clears it", async () => {
		const uri = files[0].uri;
		const doc = await vscode.workspace.openTextDocument(uri);
		await vscode.window.showTextDocument(doc);
		const edit = new vscode.WorkspaceEdit();
		edit.replace(
			doc.uri,
			new vscode.Range(0, 0, doc.lineCount, 0),
			'{ "name": ',
		);
		assert.equal(await vscode.workspace.applyEdit(edit), true);
		try {
			await until(
				() => fileOf(FILES[0]).stale === true,
				"the file was never marked stale",
			);
			assert.match(String(fileOf(FILES[0]).error), /not valid JSON/);
			const root = api.tree.getChildren()[0];
			assert.match(
				String(api.tree.getTreeItem(root).description),
				/last good, current text does not load/,
			);
			const problems = vscode.languages
				.getDiagnostics(uri)
				.filter((d) => d.source === "ods");
			assert.deepEqual(
				problems.map((d) => String(d.code)),
				["file-not-loaded"],
			);
			// The other two files still show their own findings, judged without the broken one.
			assert.equal(
				vscode.languages
					.getDiagnostics(files[1].uri)
					.filter((d) => d.source === "ods").length >= 1,
				true,
			);
			await vscode.commands.executeCommand("ods.openPage", {
				file: fileOf(FILES[0]),
				ref: LEDGER,
			});
			const probed = await read(
				['[data-notice="stale"]'],
				(p) => (p['[data-notice="stale"]']?.length ?? 0) > 0,
				"the stale notice",
			);
			assert.match(
				trimmed(probed['[data-notice="stale"]'])[0],
				/last version of a#%\.json that loaded/,
			);
		} finally {
			await vscode.window.showTextDocument(doc);
			await vscode.commands.executeCommand(
				"workbench.action.files.revert",
				uri,
			);
		}
		await until(
			() => fileOf(FILES[0]).stale !== true,
			"the file stayed stale after revert",
		);
		const probed = await read(
			['[data-notice="stale"]'],
			(p) => (p['[data-notice="stale"]']?.length ?? 0) === 0,
			"the stale notice gone",
		);
		assert.equal(probed['[data-notice="stale"]']?.length ?? 0, 0);
	});

	it("exports the folder as one set: every file at its path, in the bootstrap and as plain JSON", async () => {
		const outDir = path.join(
			vscode.workspace.workspaceFolders?.[0].uri.fsPath as string,
			"ods-site",
		);
		await fs.rm(outDir, { recursive: true, force: true });
		try {
			void vscode.commands.executeCommand("ods.exportSite");
			const index = path.join(outDir, "index.html");
			await until(() => existsSync(index), `${index} was not written`, 60_000);
			const html = readFileSync(index, "utf8");
			const boot = JSON.parse(
				(
					html.match(/window\.__ODS__=(.*?);<\/script>/s)?.[1] as string
				).replace(/\\u003c/g, "<"),
			) as {
				workspaces: Array<{ path: string; set: string; schema: unknown }>;
			};
			assert.deepEqual(
				boot.workspaces.map((w) => w.path),
				FILES,
			);
			assert.equal(new Set(boot.workspaces.map((w) => w.set)).size, 1);
			// The ring survives the export: the first file still names the second by its encoded path.
			assert.ok(
				JSON.stringify(boot.workspaces[0].schema).includes(
					'"$ref":"my%20team.json#/boundedcontexts/ledger/services/payments/provides/post"',
				),
			);
			for (const f of FILES)
				assert.ok(
					existsSync(path.join(outDir, "workspaces", ...f.split("/"))),
					`${f} was not written as JSON`,
				);
		} finally {
			await fs.rm(outDir, { recursive: true, force: true });
		}
	});
	it("declares a relationship in my team.json through api.authoring, writes only that file, and offers every loaded file as its owner", async () => {
		await vscode.commands.executeCommand("workbench.action.closeAllEditors");
		const mine = path.join(odsRoot, "my team.json");
		const others = FILES.filter((f) => f !== "my team.json").map((f) =>
			path.join(odsRoot, ...f.split("/")),
		);
		const otherBefore = others.map((f) => readFileSync(f));
		const mineBefore = JSON.parse(readFileSync(mine, "utf8")) as {
			relationships: unknown[];
		} & Record<string, unknown>;
		assert.equal(mineBefore.relationships.length, 0);
		const panelsBefore = api.authoring.panels.length;
		const panel = await api.authoring.open({
			kind: "add",
			file: "my team.json",
			parentRef: "#",
			family: "relationship",
		});
		assert.ok(panel, "the relationship form opened");
		try {
			assert.equal(api.authoring.panels.length, panelsBefore + 1);
			const session = (panel as unknown as { session: FormSession }).session;
			const init: FormInit = session.init();
			assert.equal(init.owner.file, "my team.json");
			assert.deepEqual(
				init.owner.ownerChoices?.map((c) => c.value).sort(),
				[...FILES].sort(),
				"every loaded file is offered as the owner",
			);
			const choices = init.fields.find((f) => f.name === "upstream")?.choices;
			const end = (file: string) => {
				const found = choices?.find((c) => c.file === file);
				assert.ok(found, `no context offered from ${file}`);
				return found.value;
			};
			const values = Object.fromEntries(
				init.fields.map((f) => [f.name, f.value]),
			);
			const save: FormToHost = {
				type: "save",
				requestId: panel.requestId,
				owner: "my team.json",
				values: {
					...values,
					type: "customer-supplier",
					upstream: end("a#%.json"),
					downstream: end("my team.json"),
					description: "Team Hash supplies the ledger Team Space reads.",
				},
			};
			const replies = await session.handle(save);
			assert.equal(
				replies[0]?.type,
				"saved",
				`the save was not accepted: ${JSON.stringify(replies)}`,
			);
			await until(
				() =>
					(
						JSON.parse(readFileSync(mine, "utf8")) as {
							relationships: unknown[];
						}
					).relationships.length === 1,
				"the relationship never reached my team.json",
			);
			const after = JSON.parse(readFileSync(mine, "utf8")) as {
				relationships: Array<Record<string, unknown>>;
			} & Record<string, unknown>;
			assert.deepEqual(after.relationships, [
				{
					type: "customer-supplier",
					upstream: { $ref: "a%23%25.json#/boundedcontexts/ledger" },
					downstream: { $ref: "#/boundedcontexts/ledger" },
					upstreamRoles: [],
					downstreamRoles: [],
					description: "Team Hash supplies the ledger Team Space reads.",
				},
			]);
			const { relationships: _a, ...restAfter } = after;
			const { relationships: _b, ...restBefore } = mineBefore;
			assert.deepEqual(restAfter, restBefore, "the rest of my team.json");
			for (const [i, f] of others.entries())
				assert.ok(
					readFileSync(f).equals(otherBefore[i]),
					`${f} must be byte-identical`,
				);
		} finally {
			panel.dispose();
			restoreFixture();
		}
		assert.ok(fixtureIntact(), "the fixture is restored after the write");
		await until(
			() => fileOf("my team.json").workspace?.relationships.length === 0,
			"the project did not reload the restored file",
		);
	});

	it("refuses to create a workspace file over a valid or an unloadable target, names the file, and leaves both byte-identical", async () => {
		const root = mkdtempSync(path.join(tmpdir(), "ods-create-"));
		try {
			const ods = path.join(root, ".ods");
			await fs.mkdir(ods);
			const valid = JSON.stringify(
				{ id: "existing_one", name: "Existing One", version: "1" },
				null,
				2,
			);
			const broken = '{ "name": ';
			writeFileSync(path.join(ods, "existing_one.json"), valid);
			writeFileSync(path.join(ods, "broken_one.json"), broken);
			const folder: vscode.WorkspaceFolder = {
				uri: vscode.Uri.file(root),
				name: "temp",
				index: 9,
			};
			const listing = readdirSync(ods).sort();
			const loaded = api.project.workspaces.length;
			for (const [name, file, text] of [
				["Existing One", "existing_one.json", valid],
				["Broken One", "broken_one.json", broken],
			] as const) {
				const refused = await api.project.create(folder, name, "again");
				assert.equal(refused.ok, false, `${name} must be refused`);
				if (refused.ok) continue;
				assert.equal(refused.cause, "exists");
				assert.ok(refused.message.includes(file), refused.message);
				assert.match(refused.message, /left untouched/);
				assert.match(refused.message, /Choose a different workspace name/);
				assert.equal(readFileSync(path.join(ods, file), "utf8"), text);
			}
			assert.deepEqual(readdirSync(ods).sort(), listing, "nothing was created");
			assert.equal(api.project.workspaces.length, loaded);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
		assert.ok(fixtureIntact(), "the committed fixture is untouched");
	});
});
