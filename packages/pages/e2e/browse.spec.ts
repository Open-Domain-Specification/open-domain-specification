import { expect, test } from "@playwright/test";
import { ORDER_REF, servePetstore, viewerAt, WORKSPACE_NAME } from "./helpers";

/** Moving around a loaded workspace: sidebar, table of contents, ref links and history. */

const ATTRIBUTE_REF = `${ORDER_REF}/entities/order/attributes/status`;
/** The one petstore operation asked with one schema and answered with another. */
const GET_PET_SUMMARY_REF =
	"#/boundedcontexts/catalog_bc/services/pet_app/provides/get_pet_summary";
/** The one petstore operation that names the shape it refuses with. */
const RESERVE_PET_FOR_ORDER_REF =
	"#/boundedcontexts/catalog_bc/services/pet_app/provides/reserve_pet_for_order";

test.beforeEach(async ({ page }) => {
	await servePetstore(page);
	await page.goto(viewerAt());
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
});

test("the sidebar lists domains, contexts and teams", async ({ page }) => {
	const nav = page.locator("nav.tree");

	// Codicon glyphs are generated content, so accessible names carry a leading
	// private-use character; match on the label rather than the whole name.
	await expect(
		nav.getByRole("link", { name: "Petstore Commerce" }),
	).toBeVisible();
	await expect(nav.getByRole("link", { name: "Sales BC" })).toBeVisible();
	await expect(nav.getByRole("link", { name: /Order$/ })).toBeVisible();
	await expect(nav.getByRole("link", { name: "Orders Team" })).toBeVisible();
});

