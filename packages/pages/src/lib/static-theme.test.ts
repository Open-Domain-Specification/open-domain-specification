import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { iconColor, type Kind } from "./atoms/kinds";
import { ICONS } from "./icons";

/**
 * The static export and the viewer do not run inside VS Code, so nothing
 * supplies the `--vscode-*` variables the components read; `assets/site.css`
 * is the theme that stands in for the editor's. A token a component reads and
 * that file lacks resolves to nothing there (a hover with no wash, a focus
 * ring with no colour), which is invisible in the extension and only shows
 * on the other surfaces. This suite is the check that keeps the two in step.
 */

const ROOT = join(__dirname, "../..");
const TOKEN = /var\(\s*(--vscode-[A-Za-z0-9-]+)/g;

const sourceFiles = (dir: string): string[] =>
	readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return sourceFiles(path);
		const isSource = /\.(svelte|ts)$/.test(name);
		const isTestingAid = /\.(test|stories|harness)\.(ts|svelte)$/.test(name);
		return isSource && !isTestingAid && name !== "fixtures.ts" ? [path] : [];
	});

// A trailing hyphen is the run-time composed symbol icon token, handled per kind below.
const tokensIn = (text: string) =>
	[...text.matchAll(TOKEN)].map((m) => m[1]).filter((t) => !t.endsWith("-"));

/** Every token a component or the page stylesheet reads, with the first file that reads it. */
const readTokens = (): Map<string, string> => {
	const read = new Map<string, string>();
	const files = [
		...sourceFiles(join(ROOT, "src")),
		join(ROOT, "assets/page.css"),
	];
	for (const file of files)
		for (const token of tokensIn(readFileSync(file, "utf8")))
			if (!read.has(token)) read.set(token, file.replace(`${ROOT}/`, ""));
	// The symbol icon token is composed at run time, one per kind.
	for (const kind of Object.keys(ICONS) as Kind[])
		for (const token of tokensIn(iconColor(kind)))
			if (!read.has(token)) read.set(token, "src/lib/atoms/kinds.ts");
	return read;
};

const declared = (css: string) =>
	new Set(
		[...css.matchAll(/^\s*(--vscode-[A-Za-z0-9-]+)\s*:/gm)].map((m) => m[1]),
	);

const site = readFileSync(join(ROOT, "assets/site.css"), "utf8");
const darkStart = site.indexOf("@media (prefers-color-scheme: dark)");
const light = declared(site.slice(0, darkStart));
const dark = declared(site.slice(darkStart));
/** The same in every theme, so the dark block need not repeat them. */
const THEME_INDEPENDENT = new Set([
	"--vscode-font-family",
	"--vscode-font-size",
	"--vscode-editor-font-family",
]);

describe("the static theme (assets/site.css)", () => {
	it("has a light and a dark block", () => {
		expect(darkStart).toBeGreaterThan(0);
		expect(light.size).toBeGreaterThan(0);
		expect(dark.size).toBeGreaterThan(0);
	});

	it("defines every --vscode-* token a component or page.css reads, in light", () => {
		const missing = [...readTokens()]
			.filter(([token]) => !light.has(token))
			.map(([token, file]) => `${token} (read in ${file})`);
		expect(missing).toEqual([]);
	});

	it("defines every one of them again in dark, apart from the ones no theme changes", () => {
		const missing = [...readTokens().keys()].filter(
			(token) => !THEME_INDEPENDENT.has(token) && !dark.has(token),
		);
		expect(missing).toEqual([]);
	});

	it("carries no dark override for a token light does not define", () => {
		expect([...dark].filter((token) => !light.has(token))).toEqual([]);
	});
});
