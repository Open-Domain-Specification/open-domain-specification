import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { Workspace } from "@open-domain-specification/core";
import { expect, type Locator, type Page, test } from "@playwright/test";
import {
	EXPORT_ORIGIN,
	expectNoSidewaysScroll,
	expectProseRow,
	expectScrollOnlyAtTheFloor,
	growColumn,
	modelHash,
	PETSTORE_JSON,
	type ReferenceModel,
	serveModel,
	WORKSPACE_NAME,
	wrapOf,
} from "./helpers";

/**
 * Milestone 4, epic #105: the tables a reader meets on every page read as
 * prose and keep their types whole.
 *
 * - #87 a glossary gives its width to Definition, not to Embodied by.
 * - #88 a type is never broken inside a token: `date-time`, `ISO 4217 code`
 *   and each alternative of a union stay on one line, and the authored text is
 *   exactly what the page says.
 * - #80 the empty icon column of an attribute table is named Kind by native
 *   visually hidden text inside the header (not an aria-label on an empty
 *   header, which axe's empty-table-header rejects), and stays a visually
 *   empty 16px column.
 * - an attribute name is never broken, and a description yields to a type
 *   union before the union wraps (a legal merchant fixture proves both).
 * - at the 396px a VS Code webview gets from a 700px window, no page scrolls
 *   the document sideways and nothing is clipped to hide it.
 *
 * Every measurement is a line count or a comparison with the column's own
 * computed floor, never a pixel height, so it says the same on every
 * machine's fonts.
 */

const EXPORT = process.env.ODS_E2E_EXPORT_ORIGIN ?? EXPORT_ORIGIN;
/** A laptop browser with the site tree beside the page: the acceptance size. */
const WIDE = { width: 1300, height: 900 };
/** Narrow enough that a table must stack its tokens and may scroll its frame. */
const NARROW = { width: 700, height: 900 };

/** An attribute table, by what it says and not by what it was changed to say. */
const ATTRIBUTE_TABLE =
	"table.data:has(th:text-is('Attribute')):has(th:text-is('Type'))";
const TAGGED = "[data-e2e-attributes]";
const INVISIBLE = /[​‌⁠﻿]/;

type Host = "viewer" | "export";
type Route = { key: string; model: ReferenceModel; ref: string };

const NB_CKYC = "#/boundedcontexts/customer_&_kyc";
const PS_SALES = "#/boundedcontexts/sales_bc";

/** Pages whose glossary is under test. */
const GLOSSARIES: (Route & { term: string })[] = [
	{ key: "nb-ckyc", model: "northbank", ref: NB_CKYC, term: "Customer" },
	{ key: "ps-sales", model: "petstore", ref: PS_SALES, term: "Order" },
];
/** Pages whose attribute tables are under test. */
const ATTRIBUTES: Route[] = [
	{
		key: "nb-iddoc",
		model: "northbank",
		ref: `${NB_CKYC}/aggregates/customer/entities/identity_document`,
	},
	{
		key: "nb-money",
		model: "northbank",
		ref: "#/boundedcontexts/ledger/valueobjects/money",
	},
	{
		key: "nb-custverified",
		model: "northbank",
		ref: `${NB_CKYC}/schemas/customer_verified`,
	},
	{
		key: "ps-shipdate",
		model: "petstore",
		ref: `${PS_SALES}/valueobjects/ship_date`,
	},
];

const modelJson = (model: ReferenceModel) =>
	JSON.parse(
		readFileSync(
			join(__dirname, `../../../models/${model}/.ods/${model}.json`),
			"utf8",
		),
	);

