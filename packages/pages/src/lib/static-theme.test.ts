import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	AA_TEXT,
	BLACK,
	backdrop,
	contrast,
	hex,
	mix,
	over,
	parseColor,
	type Rgba,
	WHITE,
} from "../../e2e/contrast";
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

/**
 * Contrast of the text roles that sit on the static theme's colours. Reading
 * the stylesheets (not a rendered page) is what lets this run in the unit
 * suite; `e2e/contrast.spec.ts` is the same claim measured on a real page. The
 * pairs are computed from the tokens and mix percentages as written, so a
 * token or a percentage that moves a role under 4.5:1 fails here by name.
 */
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const pageCss = read("assets/page.css");

const values = (css: string) =>
	new Map(
		[...css.matchAll(/^\s*(--vscode-[A-Za-z0-9-]+)\s*:\s*([^;]+);/gm)].map(
			(m) => [m[1], m[2].trim()] as const,
		),
	);

/** The body of the first rule whose selector is exactly `selector`. */
const ruleBody = (css: string, selector: string): string => {
	const open = css.indexOf(`${selector} {`);
	if (open < 0) throw new Error(`no rule for ${selector}`);
	const start = css.indexOf("{", open) + 1;
	return css.slice(start, css.indexOf("}", start));
};

const percent = (text: string, pattern: RegExp): number => {
	const found = pattern.exec(text);
	if (!found) throw new Error(`no match for ${pattern}`);
	return Number(found[1]);
};

const themes = [
	{ name: "light", tokens: values(site.slice(0, darkStart)), black: true },
	{ name: "dark", tokens: values(site.slice(darkStart)), black: false },
];