test("clicking a sidebar item routes to its page and marks it active", async ({
	page,
}) => {
	const nav = page.locator("nav.tree");
	await nav.getByRole("link", { name: "Sales BC" }).click();

	await expect(page).toHaveURL(/#\/boundedcontexts\/sales_bc$/);
	await expect(page.locator("main h1")).toContainText("Sales BC");
	await expect(nav.locator(".item.active")).toHaveText(/Sales BC/);

	await nav.getByRole("link", { name: "Orders Team" }).click();

	await expect(page).toHaveURL(/#\/teams\/orders_team$/);
	await expect(page.locator("main h1")).toContainText("Orders Team");
	await expect(nav.locator(".item.active")).toHaveText(/Orders Team/);
});

test("table of contents entries scroll to their section", async ({ page }) => {
	const toc = page.locator("aside.toc");
	await expect(toc.getByRole("link", { name: "Health" })).toBeVisible();

	await expect(page.locator("#health")).not.toBeInViewport();
	await toc.getByRole("link", { name: "Health" }).click();

	await expect(page.locator("#health")).toBeInViewport();
});

test("the context page's reactions are one section: both tables, then the map", async ({
	page,
}) => {
	await page.goto(viewerAt("#/boundedcontexts/sales_bc"));
	await expect(page.locator("main h1")).toContainText("Sales BC");

	// One table-of-contents entry for the two reaction tables (card 88).
	const toc = page.locator("aside.toc");
	await expect(toc.getByRole("link", { name: "Reactions" })).toBeVisible();
	await expect(toc.getByRole("link", { name: "Policies" })).toHaveCount(0);
	await expect(toc.getByRole("link", { name: "Processes" })).toHaveCount(0);

	const reactions = page.locator("#reactions");
	await expect(reactions.locator("h2")).toContainText("Reactions");
	await expect(reactions.locator("h3")).toHaveText([/Policies/, /Processes/]);
	// The map summarises both tables, so it comes under the pair.
	await expect(reactions.locator("figure.diagram")).toContainText(
		"Sales BC flow map",
	);
	const map = await reactions.locator("figure.diagram").boundingBox();
	const processes = await reactions.getByRole("table").last().boundingBox();
	expect(map?.y).toBeGreaterThan(
		(processes?.y ?? 0) + (processes?.height ?? 0),
	);

	await toc.getByRole("link", { name: "Reactions" }).click();
	await expect(reactions).toBeInViewport();
});

test("the workspace's health strip links out to the full report", async ({
	page,
}) => {
	// v2 carries the three evidence counts as the badges on their headings,
	// the way a pane header does, rather than as a stat strip.
	const health = page.locator("#health");
	await expect(health.locator("#refactor .count")).toHaveText("1");
	await expect(health.locator("#tolerated .count")).toHaveText("1");

	await page.getByRole("link", { name: /full health report/ }).click();

	await expect(page).toHaveURL(/#\/health$/);
	await expect(page.locator("main h1")).toContainText("Health");
	// The report's own counts are the badges on its three headings, the same
	// treatment the workspace page's Health section uses.
	await expect(page.locator("main #refactor .count")).toHaveText("1");
	await expect(page.locator("main #tolerated .count")).toHaveText("1");
	// The refactor backlog, grouped under the context that owns the change.
	await expect(page.locator("#refactor")).toBeVisible();
	await expect(page.locator("main")).toContainText(
		"The kernel has grown past the status enum",
	);

	// The no-comments list is a reconciliation to-do, so it starts collapsed.
	// Its heading carries no count badge here: every intent in the petstore
	// has a comment, and v2 draws no badge at zero (card 34).
	await expect(page.locator("main #no-comments .count")).toHaveCount(0);
	const toggle = page.getByRole("button", { name: /No comments/ });
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await toggle.click();
	await expect(toggle).toHaveAttribute("aria-expanded", "true");
	await expect(page.locator("main")).toContainText(
		"Every intent carries at least one comment.",
	);
});

test("a ref link inside the page navigates", async ({ page }) => {
	await page
		.locator(`main a.ref[data-ref="#/teams/orders_team"]`)
		.first()
		.click();

	await expect(page.locator("main h1")).toContainText("Orders Team");
	await expect(page).toHaveURL(/#\/teams\/orders_team$/);
});

test("back and forward restore the pages visited", async ({ page }) => {
	const nav = page.locator("nav.tree");
	await nav.getByRole("link", { name: "Sales BC" }).click();
	await expect(page.locator("main h1")).toContainText("Sales BC");
	await nav.getByRole("link", { name: "Orders Team" }).click();
	await expect(page.locator("main h1")).toContainText("Orders Team");

	await page.goBack();
	await expect(page.locator("main h1")).toContainText("Sales BC");

	await page.goBack();
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);

	await page.goForward();
	await expect(page.locator("main h1")).toContainText("Sales BC");

	await page.goForward();
	await expect(page.locator("main h1")).toContainText("Orders Team");
});

test("a leaf ref opens its owner page and flashes the element", async ({
	page,
}) => {
	await page.evaluate((ref) => {
		location.hash = ref;
	}, ATTRIBUTE_REF);

	// An attribute has no page of its own, so its entity owns it. v2 says the
	// kind in the title's lockup rather than as a crumb, so the trail ends at
	// the aggregate and the title carries the word.
	await expect(page.locator("main .crumbs")).toContainText("Order");
	await expect(page.locator("main h1")).toContainText("Order");
	await expect(page.locator("main h1 .detail")).toHaveText("Entity");
	const row = page.locator(`tr[id="${ATTRIBUTE_REF}"]`);
	await expect(row).toHaveClass(/flash/);
	await expect(row).toBeInViewport();
});

test("a query shows what it is asked with and what it answers with, and the returned schema links back", async ({
	page,
}) => {
	await page.evaluate((ref) => {
		location.hash = ref;
	}, GET_PET_SUMMARY_REF);

	await expect(page.locator("main h1")).toContainText("GetPetSummary");
	await expect(page.locator("main h1 .detail")).toHaveText("Operation");

	// Two facts, two tables: PetId goes in, PetSummary comes back.
	const facts = page.locator("main dl").first();
	await expect(facts).toContainText("Payload");
	await expect(facts).toContainText("Returns");
	await expect(page.locator("#payload tbody")).toContainText("petId");
	const returns = page.locator("#returns");
	await returns.scrollIntoViewIfNeeded();
	await expect(returns.locator("tbody")).toContainText("status");

	// The Returns fact links to the schema, whose carriers table names this
	// operation back and says the shape only ever travels outward — one at a
	// time here, and as a list from the search (decision 13, amended).
	await page
		.locator("main dd")
		.filter({ hasText: "PetSummary" })
		.getByRole("link")
		.first()
		.click();
	await expect(page.locator("main h1")).toContainText("PetSummary");
	const carriers = page.locator("#carriers tbody tr");
	await expect(carriers).toHaveCount(2);
	await expect(carriers.filter({ hasText: "GetPetSummary" })).toContainText(
		"returns",
	);
	await expect(carriers.filter({ hasText: "FindPetsByStatus" })).toContainText(
		"returns many",
	);
});

test("an operation shows what it refuses with, and the rejection schema links back", async ({
	page,
}) => {
	await page.evaluate((ref) => {
		location.hash = ref;
	}, RESERVE_PET_FOR_ORDER_REF);

	await expect(page.locator("main h1")).toContainText("ReservePetForOrder");
	await expect(page.locator("main h1 .detail")).toHaveText("Operation");

	// A PetId goes in and nothing comes back on success, so the facts name the
	// payload and the refusal and no Returns between them.
	const facts = page.locator("main dl").first();
	await expect(facts).toContainText("Payload");
	await expect(facts).not.toContainText("Returns");
	await expect(facts).toContainText("Rejects with");
	await expect(page.locator("#payload tbody")).toContainText("petId");
	const rejects = page.locator("#rejects");
	await rejects.scrollIntoViewIfNeeded();
	// One subsection per rejection, each headed by the schema and followed by
	// its own attributes: the status is what says why the pet was not held.
	await expect(rejects.locator("h3")).toHaveCount(1);
	await expect(rejects.locator("h3")).toContainText("PetUnavailable");
	await expect(rejects.locator("tbody")).toContainText("status");

	// The Rejects with fact links to the schema, whose carriers table names this
	// operation back and says the shape only ever travels as a refusal.
	await page
		.locator("main dd")
		.filter({ hasText: "PetUnavailable" })
		.getByRole("link")
		.first()
		.click();
	await expect(page.locator("main h1")).toContainText("PetUnavailable");
	const carriers = page.locator("#carriers tbody tr");
	await expect(carriers).toHaveCount(1);
	await expect(carriers).toContainText("ReservePetForOrder");
	await expect(carriers).toContainText("rejects with");
});