/** The authored object at a canonical ref, read from the model file itself. */
function authored(model: ReferenceModel, ref: string) {
	let node = modelJson(model);
	for (const segment of ref.replace(/^#\//, "").split("/"))
		node = node[segment];
	return node as {
		name: string;
		attributes: Record<string, { name: string; type: string }>;
	};
}

/**
 * Opens a route on the viewer (the model served over an intercepted URL) or on
 * the static export (petstore only, the one workspace `e2e/.export` holds),
 * and waits for the intended page: the heading is asserted before anything is
 * measured, so a fallback page can never satisfy a table check.
 */
async function open(
	page: Page,
	host: Host,
	model: ReferenceModel,
	ref: string,
	heading: string,
): Promise<void> {
	if (host === "export") {
		await page.goto("/");
		await page.getByRole("link", { name: WORKSPACE_NAME }).click();
		await page.evaluate((hash) => {
			location.hash = hash;
		}, modelHash(ref));
	} else {
		const url = await serveModel(page, model);
		await page.goto(`/?url=${encodeURIComponent(url)}${modelHash(ref)}`);
	}
	await expect(page.locator("main h1")).toContainText(heading);
}

async function expectTreeBesideThePage(page: Page, size: typeof WIDE) {
	if (size.width === WIDE.width)
		await expect(page.locator("nav.tree").first()).toBeVisible();
}

async function glossaryChecks(
	page: Page,
	route: Route & { term: string },
	size: typeof WIDE,
) {
	const table = page.locator("#language table.data").first();
	await table.scrollIntoViewIfNeeded();
	const headers = table.locator("thead th");
	await expect(headers).toHaveText([
		"Term",
		"Definition",
		"Also",
		"Embodied by",
	]);

	// #87: Definition is the one growing column, in the header and in each row.
	expect(
		await headers.evaluateAll((ths) =>
			ths.map((th) => th.classList.contains("grow")),
		),
	).toEqual([false, true, false, false]);
	const rows = table.locator("tbody tr:not(.group, .detail)");
	const count = await rows.count();
	expect(count).toBeGreaterThan(0);
	for (let i = 0; i < count; i += 1) {
		const cells = rows.nth(i).locator("td");
		expect(
			await cells.evaluateAll((tds) =>
				tds.map((td) => td.classList.contains("grow")),
			),
		).toEqual([false, true, false, false]);
		// Embodied by is a lockup: whole, one line, at every width.
		expect((await wrapOf(cells.nth(3))).lines).toBe(1);
	}

	const { width, floor } = await growColumn(table);
	expect(floor).toBeGreaterThan(0);
	expect(width).toBeGreaterThanOrEqual(floor - 1);
	await expectScrollOnlyAtTheFloor(table);
	await expectNoSidewaysScroll(page);

	if (size.width === WIDE.width) {
		// The cited sentence takes at most two lines beside the tree, and every
		// definition fills the width it has.
		const definition = rows
			.filter({ hasText: route.term })
			.first()
			.locator("td")
			.nth(1);
		expect((await wrapOf(definition)).lines).toBeLessThanOrEqual(2);
		for (let i = 0; i < count; i += 1)
			await expectProseRow(rows.nth(i).locator("td").nth(1));
	}
}

async function attributeChecks(page: Page, route: Route, size: typeof WIDE) {
	// The page names an attribute by its own name, not by its key in the file.
	const expected = Object.fromEntries(
		Object.values(authored(route.model, route.ref).attributes).map((a) => [
			a.name,
			a,
		]),
	);
	const tables = page.locator(ATTRIBUTE_TABLE);
	const tableCount = await tables.count();
	expect(tableCount).toBeGreaterThan(0);
	await tables.evaluateAll((els) => {
		for (const el of els) el.setAttribute("data-e2e-attributes", "");
	});

	const seen = new Map<string, string>();
	let sawType = false;
	for (let t = 0; t < tableCount; t += 1) {
		const table = tables.nth(t);
		await table.scrollIntoViewIfNeeded();

		// #80: the first header is named Kind (the geometry is measured in
		// `kindChecks`; here the role name alone).
		await expect(table.getByRole("columnheader", { name: "Kind" })).toHaveCount(
			1,
		);

		const floorState = await expectScrollOnlyAtTheFloor(table);
		const rows = table.locator("tbody tr:not(.group, .detail)");
		const rowCount = await rows.count();
		for (let r = 0; r < rowCount; r += 1) {
			const row = rows.nth(r);
			const name = (await row.locator("td").nth(1).textContent())?.trim() ?? "";
			const code = row.locator("td").nth(2).locator("code.type").first();
			await expect(code).toHaveCount(1);
			const text = (await code.textContent()) ?? "";
			seen.set(name, text);
			sawType = true;
			expect(text).not.toMatch(INVISIBLE);

			// #88: whole tokens, whole alternatives.
			const alternatives = code.locator(".alternative");
			const parts = await alternatives.count();
			for (let a = 0; a < parts; a += 1)
				expect((await wrapOf(alternatives.nth(a))).lines).toBe(1);
			if (text === "date-time" || text === "ISO 4217 code") {
				expect((await wrapOf(code)).lines).toBe(1);
				expect(parts).toBe(1);
			}
			// With room to spare beside the tree, a type is one line.
			if (size.width === WIDE.width && !floorState.atFloor)
				expect((await wrapOf(code)).lines).toBe(1);
		}
	}
	expect(sawType).toBe(true);
	// Exactly the authored text, attribute for attribute.
	expect([...seen.keys()].sort()).toEqual(Object.keys(expected).sort());
	for (const [name, attribute] of Object.entries(expected))
		expect(seen.get(name), name).toBe(attribute.type);

	// #80: axe finds no empty table header in an attribute table.
	const axe = await new AxeBuilder({ page })
		.include(TAGGED)
		.withRules(["empty-table-header"])
		.analyze();
	expect(axe.violations).toEqual([]);
	await expectNoSidewaysScroll(page);
}

const schemes = ["light", "dark"] as const;
const sizes = [
	["1300x900 with the tree", WIDE],
	["700x900", NARROW],
] as const;

for (const colorScheme of schemes) {
	for (const [sizeName, size] of sizes) {
		for (const host of ["viewer", "export"] as const) {
			const origin = (baseURL: string | undefined) =>
				host === "export" ? EXPORT : baseURL;
			for (const route of GLOSSARIES) {
				if (host === "export" && route.model !== "petstore") continue;
				test(`${host} ${colorScheme} ${sizeName}: the ${route.key} glossary gives its width to Definition`, async ({
					browser,
					baseURL,
				}) => {
					const context = await browser.newContext({
						colorScheme,
						viewport: size,
						baseURL: origin(baseURL),
					});
					const page = await context.newPage();
					await open(
						page,
						host,
						route.model,
						route.ref,
						authored(route.model, route.ref).name,
					);
					await expectTreeBesideThePage(page, size);
					await glossaryChecks(page, route, size);
					await context.close();
				});
			}
			for (const route of ATTRIBUTES) {
				if (host === "export" && route.model !== "petstore") continue;
				test(`${host} ${colorScheme} ${sizeName}: the ${route.key} attribute table keeps its types whole and names its icon column`, async ({
					browser,
					baseURL,
				}) => {
					const context = await browser.newContext({
						colorScheme,
						viewport: size,
						baseURL: origin(baseURL),
					});
					const page = await context.newPage();
					await open(
						page,
						host,
						route.model,
						route.ref,
						authored(route.model, route.ref).name,
					);
					await expectTreeBesideThePage(page, size);
					await attributeChecks(page, route, size);
					await context.close();
				});
			}
		}
	}
}

/** The unions this epic is about, named once so a model edit cannot quietly drop them. */
test("the models still author the types this spec measures", () => {
	const types = (route: Route) =>
		Object.values(authored(route.model, route.ref).attributes).map(
			(a) => a.type,
		);
	expect(types(ATTRIBUTES[0])).toContain("'passport' | 'driving-licence'");
	expect(types(ATTRIBUTES[1])).toContain("ISO 4217 code");
	expect(types(ATTRIBUTES[2])).toContain("date-time");
	expect(types(ATTRIBUTES[3])).toContain("date-time");
});

/* -------------------------------------------------------------------------
 * #80 again, in the browser: the Kind header is named by native, visually
 * hidden text -- content axe and a screen reader can read -- and still draws
 * nothing in its 16px column. An aria-label on an empty header is the
 * proxy that axe's empty-table-header rejects, so it is no longer asserted.
 * ---------------------------------------------------------------------- */

type KindFacts = {
	ariaLabel: string | null;
	width: number;
	height: number;
	padX: number;
	styleWidth: string;
	hasText: boolean;
	hostIsHeader?: boolean;
	hiddenFromAT?: boolean;
	box?: { w: number; h: number };
	clip?: string;
	clipPath?: string;
	overflow?: string;
};

async function kindFacts(th: Locator): Promise<KindFacts> {
	return th.evaluate((el) => {
		const cs = getComputedStyle(el);
		const base = {
			ariaLabel: el.getAttribute("aria-label"),
			width: el.getBoundingClientRect().width,
			height: el.getBoundingClientRect().height,
			padX:
				Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight),
			styleWidth: (el as HTMLElement).style.width,
		};
		const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
		let found: Text | null = null;
		while (walker.nextNode()) {
			const text = walker.currentNode as Text;
			if (text.data.trim() === "Kind") found = text;
		}
		if (!found) return { ...base, hasText: false };
		const host = found.parentElement as HTMLElement;
		let hiddenFromAT = false;
		for (
			let e: Element | null = host;
			e;
			e = e === el ? null : e.parentElement
		) {
			const c = getComputedStyle(e);
			if (
				e.getAttribute("aria-hidden") === "true" ||
				e.hasAttribute("hidden") ||
				c.display === "none" ||
				c.visibility === "hidden"
			)
				hiddenFromAT = true;
		}
		const hc = getComputedStyle(host);
		const rect = host.getBoundingClientRect();
		return {
			...base,
			hasText: true,
			hostIsHeader: host === el,
			hiddenFromAT,
			box: { w: rect.width, h: rect.height },
			clip: hc.clip,
			clipPath: hc.clipPath,
			overflow: hc.overflow,
		};
	});
}

async function kindChecks(page: Page) {
	const tables = page.locator(ATTRIBUTE_TABLE);
	const tableCount = await tables.count();
	expect(tableCount).toBeGreaterThan(0);
	await tables.evaluateAll((els) => {
		for (const el of els) el.setAttribute("data-e2e-attributes", "");
	});
	for (let t = 0; t < tableCount; t += 1) {
		const table = tables.nth(t);
		await table.scrollIntoViewIfNeeded();
		const kind = table.getByRole("columnheader", { name: "Kind" });
		await expect(kind).toHaveCount(1);
		const f = await kindFacts(kind);
		// Native content, not a label on an empty header.
		expect
			.soft(f.hasText, "the Kind header holds the text node Kind")
			.toBe(true);
		expect.soft(f.ariaLabel, "no aria-label stands in for content").toBeNull();
		expect
			.soft(f.hiddenFromAT, "Kind is not hidden from the accessibility tree")
			.toBe(false);
		// Visually hidden: its own box is one pixel at most and clipped.
		expect
			.soft(f.hostIsHeader, "Kind sits in a hidden element of its own")
			.toBe(false);
		expect.soft(f.box?.w ?? 99, "hidden Kind box width").toBeLessThanOrEqual(1);
		expect
			.soft(f.box?.h ?? 99, "hidden Kind box height")
			.toBeLessThanOrEqual(1);
		expect
			.soft(
				f.overflow !== "visible" ||
					(f.clip && f.clip !== "auto") ||
					(f.clipPath && f.clipPath !== "none"),
				"hidden Kind is clipped",
			)
			.toBeTruthy();
		// Still the 16px icon column, one line high.
		expect.soft(f.styleWidth).toBe("16px");
		expect
			.soft(f.width, "the Kind column stays 16px plus padding")
			.toBeLessThanOrEqual(16 + f.padX + 1);
		expect
			.soft(f.height, "the Kind header stays one line")
			.toBeLessThanOrEqual(23);
	}
	const axe = await new AxeBuilder({ page })
		.include(TAGGED)
		.withRules(["empty-table-header"])
		.analyze();
	expect
		.soft(axe.violations.map((v) => `${v.id} x${v.nodes.length}`))
		.toEqual([]);
}

for (const colorScheme of schemes) {
	for (const [sizeName, size] of sizes) {
		for (const host of ["viewer", "export"] as const) {
			for (const route of [ATTRIBUTES[0], ATTRIBUTES[3]]) {
				if (host === "export" && route.model !== "petstore") continue;
				test(`${host} ${colorScheme} ${sizeName}: the ${route.key} Kind header is native visually hidden text, 16px wide, with no axe finding`, async ({
					browser,
					baseURL,
				}) => {
					const context = await browser.newContext({
						colorScheme,
						viewport: size,
						baseURL: host === "export" ? EXPORT : baseURL,
					});
					const page = await context.newPage();
					await open(
						page,
						host,
						route.model,
						route.ref,
						authored(route.model, route.ref).name,
					);
					await kindChecks(page);
					await context.close();
				});
			}
		}
	}
}

/* -------------------------------------------------------------------------
 * A legal model with a long attribute name and a three-way union. It is the
 * petstore with one extra attribute on PetRegistered, so it has the same
 * diagnostics as the petstore (none) and the same everything else.
 * ---------------------------------------------------------------------- */

const FIXTURE_URL = "https://workspaces.test/.ods/merchant_fixture.json";
const FIXTURE_REF = "#/boundedcontexts/catalog_bc/schemas/pet_registered";
const LONG_NAME = "merchant-category-name";
const UNION = "'retail' | 'online-marketplace' | 'wholesale-distributor'";

function merchantFixture() {
	const model = JSON.parse(PETSTORE_JSON);
	model.id = "merchant_fixture";
	model.name = "Merchant Fixture";
	model.boundedcontexts.catalog_bc.schemas.pet_registered.attributes.merchant_category_name =
		{
			name: LONG_NAME,
			type: UNION,
			description:
				"The merchant category the registering shop trades under; the display name is hyphenated on purpose while its id stays merchant_category_name.",
		};
	return model;
}

test("the merchant fixture is a legal model: it validates with no diagnostics", () => {
	const fixture = merchantFixture();
	expect(Workspace.fromSchema(fixture).validate()).toEqual([]);
	const attribute =
		fixture.boundedcontexts.catalog_bc.schemas.pet_registered.attributes
			.merchant_category_name;
	expect(attribute.name).toBe(LONG_NAME);
	expect(attribute.type).toBe(UNION);
});

async function openFixture(page: Page): Promise<void> {
	await page.route("**/merchant_fixture.json", (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body: JSON.stringify(merchantFixture()),
		}),
	);
	await page.goto(
		`/?url=${encodeURIComponent(FIXTURE_URL)}${modelHash(FIXTURE_REF)}`,
	);
	await expect(page.locator("main h1")).toContainText("PetRegistered");
}

