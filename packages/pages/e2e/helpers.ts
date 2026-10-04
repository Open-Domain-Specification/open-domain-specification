import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Locator, type Page } from "@playwright/test";
import { modelRefToHash } from "../src/lib/ref-transport";

/**
 * Everything a page can tell us went wrong: console errors, uncaught page
 * errors, requests that never landed, and responses that came back non-2xx.
 * `file://` responses are left out -- they have no meaningful status.
 */
export function watchForProblems(page: Page): string[] {
	const problems: string[] = [];
	page.on("console", (m) => {
		if (m.type() === "error") problems.push(m.text());
	});
	page.on("pageerror", (e) => problems.push(e.message));
	page.on("requestfailed", (r) => problems.push(`failed ${r.url()}`));
	page.on("response", (r) => {
		if (r.url().startsWith("http") && !r.ok())
			problems.push(`${r.status()} ${r.url()}`);
	});
	return problems;
}

/**
 * How a block of text actually wrapped, measured in the browser: the number of
 * line boxes its content occupies (fragments that share a line counted once),
 * the total width of ink on them, the width it had to wrap into and its own
 * line height.
 *
 * Assertions about prose belong in these terms rather than in pixels. A line
 * count and a line height are the same statement on every machine, while the
 * height a sentence takes is whatever the runner's fonts make it: the same
 * table row is three lines on a developer's macOS and four on CI's Linux, and
 * neither is a defect. `ink / width` rounded up is the fewest lines the text
 * could occupy at that width, so comparing the count against it says the text
 * filled the width it had instead of breaking early -- which is what "reads as
 * prose, not a word a line" means once the fonts are out of it.
 */
export async function wrapOf(locator: Locator): Promise<{
	lines: number;
	ink: number;
	width: number;
	lineHeight: number;
}> {
	return locator.evaluate((el) => {
		const range = document.createRange();
		range.selectNodeContents(el);
		const rects = [...range.getClientRects()]
			.filter((r) => r.width > 0)
			.sort((a, b) => a.top - b.top);
		// A line is a band: an icon, a link and a word sit at different tops and
		// heights on the one line, so a fragment opens a new line only once it
		// starts below everything on the line before it.
		let bottom = Number.NEGATIVE_INFINITY;
		let lines = 0;
		for (const rect of rects) {
			if (rect.top >= bottom) lines += 1;
			bottom = Math.max(bottom, rect.bottom);
		}
		return {
			lines,
			ink: rects.reduce((total, r) => total + r.width, 0),
			width: el.getBoundingClientRect().width,
			lineHeight: Number.parseFloat(getComputedStyle(el).lineHeight),
		};
	});
}

/**
 * A table row that reads as prose and stays short, asserted in lines rather
 * than in pixels so it says the same thing on every machine's fonts.
 *
 * Two claims. The description fills the width it has instead of breaking
 * early: at most one line more than `ink / width` needs, which is the line a
 * word boundary can cost. And the row is those lines and nothing more, so
 * nothing else in it is taller than the prose. Together with the column's own
 * prose floor they are what "the description reads as prose, not a word a
 * line, and the row stays short" comes to.
 */
export async function expectProseRow(description: Locator): Promise<void> {
	const prose = await wrapOf(description);
	expect(prose.lines).toBeLessThanOrEqual(
		Math.ceil(prose.ink / prose.width) + 1,
	);
	const row = await description.evaluate(
		(el) => el.closest("tr")?.getBoundingClientRect().height ?? 0,
	);
	expect(row).toBeLessThanOrEqual(prose.lines * prose.lineHeight + 1);
}

/**
 * The grow column of the first row of a `DataTable`, measured in the browser:
 * its rendered width, its computed `min-width` (the prose floor, 24ch, which
 * is about 197px in the 13px body font and a different width in any other),
 * and by how much the table's frame overflows sideways. Asserting against the
 * computed floor keeps the tests true on every machine's fonts.
 */
export async function growColumn(table: Locator): Promise<{
	width: number;
	floor: number;
	overflow: number;
}> {
	const cell = table.locator("tbody tr:not(.group, .detail) td.grow").first();
	await cell.scrollIntoViewIfNeeded();
	return cell.evaluate((el) => {
		const frame = el.closest(".frame") as HTMLElement;
		return {
			width: el.getBoundingClientRect().width,
			floor: Number.parseFloat(getComputedStyle(el).minWidth),
			overflow: frame.scrollWidth - frame.clientWidth,
		};
	});
}

/**
 * The design's rule for a table's frame: it scrolls sideways only when the
 * prose cannot have its floor. So the prose never falls under the floor, a
 * frame that scrolls has its prose at the floor (the scroll is the escape
 * hatch), and a frame whose prose is above the floor does not scroll.
 */
export async function expectScrollOnlyAtTheFloor(
	table: Locator,
): Promise<{ atFloor: boolean; overflow: number }> {
	const { width, floor, overflow } = await growColumn(table);
	expect(floor).toBeGreaterThan(0);
	expect(width).toBeGreaterThanOrEqual(floor - 1);
	const atFloor = width - floor <= 1;
	if (overflow > 0) expect(atFloor).toBe(true);
	if (!atFloor) expect(overflow).toBe(0);
	return { atFloor, overflow };
}