describe("text contrast on the static theme", () => {
	// Without the role, warning text is the warning colour itself (100%), and
	// the pairs below fail on its real ratio rather than on a missing token.
	const warnShare = Number(
		/--warn-text:\s*color-mix\(in srgb,\s*var\(--warn\)\s+(\d+)%,\s*var\(--fg\)\)/.exec(
			pageCss,
		)?.[1] ?? 100,
	);
	const context = read("src/lib/flow/ContextNode.svelte");
	const relation = read("src/lib/flow/RelationNode.svelte");

	for (const { name, tokens, black } of themes) {
		const tok = (token: string): Rgba => {
			const value = tokens.get(token);
			if (!value) throw new Error(`${token} missing from the ${name} theme`);
			return hex(value);
		};
		const page = tok("--vscode-editor-background");
		const card = tok("--vscode-editorWidget-background");
		const hover = tok("--vscode-list-hoverBackground");
		const fg = tok("--vscode-foreground");
		const muted = tok("--vscode-descriptionForeground");
		const warnText = mix(
			tok("--vscode-editorWarning-foreground"),
			warnShare,
			fg,
		);

		it(`reads warning text at 4.5:1 on the page, a card and the row hover wash in ${name}`, () => {
			for (const [surface, bg] of [
				["page", page],
				["card", card],
				["hover wash", hover],
			] as const)
				expect(
					contrast(warnText, bg),
					`warn text on ${surface}`,
				).toBeGreaterThanOrEqual(AA_TEXT);
		});

		it(`reads secondary text at 4.5:1 on the page, a card and the row hover wash in ${name}`, () => {
			for (const [surface, bg] of [
				["page", page],
				["card", card],
				["hover wash", hover],
			] as const)
				expect(
					contrast(muted, bg),
					`muted on ${surface}`,
				).toBeGreaterThanOrEqual(AA_TEXT);
		});

		it(`reads node text at 4.5:1 on the tinted node fills in ${name}`, () => {
			const mud = mix(
				hex("#d7ccc8"),
				percent(context, /#d7ccc8\s+(\d+)%/),
				card,
			);
			const external = mix(
				muted,
				percent(
					ruleBody(context, ".context-node.external"),
					/var\(--muted\)\s+(\d+)%/,
				),
				card,
			);
			const boundary = mix(
				muted,
				percent(
					ruleBody(context, ".context-node.boundary-only"),
					/var\(--muted\)\s+(\d+)%/,
				),
				card,
			);
			const core = mix(
				tok("--vscode-charts-purple"),
				percent(relation, /var\(--core\)\s+(\d+)%/),
				card,
			);
			for (const [fill, bg] of [
				["mud", mud],
				["external", external],
				["boundary-only", boundary],
				["relation tint", core],
			] as const) {
				expect(contrast(muted, bg), `muted on ${fill}`).toBeGreaterThanOrEqual(
					AA_TEXT,
				);
				expect(contrast(fg, bg), `fg on ${fill}`).toBeGreaterThanOrEqual(
					AA_TEXT,
				);
			}
		});

		it(`keeps the diagram panels' muted text at 4.5:1 over the worst backdrop in ${name}`, () => {
			// A panel can be dragged over any map content, so the bound is the
			// extreme backdrop for the theme: black under a light panel, white
			// under a dark one, not where the panel happens to load.
			const worst = black ? BLACK : WHITE;
			for (const file of [
				"src/lib/flow/LegendPanel.svelte",
				"src/lib/flow/DiagramOptionsPanel.svelte",
			]) {
				const css = read(file);
				const rule = ruleBody(
					css,
					file.includes("Legend")
						? ":global(.diagram-legend)"
						: ":global(.diagram-options)",
				);
				const share = percent(
					rule,
					/background:\s*color-mix\(in srgb,\s*var\(--card\)\s+(\d+)%,\s*transparent\)/,
				);
				const panel = over({ ...card, a: share / 100 }, worst);
				expect(contrast(muted, panel), `${file} muted`).toBeGreaterThanOrEqual(
					AA_TEXT,
				);
				expect(contrast(fg, panel), `${file} fg`).toBeGreaterThanOrEqual(
					AA_TEXT,
				);
			}
		});
	}
});

describe("where the text colour roles are written", () => {
	it("draws warning text, never a warning marker, in the shared warn-text role", () => {
		expect(ruleBody(read("src/lib/atoms/Keyword.svelte"), ".warn")).toMatch(
			/color:\s*var\(--warn-text\b/,
		);
		expect(
			ruleBody(read("src/lib/atoms/Disposition.svelte"), ".refactor"),
		).toMatch(/color:\s*var\(--warn-text\b/);
		const badge = ruleBody(
			pageCss,
			".svelte-flow .svelte-flow__edge-label.port.refactor",
		);
		expect(badge).toMatch(/color:\s*var\(--warn-text\)/);
		expect(badge).toMatch(/border-color:\s*var\(--warn\)/);
	});

	it("keeps the panels' text at full strength by fading only their background", () => {
		for (const [file, selector] of [
			["src/lib/flow/LegendPanel.svelte", ":global(.diagram-legend)"],
			["src/lib/flow/DiagramOptionsPanel.svelte", ":global(.diagram-options)"],
		] as const) {
			const css = read(file);
			expect(ruleBody(css, selector)).not.toMatch(/\bopacity\s*:/);
			expect(css).not.toMatch(
				/\.diagram-(legend|options):hover\)\s*\{[^}]*opacity/,
			);
		}
	});

	it("labels clusters in the foreground colour, which stays readable through the stacked shading", () => {
		expect(
			ruleBody(read("src/lib/flow/ClusterNode.svelte"), ".cluster-label"),
		).toMatch(/color:\s*var\(--fg\)/);
	});

	it("names the import examples in the foreground colour and keeps the model's tint on the card edge", () => {
		const css = read("src/app/ImportScreen.svelte");
		expect(ruleBody(css, ".example .card-head")).toMatch(
			/color:\s*var\(--fg\)/,
		);
		expect(ruleBody(css, ".example")).toMatch(/border-left:[^;]*var\(--tint\)/);
	});
});

describe("the shared contrast maths", () => {
	it("reads the colour forms a browser reports", () => {
		expect(parseColor("rgb(59, 59, 59)")).toEqual({
			r: 59,
			g: 59,
			b: 59,
			a: 1,
		});
		expect(parseColor("rgba(128, 128, 128, 0.14)").a).toBeCloseTo(0.14);
		expect(parseColor("color(srgb 0.5 0.25 1 / 0.5)")).toEqual({
			r: 127.5,
			g: 63.75,
			b: 255,
			a: 0.5,
		});
	});

	it("matches the WCAG reference values", () => {
		expect(contrast(BLACK, WHITE)).toBeCloseTo(21, 5);
		expect(contrast(hex("#767676"), WHITE)).toBeCloseTo(4.54, 2);
	});

	it("stacks translucent layers and folds opacity into them", () => {
		const under = backdrop(
			[
				{ bg: "rgb(255, 255, 255)", opacity: 1 },
				{ bg: "rgba(0, 0, 0, 0.5)", opacity: 0.5 },
			],
			BLACK,
		);
		expect(under.r).toBeCloseTo(191.25);
	});

	it("refuses a backdrop that never turns opaque", () => {
		expect(() => backdrop([{ bg: "rgba(0, 0, 0, 0)", opacity: 1 }])).toThrow();
	});
});