/** The fixture's row, measured: name, type, and how Description stands to its floor. */
async function fixtureRow(page: Page) {
	const row = page.locator(`${ATTRIBUTE_TABLE} tbody tr`).filter({
		has: page.locator(`td:nth-child(2) code`, { hasText: LONG_NAME }),
	});
	await expect(row).toHaveCount(1);
	await row.scrollIntoViewIfNeeded();
	const name = row.locator("td").nth(1).locator("code");
	const type = row.locator("td").nth(2).locator("code.type");
	const description = row.locator("td").nth(3);
	const alternatives = type.locator(".alternative");
	const alternativeLines: number[] = [];
	for (let i = 0; i < (await alternatives.count()); i += 1)
		alternativeLines.push((await wrapOf(alternatives.nth(i))).lines);
	const grow = await description.evaluate((el) => {
		const frame = el.closest(".frame") as HTMLElement;
		const table = el.closest("table") as HTMLTableElement;
		const widths = [...table.querySelectorAll("thead th")].map(
			(th) => th.getBoundingClientRect().width,
		);
		const typeCell = el.previousElementSibling as HTMLElement;
		const cs = getComputedStyle(typeCell);
		const pad =
			Number.parseFloat(cs.paddingLeft) + Number.parseFloat(cs.paddingRight);
		const code = typeCell.querySelector("code.type") as HTMLElement;
		// The union's natural width: the width it takes on one line, which is
		// its max-content (a soft break such as `<wbr>` does not count), read
		// for the instant it takes to measure.
		const before = [code.style.display, code.style.width];
		code.style.display = "inline-block";
		code.style.width = "max-content";
		const natural = code.getBoundingClientRect().width;
		[code.style.display, code.style.width] = before;
		const floor = Number.parseFloat(getComputedStyle(el).minWidth);
		// What one line asks of the frame: the columns before the type, the
		// type on one line with its cell's padding, and the Description floor.
		const needed = widths[0] + widths[1] + natural + pad + floor;
		return {
			width: el.getBoundingClientRect().width,
			floor,
			frameOverflow: frame.scrollWidth - frame.clientWidth,
			frameWidth: frame.clientWidth,
			natural,
			needed,
			fits: needed <= frame.clientWidth + 0.5,
		};
	});
	const fonts = await name.evaluate((el) => {
		const probe = document.createElement("code");
		probe.style.fontFamily = "var(--vscode-editor-font-family)";
		document.body.append(probe);
		const editor = getComputedStyle(probe).fontFamily;
		probe.remove();
		return { name: getComputedStyle(el).fontFamily, editor };
	});
	return {
		nameText: await name.textContent(),
		nameLines: (await wrapOf(name)).lines,
		typeText: await type.textContent(),
		typeLines: (await wrapOf(type)).lines,
		alternativeLines,
		alternativeCount: alternativeLines.length,
		...grow,
		atFloor: grow.width - grow.floor <= 1,
		fonts,
	};
}

