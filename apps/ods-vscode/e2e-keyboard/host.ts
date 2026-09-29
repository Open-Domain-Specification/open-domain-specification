import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
	type ElectronApplication,
	_electron as electron,
	type Frame,
	type Page,
} from "@playwright/test";
import { downloadAndUnzipVSCode } from "@vscode/test-electron";

/** The build `npm run test:vscode` uses, so the two suites agree on the host. */
export const VSCODE_VERSION = "1.96.4";

const EXTENSION_ROOT = resolve(__dirname, "..");

export interface Host {
	app: ElectronApplication;
	window: Page;
	close(): Promise<void>;
}

export interface LaunchOptions {
	/** Folder to open, relative to `apps/ods-vscode`. */
	folder: string;
	/** Extra Chromium or VS Code switches. */
	args?: string[];
}

/**
 * Starts the real VS Code with this extension loaded, on a clean user-data and
 * extensions dir and with every other extension disabled, driven by Playwright's
 * Electron support so key presses are real input events.
 */
export async function launchVSCode(options: LaunchOptions): Promise<Host> {
	// Reuses the download `test:vscode` made under .vscode-test/, else fetches it.
	const executablePath = await downloadAndUnzipVSCode({
		version: VSCODE_VERSION,
		cachePath: join(EXTENSION_ROOT, ".vscode-test"),
	});
	// The user data dir holds an IPC socket, and the OS caps that path length,
	// so it lives in the system temp folder (see .vscode-test.mjs).
	const scratch = mkdtempSync(join(tmpdir(), "ods-kb-"));
	const env = { ...process.env } as Record<string, string>;
	// A parent Electron-as-node setting would make VS Code start as plain node.
	delete env.ELECTRON_RUN_AS_NODE;
	const app = await electron.launch({
		executablePath,
		env,
		args: [
			resolve(EXTENSION_ROOT, options.folder),
			`--extensionDevelopmentPath=${EXTENSION_ROOT}`,
			`--user-data-dir=${join(scratch, "user")}`,
			`--extensions-dir=${join(scratch, "extensions")}`,
			"--disable-extensions",
			"--disable-workspace-trust",
			"--disable-telemetry",
			"--skip-welcome",
			"--skip-release-notes",
			"--new-window",
			...(options.args ?? []),
		],
	});
	const window = await app.firstWindow();
	await window.waitForSelector(".monaco-workbench", { timeout: 60_000 });
	return {
		app,
		window,
		close: async () => {
			await app.close().catch(() => undefined);
			rmSync(scratch, { recursive: true, force: true });
		},
	};
}

/**
 * Opens a page through the extension with real keys: F1, the command's title,
 * Enter, then the search text and Enter on the first hit. (`ods.openPage`
 * itself needs a target argument, so the palette reaches it through
 * "ODS: Search Domain Model".)
 */
export async function openPageByKeyboard(
	window: Page,
	searchText: string,
): Promise<void> {
	await window.keyboard.press("F1");
	await window.keyboard.type("ODS: Search Domain Model");
	await window.waitForSelector(
		".quick-input-list .monaco-list-row:has-text('Search Domain Model')",
	);
	await window.keyboard.press("Enter");
	await window.waitForSelector(
		".quick-input-widget input[placeholder^='Search domains']",
	);
	await window.keyboard.type(searchText);
	await window.waitForSelector(".quick-input-list .monaco-list-row");
	await window.keyboard.press("Enter");
}

/**
 * Emulates the reduced-motion preference for the workbench and every webview in
 * it. `--force-prefers-reduced-motion` does not reach the webview; this does,
 * because the webview iframes share the workbench page's CDP session.
 */
export async function emulateReducedMotion(
	window: Page,
	value: "reduce" | "no-preference",
): Promise<void> {
	await window.emulateMedia({ reducedMotion: value });
}

/**
 * The frame that holds the page. VS Code nests a webview twice: an outer
 * `index.html?id=<id>` iframe in the workbench, and inside it the content
 * iframe (`fake.html?id=<id>`, named `pending-frame` while loading and
 * `active-frame` once it is shown). The content frame is the child of the
 * outer one that contains the renderer's root.
 */
export async function webviewContentFrame(
	window: Page,
	timeoutMs = 30_000,
): Promise<Frame> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		for (const frame of window.frames()) {
			if (!frame.url().startsWith("vscode-webview://")) continue;
			if (frame.parentFrame()?.url().startsWith("vscode-webview://") !== true)
				continue;
			const rendered = await frame
				.evaluate(() => document.querySelector("h1") !== null)
				.catch(() => false);
			if (rendered) return frame;
		}
		await window.waitForTimeout(250);
	}
	throw new Error(
		`no webview content frame rendered an h1; frames: ${window
			.frames()
			.map((f) => `${f.name()}=${f.url().slice(0, 80)}`)
			.join(", ")}`,
	);
}
