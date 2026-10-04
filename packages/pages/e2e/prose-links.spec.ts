import { expect, type Locator, type Page, test } from "@playwright/test";
import {
	modelHash,
	PETSTORE_SCHEMA,
	serveModel,
	servePetstore,
	viewerAt,
} from "./helpers";

/**
 * A link inside a sentence is told apart from the words around it by more than
 * its colour (#79): it is underlined at rest. Four callers are prose (the
 * Problems "go to", a comment's citation, the reached-events sentence and a
 * link inside a Markdown paragraph); every control, list and cell that holds
 * only a link keeps today's look. Measured as the browser computes it, not as
 * the source says it.
 *
 * Markdown description links (the fourth prose caller) have no witness in
 * any reference model: none of their descriptions contains a link. The unit
 * suite covers that caller: `Markdown.test.ts` checks the compiled cue and
 * `markdown-classify.test.ts` checks which links are running text. This file
 * does not invent a fixture in the repository to reach it.
 */

const CUSTOMER = "#/boundedcontexts/customer_&_kyc";
const RESERVE =
	"#/boundedcontexts/catalog_bc/services/pet_app/provides/reserve_pet_for_order";
const PET_STATUS_CHANGED =
	"#/boundedcontexts/catalog_bc/aggregates/pet/provides/pet_status_changed";
const CATEGORY = "#/boundedcontexts/catalog_bc/valueobjects/category";

async function openNorthbank(page: Page, ref: string): Promise<void> {
	const url = await serveModel(page, "northbank-monolith");
	await page.goto(`/?url=${encodeURIComponent(url)}${modelHash(ref)}`);
	await page.locator("main h1").waitFor();
}

async function openPetstore(page: Page, ref: string): Promise<void> {
	await servePetstore(page);
	await page.goto(viewerAt(ref));
	await page.locator("main h1").waitFor();
}

const decoration = (link: Locator) =>
	link.evaluate((el) => getComputedStyle(el).textDecorationLine);

/** Every link the locator matches, at rest; and that there is at least one to speak of. */
async function expectDecorations(links: Locator, line: "underline" | "none") {
	const count = await links.count();
	expect(count, "the page has such a link to measure").toBeGreaterThan(0);
	for (let i = 0; i < count; i++)
		expect(await decoration(links.nth(i)), `link ${i}`).toBe(line);
}

test.describe("links in running text carry a non-colour cue at rest", () => {
	test("L1: the Problems go-to link on NorthBank's workspace page", async ({
		page,
	}) => {
		await openNorthbank(page, "");
		await expectDecorations(page.locator("ul.problems a.ref"), "underline");
	});

	test("L2: a comment's citation on NorthBank's health page", async ({
		page,
	}) => {
		await openNorthbank(page, "#/health");
		await expectDecorations(page.locator("ul.comments a.ref"), "underline");
	});

	test("L3: the reached-events sentence on ReservePetForOrder", async ({
		page,
	}) => {
		await openPetstore(page, RESERVE);
		await expectDecorations(page.locator("p.reached a.ref"), "underline");
	});

	test("hovering one keeps the underline, and focusing one keeps its ring", async ({
		page,
	}) => {
		await openPetstore(page, RESERVE);
		const link = page.locator("p.reached a.ref").first();
		await link.hover();
		expect(await decoration(link)).toBe("underline");
		await page.mouse.move(0, 0);
		await link.focus();
		await page.keyboard.press("Shift+Tab");
		await page.keyboard.press("Tab");
		await expect(link).toBeFocused();
		await expect(link).toHaveCSS("outline-style", "solid");
		expect(await decoration(link)).toBe("underline");
	});
});

test.describe("standalone links keep their look: no underline at rest", () => {
	test("the tree, the crumbs, the contents and a table cell on a context page", async ({
		page,
	}) => {
		await openNorthbank(page, CUSTOMER);
		await expectDecorations(page.locator("nav.tree a.ref").first(), "none");
		await expectDecorations(page.locator("nav.crumbs a"), "none");
		await expectDecorations(page.locator("nav.toc a"), "none");
		await expectDecorations(page.locator("td a.ref"), "none");
	});

	test("a delimited list of refs", async ({ page }) => {
		await openPetstore(page, PET_STATUS_CHANGED);
		await expectDecorations(page.locator("p.refs a.ref"), "none");
	});

	test("a delimited list of glossary terms", async ({ page }) => {
		await openPetstore(page, CATEGORY);
		await expectDecorations(page.locator("p.terms a"), "none");
	});

	test("the health report link on the workspace page", async ({ page }) => {
		await openNorthbank(page, "");
		await expectDecorations(page.locator("p.more a").first(), "none");
	});
});

test("a description's paragraphs keep their spacing, leading and measure", async ({
	page,
}) => {
	const schema = {
		...PETSTORE_SCHEMA,
		description: "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.",
	};
	await page.route("**/petstore.json", (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body: JSON.stringify(schema),
		}),
	);
	await page.goto(viewerAt(""));
	await page.locator("main h1").waitFor();
	const spacing = (paragraphs: Locator) =>
		paragraphs.evaluateAll((els) =>
			els.map((e) => {
				const s = getComputedStyle(e);
				return [s.marginTop, s.marginBottom, s.lineHeight].join(" ");
			}),
		);
	const body = await page.evaluate(
		() => getComputedStyle(document.body).lineHeight,
	);
	// The header keeps 4px over its first paragraph, the page body does not.
	expect(await spacing(page.locator("main .page-header .md p"))).toEqual([
		`4px 8px ${body}`,
		`4px 8px ${body}`,
		`4px 8px ${body}`,
	]);
	const rest = await spacing(page.locator("main .md:not(.page-header .md) p"));
	expect(rest.length).toBeGreaterThan(0);
	for (const looks of rest) expect(looks).toBe(`0px 8px ${body}`);
	const cap = await page
		.locator("main .page-header .md")
		.evaluate((el) => getComputedStyle(el).maxWidth);
	expect(cap).not.toBe("none");
});