for (const colorScheme of schemes) {
	for (const [sizeName, size] of sizes) {
		test(`viewer ${colorScheme} ${sizeName}: the fixture's attribute name merchant-category-name stays on one line, exact, in the editor font`, async ({
			browser,
			baseURL,
		}) => {
			const context = await browser.newContext({
				colorScheme,
				viewport: size,
				baseURL,
			});
			const page = await context.newPage();
			await openFixture(page);
			const r = await fixtureRow(page);
			expect.soft(r.nameText).toBe(LONG_NAME);
			expect.soft(r.nameLines, "the name wraps onto this many lines").toBe(1);
			expect.soft(r.fonts.name).toBe(r.fonts.editor);
			await context.close();
		});

		test(`viewer ${colorScheme} ${sizeName}: the fixture's union wraps only with Description at its floor, and only between alternatives`, async ({
			browser,
			baseURL,
		}) => {
			const context = await browser.newContext({
				colorScheme,
				viewport: size,
				baseURL,
			});
			const page = await context.newPage();
			await openFixture(page);
			await expectTreeBesideThePage(page, size);
			const r = await fixtureRow(page);
			expect.soft(r.typeText).toBe(UNION);
			expect.soft(r.alternativeCount).toBe(3);
			// Only between complete alternatives: each is whole on its line.
			expect.soft(r.alternativeLines).toEqual([1, 1, 1]);
			expect.soft(r.width).toBeGreaterThanOrEqual(r.floor - 1);
			// Description yields first. The rule, not a line count: the union
			// stacks only when Description is at its floor ...
			const stacks = r.typeLines > 1;
			if (stacks)
				expect
					.soft(
						r.atFloor,
						`union wraps to ${r.typeLines} lines while Description is ${r.width}px against a floor of ${r.floor}px`,
					)
					.toBe(true);
			// ... and its converse: where one line, the other columns and the
			// Description floor fit the frame, the union is one line.
			if (r.fits)
				expect
					.soft(
						r.typeLines,
						`one line needs ${r.needed}px of a ${r.frameWidth}px frame, yet the union wraps to ${r.typeLines} lines at ${r.width}px Description (floor ${r.floor}px)`,
					)
					.toBe(1);
			else
				expect
					.soft(
						stacks,
						`one line needs ${r.needed}px of a ${r.frameWidth}px frame and cannot fit, yet the union is one line`,
					)
					.toBe(true);
			// Never an overflow of the frame, whichever way it went.
			expect.soft(r.frameOverflow, "frame overflow").toBe(0);
			await expectNoSidewaysScroll(page);
			await context.close();
		});
	}
}

