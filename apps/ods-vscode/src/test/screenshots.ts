import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import * as vscode from "vscode";

const run = promisify(execFile);

/** Screenshots are a release chore, not part of the assertions; opt in with ODS_SCREENSHOTS=1. */
export const SCREENSHOTS_ENABLED = process.env.ODS_SCREENSHOTS === "1";

/** Fixed so the Marketplace images keep the same crop between releases. */
const WINDOW_SIZE = { width: 1440, height: 900 };
/** Below the menu bar, so the resized window is never clipped by it. */
const WINDOW_ORIGIN = { x: 0, y: 25 };

/** out/test/screenshots.js -> apps/ods-vscode/media/screenshots */
const OUT_DIR = path.join(__dirname, "..", "..", "media", "screenshots");

export const LIGHT_THEME = "Default Light Modern";
export const DARK_THEME = "Default Dark Modern";

/** Lets the workbench finish repainting (theme swap, quick pick animation) before the shutter. */
export async function settle(ms = 1200): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Applies `theme` and waits until the workbench reports it, so a shot can never
 * be taken while the previous theme is still painted.
 */
export async function useTheme(theme: string): Promise<void> {
	const wanted =
		theme === DARK_THEME
			? vscode.ColorThemeKind.Dark
			: vscode.ColorThemeKind.Light;
	const setting = () =>
		vscode.workspace.getConfiguration().get<string>("workbench.colorTheme");
	const write = (value: string) =>
		vscode.workspace
			.getConfiguration()
			.update("workbench.colorTheme", value, vscode.ConfigurationTarget.Global);
	// A run inherits the user data dir of the last one, where this setting may
	// already name the theme we want while the workbench has booted on another.
	// Writing the same value changes nothing, so bounce off the opposite theme.
	if (setting() === theme) {
		await write(theme === DARK_THEME ? LIGHT_THEME : DARK_THEME);
		await settle(300);
	}
	await write(theme);
	const deadline = Date.now() + 10_000;
	while (vscode.window.activeColorTheme.kind !== wanted) {
		if (Date.now() > deadline)
			throw new Error(
				`${theme} did not apply; workbench is still kind ${vscode.window.activeColorTheme.kind}`,
			);
		await settle(200);
	}
	await settle();
}

async function ps(format: string, pid: number): Promise<string> {
	const { stdout } = await run("ps", ["-o", format, "-p", String(pid)]);
	return stdout.trim();
}

/**
 * The pid of the Electron main process of the window this test runs in.
 *
 * Walks up from the extension host rather than matching on the app name: a
 * developer's own VS Code is running too, and only the ancestor chain tells the
 * two apart. The main process is the first ancestor started without `--type=`,
 * which every helper (renderer, GPU, utility) carries.
 */
async function windowPid(): Promise<number> {
	let pid = process.pid;
	for (let hop = 0; hop < 8; hop++) {
		const parent = Number.parseInt(await ps("ppid=", pid), 10);
		if (!Number.isInteger(parent) || parent <= 1) break;
		const command = await ps("command=", parent);
		if (!command.includes("--type=")) return parent;
		pid = parent;
	}
	throw new Error(
		"could not find the Electron main process of the test window",
	);
}

async function osascript(script: string): Promise<string> {
	const { stdout } = await run("osascript", ["-e", script]);
	return stdout.trim();
}

function windowScript(pid: number, body: string): string {
	return `tell application "System Events" to tell (first process whose unix id is ${pid})
	set frontmost to true
	${body}
end tell`;
}

let preparedPid: number | undefined;

/**
 * Sizes the test window to {@link WINDOW_SIZE} and returns the main process pid.
 * Resolved once per run; the window keeps that size for every shot.
 */
export async function prepareWindow(): Promise<number> {
	if (preparedPid !== undefined) return preparedPid;
	const pid = await windowPid();
	await osascript(
		windowScript(
			pid,
			`set position of window 1 to {${WINDOW_ORIGIN.x}, ${WINDOW_ORIGIN.y}}
	set size of window 1 to {${WINDOW_SIZE.width}, ${WINDOW_SIZE.height}}`,
		),
	);
	await settle();
	preparedPid = pid;
	return pid;
}

/** `{x, y, width, height}` of the test window, in screen points. */
async function windowBounds(
	pid: number,
): Promise<{ x: number; y: number; width: number; height: number }> {
	const raw = await osascript(
		windowScript(pid, "get {position, size} of window 1"),
	);
	const [x, y, width, height] = raw
		.split(",")
		.map((n) => Number.parseInt(n, 10));
	if ([x, y, width, height].some((n) => !Number.isFinite(n)))
		throw new Error(`unexpected window bounds from osascript: ${raw}`);
	return { x, y, width, height };
}

/**
 * Captures the test window into `media/screenshots/<name>.png`.
 *
 * macOS only — `screencapture` has no portable equivalent, so elsewhere this
 * logs and returns, leaving the suite green.
 */
export async function capture(name: string): Promise<void> {
	if (process.platform !== "darwin") {
		console.log(
			`[screenshots] skipping ${name}: ${process.platform} is not macOS`,
		);
		return;
	}
	const pid = await prepareWindow();
	// Raise the window again: a quick pick or a theme swap can drop it behind.
	await osascript(windowScript(pid, "return"));
	// A theme swap or extension activation can pop a toast (e.g. "extensions
	// temporarily disabled"); clear it so it never lands in the shot.
	await vscode.commands.executeCommand("notifications.clearAll");
	await settle(300);
	const { x, y, width, height } = await windowBounds(pid);
	// What was really captured, so a wrong window or theme shows up in the log.
	console.log(
		`[screenshots] ${name}: pid ${pid} at ${x},${y} ${width}x${height}, theme kind ${vscode.window.activeColorTheme.kind}`,
	);
	await fs.mkdir(OUT_DIR, { recursive: true });
	const file = path.join(OUT_DIR, `${name}.png`);
	await run("screencapture", [
		"-x",
		"-R",
		`${x},${y},${width},${height}`,
		file,
	]);
	console.log(`[screenshots] wrote ${file}`);
}
