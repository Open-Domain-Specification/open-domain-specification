import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import {
	type ElectronApplication,
	_electron as electron,
	expect,
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
 * Counts the times VS Code's webview host calls `window.focus()` on a webview's
 * content. VS Code hands focus to a webview in two steps: `WebviewElement.focus()`
 * at once, then, after a 50ms delayer, a `focus` message that the webview host
 * answers with `contentWindow.focus()`. That second step lands whenever it
 * lands, including after the next command palette has opened, and a palette
 * closes on blur. The count is the one observable end of the hand-off.
 */
const COUNT_HOST_FOCUS = `(() => {
	const focus = window.focus;
	window.__odsHostFocus = 0;
	window.focus = function () {
		window.__odsHostFocus++;
		return focus.call(this);
	};
})()`;

const hostFocusCount = async (window: Page): Promise<number> => {
	let total = 0;
	for (const frame of window.frames()) {
		if (!frame.url().startsWith("vscode-webview://")) continue;
		total += await frame
			.evaluate(
				() =>
					(window as unknown as { __odsHostFocus?: number }).__odsHostFocus ??
					0,
			)
			.catch(() => 0);
	}
	return total;
};

/** Whether the workbench's focus is on a webview, as it is after a page opens. */
const webviewHoldsFocus = (window: Page): Promise<boolean> =>
	window.evaluate(
		() => document.activeElement?.matches("iframe.webview") === true,
	);

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
	// Added before any webview exists, so each one is counted from its start.
	await app.context().addInitScript(COUNT_HOST_FOCUS);
	if (process.env.ODS_LOGS_DIR)
		await app
			.context()
			.tracing.start({ screenshots: true, snapshots: true, sources: false });
	const window = await app.firstWindow();
	await window.waitForSelector(".monaco-workbench", { timeout: 60_000 });
	// `.monaco-workbench` is there long before the window takes keys: a key sent
	// then can be dropped (F1 pressed too early opened no palette, and the next
	// wait timed out). Ready is the status bar drawn, the folder listed in the
	// explorer and the window holding focus, which are what a reader waits for.
	await window.waitForSelector(".statusbar", { timeout: 60_000 });
	await window.waitForSelector(".explorer-folders-view .monaco-list-row", {
		timeout: 60_000,
	});
	await window.waitForFunction(() => document.hasFocus(), undefined, {
		timeout: 60_000,
	});
	return {
		app,
		window,
		close: async () => {
			// CI names a folder to keep evidence in, since the scratch dir below
			// is removed: a trace and the last screenshot of this launch, then
			// VS Code's own logs, which explain a launch that never came up.
			const keep = process.env.ODS_LOGS_DIR;
			const name = basename(scratch);
			if (keep) {
				mkdirSync(keep, { recursive: true });
				await window
					.screenshot({ path: join(keep, `${name}.png`) })
					.catch(() => undefined);
				await app
					.context()
					.tracing.stop({ path: join(keep, `${name}-trace.zip`) })
					.catch(() => undefined);
			}
			await app.close().catch(() => undefined);
			const logs = join(scratch, "user", "logs");
			if (keep && existsSync(logs))
				cpSync(logs, join(keep, `${name}-logs`), { recursive: true });
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
	// Note whether this call starts from a focused webview, and how many
	// hand-offs it has seen, so the end of the call can wait for its own.
	const fromWebview = await webviewHoldsFocus(window);
	const handOffs = await hostFocusCount(window);
	await window.keyboard.press("F1");
	// Type into the palette once it is up, not into whatever had focus.
	await window.waitForSelector(".quick-input-widget", { state: "visible" });
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
	// Closing a quick pick that was opened from a webview returns focus to it,
	// and the last step of that lands about 70ms later. A palette the caller
	// opens before it lands is closed by it: it was the second call in a test
	// that found the palette visible and then gone. Wait for the landing.
	if (fromWebview)
		await expect
			.poll(() => hostFocusCount(window), {
				message: "VS Code handing focus back to the webview",
			})
			.toBeGreaterThan(handOffs);
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

/**
 * Runs a command through the palette with real keys: F1, the title, then Enter
 * once the first hit is that command. A different first hit fails here rather
 * than running whatever the fuzzy match ranked first.
 */
export async function runPaletteCommand(
	window: Page,
	title: string,
): Promise<void> {
	await window.keyboard.press("F1");
	await window.waitForSelector(".quick-input-widget", { state: "visible" });
	await window.keyboard.type(title);
	await expect
		.poll(
			() =>
				window
					.locator(".quick-input-list .monaco-list-row")
					.first()
					.innerText()
					.catch(() => ""),
			{ message: `the palette's first hit for "${title}"` },
		)
		.toContain(title);
	await window.keyboard.press("Enter");
}

/**
 * Answers one quick pick with real keys: waits for its title, types the
 * filter, checks the first hit holds every text in `expected` (so the keys
 * cannot select a neighbour), then presses Enter.
 */
export async function answerQuickPick(
	window: Page,
	title: string,
	filter: string,
	expected: string[],
): Promise<void> {
	await expect(window.locator(".quick-input-title")).toHaveText(title, {
		timeout: 30_000,
	});
	await window.keyboard.type(filter);
	await expect
		.poll(
			async () =>
				(
					await window
						.locator(".quick-input-list .monaco-list-row")
						.first()
						.innerText()
						.catch(() => "")
				).replace(/\s+/g, " "),
			{ message: `the first hit of "${title}" for "${filter}"` },
		)
		.toEqual(
			expect.stringMatching(new RegExp(expected.map(escapeRe).join(".*"), "s")),
		);
	await window.keyboard.press("Enter");
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The webview content frame that holds an authoring form: the one with a real
 * `form[data-ods-form]` in it (the detail panel's frames are found by their
 * h1, which a form also has, so this asks for the form itself).
 */
export async function formContentFrame(
	window: Page,
	timeoutMs = 30_000,
): Promise<Frame> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		for (const frame of window.frames()) {
			if (!frame.url().startsWith("vscode-webview://")) continue;
			if (frame.parentFrame()?.url().startsWith("vscode-webview://") !== true)
				continue;
			const found = await frame
				.evaluate(() => document.querySelector("form[data-ods-form]") !== null)
				.catch(() => false);
			if (found) return frame;
		}
		await window.waitForTimeout(250);
	}
	throw new Error(
		`no webview content frame held form[data-ods-form]; frames: ${window
			.frames()
			.map((f) => `${f.name()}=${f.url().slice(0, 80)}`)
			.join(", ")}`,
	);
}

/** Whether any webview frame still holds an authoring form. */
export const formIsOpen = async (window: Page): Promise<boolean> => {
	for (const frame of window.frames()) {
		if (!frame.url().startsWith("vscode-webview://")) continue;
		const found = await frame
			.evaluate(() => document.querySelector("form[data-ods-form]") !== null)
			.catch(() => false);
		if (found) return true;
	}
	return false;
};