/** Room enough that one line fits: the converse of the rule is exercised by measurement. */
test("viewer: with room for one line, the fixture's union is one line and Description keeps more than its floor", async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		viewport: { width: 1700, height: 900 },
		baseURL,
	});
	const page = await context.newPage();
	await openFixture(page);
	const r = await fixtureRow(page);
	expect(
		r.fits,
		`one line needs ${r.needed}px of a ${r.frameWidth}px frame`,
	).toBe(true);
	expect(r.typeLines, "the union is one line").toBe(1);
	expect(r.alternativeLines).toEqual([1, 1, 1]);
	expect(r.width).toBeGreaterThan(r.floor + 1);
	expect(r.frameOverflow).toBe(0);
	await expectNoSidewaysScroll(page);
	await context.close();
});

/* -------------------------------------------------------------------------
 * A VS Code window 700px wide gives its webview 396x808. The document never
 * scrolls sideways there and nothing is clipped to say it does not: names
 * and tokens stay whole, and a comma stays at the end of the item before it.
 * ---------------------------------------------------------------------- */

const WEBVIEW = { width: 396, height: 808 };
const NARROW_ROUTES: (Route & { heading: string; hosts: Host[] })[] = [
	{
		key: "nb-ckyc",
		model: "northbank",
		ref: NB_CKYC,
		heading: "Customer & KYC",
		hosts: ["viewer"],
	},
	{
		key: "ps-delivered",
		model: "petstore",
		ref: "#/boundedcontexts/fulfilment_bc/aggregates/shipment/provides/shipment_delivered",
		heading: "ShipmentDelivered",
		hosts: ["viewer", "export"],
	},
];