/**
 * The page has one direction of travel. A frame inside it may scroll sideways
 * -- that is the design's escape hatch when a table's columns cannot fit --
 * but the document itself never does, on any machine's fonts.
 */
export async function expectNoSidewaysScroll(page: Page): Promise<void> {
	expect(
		await page.evaluate(
			() =>
				document.documentElement.scrollWidth -
				document.documentElement.clientWidth,
		),
	).toBe(0);
}

/** Shared fixtures: the example workspace, served to the viewer over an intercepted URL. */

export const PETSTORE_PATH = join(
	__dirname,
	"../../../models/petstore/.ods/petstore.json",
);
export const PETSTORE_JSON = readFileSync(PETSTORE_PATH, "utf8");
export const PETSTORE_SCHEMA = JSON.parse(PETSTORE_JSON);

/** Any absolute URL works: Playwright fulfils it from disk, so no server is needed. */
export const PETSTORE_URL = "https://workspaces.test/.ods/petstore.json";
export const WORKSPACE_NAME = "Swagger Petstore (v3)";
export const ORDER_REF = "#/boundedcontexts/sales_bc/aggregates/order";
export const EXPORT_ORIGIN = "http://localhost:4174";

/** The petstore's generated docsify site, served as a plain folder of files. */
export const DOCSIFY_DIR = join(__dirname, "../../../models/petstore/docs");
export const DOCSIFY_ORIGIN = "http://localhost:4175";

/** A canonical model ref as a URL hash; empty means no requested route. */
export const modelHash = (ref: string) => (ref ? modelRefToHash(ref) : "");

export const viewerAt = (hash = "") =>
	`/?url=${encodeURIComponent(PETSTORE_URL)}${hash ? modelHash(hash) : ""}`;

/** Fulfils every request for the example workspace from the repository file. */
export async function servePetstore(page: Page): Promise<void> {
	await page.route("**/petstore.json", (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body: PETSTORE_JSON,
		}),
	);
}

/**
 * Every workspace the repository ships. The bigger three are the stress
 * cases: a fit that holds on the petstore can still put a node under a panel
 * on a map with five times the contexts.
 */
export const REFERENCE_MODELS = [
	"petstore",
	"rivermart",
	"streamline",
	"northbank",
] as const;

export type ReferenceModel = (typeof REFERENCE_MODELS)[number];

const modelPath = (name: ReferenceModel) =>
	join(__dirname, `../../../models/${name}/.ods/${name}.json`);

/** Fulfils every request for that model's workspace from the repository file. */
export async function serveModel(
	page: Page,
	name: ReferenceModel,
): Promise<string> {
	const body = readFileSync(modelPath(name), "utf8");
	await page.route(`**/${name}.json`, (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body,
		}),
	);
	return `https://workspaces.test/.ods/${name}.json`;
}

/**
 * Serves the petstore, navigates to `ref` and scrolls to the diagram whose
 * caption contains `title`, returning its `.svelte-flow` locator.
 */
export async function openInteractiveDiagram(
	page: Page,
	title: string,
	ref = "",
): Promise<Locator> {
	await servePetstore(page);
	await page.goto(viewerAt(ref));
	const figure = page.locator("figure.diagram", { hasText: title });
	await figure.scrollIntoViewIfNeeded();
	return figure.locator(".svelte-flow");
}

/**
 * What a story root actually painted, in terms that an empty canvas cannot
 * satisfy: the words a reader can read, the SVG shapes with real extent, and
 * the flow nodes on the canvas.
 *
 * Two things a blank story still carries are deliberately not counted. The
 * diagram library stamps its own attribution into every flow, so that text is
 * left out. And an SVG element on its own proves nothing (a backdrop whose
 * paths all have an empty `d` is still an `<svg>`), so a shape counts only
 * when the browser measures it as non-empty: a `getBBox` with width or height.
 */
export type Painted = { text: number; shapes: number; nodes: number };

export async function paintedIn(root: Locator): Promise<Painted> {
	return root.evaluate((el) => {
		let text = (el as HTMLElement).innerText ?? "";
		for (const a of el.querySelectorAll<HTMLElement>(
			".svelte-flow__attribution",
		))
			text = text.replace(a.innerText, "");
		const shapes = Array.from(
			el.querySelectorAll<SVGGraphicsElement>(
				"path, rect, circle, ellipse, line, polyline, polygon",
			),
		).filter((s) => {
			// Definitions (clip paths, markers) are not painted where they sit.
			if (s.closest("defs, clipPath, marker, mask, pattern")) return false;
			if (s.tagName === "path" && !s.getAttribute("d")?.trim()) return false;
			try {
				const box = s.getBBox();
				return box.width > 0 || box.height > 0;
			} catch {
				return false;
			}
		}).length;
		return {
			text: text.trim().length,
			shapes,
			nodes: el.querySelectorAll(".svelte-flow__node").length,
		};
	});
}

/** The single number a story must be above zero on to count as painted. */
export function meaningful(p: Painted): number {
	return p.text + p.shapes + p.nodes;
}