type NarrowFacts = {
	scrollWidth: number;
	clientWidth: number;
	outside: string[];
	clippers: string[];
	lockups: { text: string; sameLine: boolean; nameLines: number }[];
	serves: { text: string; lines: number }[];
	leadingCommas: string[];
};

async function narrowFacts(page: Page): Promise<NarrowFacts> {
	return page.evaluate(() => {
		const de = document.documentElement;
		const vw = de.clientWidth;
		const label = (e: Element) =>
			`${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? `.${e.className.trim().split(/\s+/).join(".")}` : ""}`;
		const bands = (e: Element) => {
			const range = document.createRange();
			range.selectNodeContents(e);
			const rects = [...range.getClientRects()]
				.filter((r) => r.width > 0)
				.sort((a, b) => a.top - b.top);
			let bottom = Number.NEGATIVE_INFINITY;
			let lines = 0;
			for (const r of rects) {
				if (r.top >= bottom) lines += 1;
				bottom = Math.max(bottom, r.bottom);
			}
			return { lines, rects };
		};
		const roots = [...document.querySelectorAll("header.page-header, main h1")];
		const scope = new Set<Element>();
		for (const root of roots) {
			scope.add(root);
			for (const e of root.querySelectorAll("*")) scope.add(e);
		}
		const outside: string[] = [];
		const clippers = new Set<string>();
		for (const e of scope) {
			const r = e.getBoundingClientRect();
			if (r.width > 0 && (r.right > vw + 0.5 || r.left < -0.5))
				outside.push(
					`${label(e)} ${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`,
				);
			for (
				let a: Element | null = e;
				a && a !== document.body;
				a = a.parentElement
			) {
				const c = getComputedStyle(a);
				if (/hidden|clip|scroll|auto/.test(c.overflowX))
					clippers.add(`${label(a)} overflow-x:${c.overflowX}`);
			}
		}
		const lockups = [...document.querySelectorAll("main .lockup")]
			.filter((l) => scope.has(l))
			.map((l) => {
				const icon = l.querySelector("i.codicon")?.getBoundingClientRect();
				const nameEl = l.querySelector("a, .name") as Element;
				const name = nameEl.getBoundingClientRect();
				return {
					text: l.textContent?.replace(/\s+/g, " ").trim() ?? "",
					sameLine: !!icon && name.top < icon.bottom && icon.top < name.bottom,
					nameLines: bands(nameEl).lines,
				};
			});
		const items = [
			...document.querySelectorAll("header.page-header .joined > *"),
		];
		const serves = [
			...document.querySelectorAll("header.page-header .serves"),
		].map((e) => ({
			text: e.textContent?.replace(/\s+/g, " ").trim() ?? "",
			lines: bands(e).lines,
		}));
		const leadingCommas: string[] = [];
		// What a reader sees: the item's own boxes include the `::before`
		// comma (a Range over its contents does not). The comma is the first
		// box of every item after the first; it leads a line when that box
		// starts below everything the item before it occupies.
		const boxes = (e: Element) =>
			[...e.getClientRects()].filter((r) => r.width > 0);
		items.forEach((item, i) => {
			if (i === 0) return;
			const prev = boxes(items[i - 1]);
			const mine = boxes(item);
			if (!prev.length || !mine.length) return;
			const comma = getComputedStyle(item, "::before").content.includes(",");
			const startsLine =
				mine[0].top >= Math.max(...prev.map((r) => r.bottom)) - 0.5;
			if (comma && startsLine)
				leadingCommas.push(
					`${item.textContent?.trim()} begins a line with its comma`,
				);
		});
		return {
			scrollWidth: de.scrollWidth,
			clientWidth: vw,
			outside,
			clippers: [...clippers],
			lockups,
			serves,
			leadingCommas,
		};
	});
}

for (const colorScheme of schemes) {
	for (const route of NARROW_ROUTES) {
		for (const host of route.hosts) {
			test(`${host} ${colorScheme} 396x808: the ${route.key} page does not scroll sideways, clips nothing and keeps its tokens whole`, async ({
				browser,
				baseURL,
			}) => {
				const context = await browser.newContext({
					colorScheme,
					viewport: WEBVIEW,
					baseURL: host === "export" ? EXPORT : baseURL,
				});
				const page = await context.newPage();
				await open(page, host, route.model, route.ref, route.heading);
				const f = await narrowFacts(page);
				expect
					.soft(
						f.scrollWidth - f.clientWidth,
						`document is ${f.scrollWidth}px in a ${f.clientWidth}px window`,
					)
					.toBeLessThanOrEqual(0);
				// Not hidden by clipping: every box of the header sits inside the window
				// and nothing in it, or around it, clips or scrolls.
				expect.soft(f.outside, "boxes outside the window").toEqual([]);
				expect.soft(f.clippers, "ancestors that clip or scroll").toEqual([]);
				// Atomic tokens: an icon and its name share a line, a name is one line.
				expect.soft(f.lockups.length).toBeGreaterThan(0);
				for (const l of f.lockups) {
					expect.soft(l.sameLine, `${l.text}: icon beside name`).toBe(true);
					expect.soft(l.nameLines, `${l.text}: name on one line`).toBe(1);
				}
				// A subdomain lockup and its classification stay together.
				for (const s of f.serves)
					expect.soft(s.lines, `${s.text}: one item, one line`).toBe(1);
				if (route.key === "nb-ckyc")
					expect.soft(f.serves.length).toBeGreaterThan(1);
				// The comma stays at the end of the item before it.
				expect.soft(f.leadingCommas).toEqual([]);
				await context.close();
			});
		}
	}
}
