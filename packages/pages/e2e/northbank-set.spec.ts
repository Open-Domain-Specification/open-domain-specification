import { expect, test } from "@playwright/test";
import { routeOf } from "../src/lib/route";
import { modelHash } from "./helpers";
import { NORTHBANK_FILES, northbankRoute, northbankSet } from "./northbank-set";
import {
	type NorthbankExport,
	openNorthbank,
	READING_HOSTS,
	startNorthbankExport,
} from "./reading-hosts";

/**
 * NorthBank as it ships, the twelve team files read as one set, in each place a
 * reader meets it: the viewer given the twelve addresses, and the static export
 * of the set opened over HTTP and from `file://`. The frozen single-file
 * original is the standalone baseline of the specs beside this one and is not
 * read here.
 */
let site: NorthbankExport;
test.beforeAll(async () => {
	site = await startNorthbankExport("set");
});
test.afterAll(async () => {
	await site.stop();
});

const set = northbankSet();
const hrefOf = (route: string) => modelHash(route);
const h1 = (page: import("@playwright/test").Page) => page.locator("main h1");

for (const host of READING_HOSTS) {
	test.describe(host, () => {
		test("opens on the set's own page: twelve files, nineteen contexts across them", async ({
			page,
		}) => {
			await openNorthbank(page, host, "", site);
			await expect(h1(page)).toContainText("Workspaces");
			await expect(h1(page)).toContainText("12 files");
			const rows = page.locator("#workspaces tbody tr");
			await expect(rows).toHaveCount(12);
			const files = await rows
				.locator("td:nth-child(2) code")
				.allTextContents();
			expect(files).toEqual(NORTHBANK_FILES);
			// Each context of each file is a node of the map, kept apart by file.
			await expect(page.locator(".context-node")).toHaveCount(19);
			// The model carries exactly the three findings it means to carry, each in its own file.
			const problems = page.locator("#problems");
			await expect(problems.getByText("separate-ways")).toBeVisible();
			await expect(problems.getByText("consumable-kind")).toBeVisible();
			await expect(
				problems.getByText("context-serves-subdomain"),
			).toBeVisible();
			await expect(problems.locator("ul.problems li")).toHaveCount(3);
		});

		test("opens the page of the file a qualified deep link names", async ({
			page,
		}) => {
			const route = northbankRoute("#/boundedcontexts/ledger");
			expect(route).toBe(
				"#/workspaces/core_banking.json/boundedcontexts/ledger",
			);
			await openNorthbank(page, host, route, site);
			await expect(h1(page)).toContainText("Ledger");
			await expect(page.locator(".crumbs")).toContainText(
				"NorthBank Core Banking",
			);
			await expect(page).toHaveURL(
				new RegExp(`${hrefOf(route).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
			);
		});

		test("lists the users of Money by the files that own them", async ({
			page,
		}) => {
			const money = northbankRoute(
				"#/boundedcontexts/ledger/valueobjects/money",
			);
			await openNorthbank(page, host, money, site);
			await expect(h1(page)).toContainText("Money");
			const usage = page.getByRole("main").locator("#usage");
			const aggregate = (file: string, ctx: string, name: string) =>
				set.byPath(file)?.boundedcontexts.get(ctx)?.aggregates.get(name);
			const expected: Array<[string, string, string, string]> = [
				["Account", "accounts.json", "accounts", "account"],
				[
					"PaymentInstruction",
					"payments.json",
					"payments_hub",
					"payment_instruction",
				],
				["Card", "cards.json", "cards", "card"],
				["LoanApplication", "lending.json", "lending", "loan_application"],
				[
					"RegulatoryReturn",
					"finance_systems.json",
					"regulatory_reporting",
					"regulatory_return",
				],
			];
			for (const [name, file, ctx, id] of expected) {
				const agg = aggregate(file, ctx, id);
				if (!agg) throw new Error(`${file} has no ${ctx}/${id}`);
				const link = usage.getByRole("link", { name, exact: true }).first();
				// The link is to the entity that holds the value, inside that aggregate of that file.
				await expect(link).toHaveAttribute(
					"href",
					new RegExp(
						`^${hrefOf(routeOf(agg)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
					),
				);
			}
		});

		test("opens the page of the exact file a map node belongs to, when the node is activated", async ({
			page,
		}) => {
			await openNorthbank(page, host, "", site);
			const ledger = set
				.byPath("core_banking.json")
				?.boundedcontexts.get("ledger");
			if (!ledger) throw new Error("core_banking.json has no ledger");
			const node = page.locator(
				'[data-id="core_banking.json#/boundedcontexts/ledger"]',
			);
			await expect(node).toBeVisible();
			await node.click();
			await expect(h1(page)).toContainText("Ledger");
			await expect(page).toHaveURL(
				new RegExp(
					`${hrefOf(routeOf(ledger)).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
				),
			);
			await expect(page.locator(".crumbs")).toContainText(
				"NorthBank Core Banking",
			);
		});

		test("follows a consumption into the file that provides it, and Back returns", async ({
			page,
		}) => {
			// The first consumption, in file order, whose provider is in another file.
			const consumption = set.workspaces
				.flatMap((w) => [...w.boundedcontexts.values()])
				.flatMap((bc) => [...bc.aggregates.values(), ...bc.services.values()])
				.flatMap((m) => m.consumptions)
				.find(
					(c) =>
						c.consumable.provider.boundedcontext.workspace !==
						c.consumer.boundedcontext.workspace,
				);
			if (!consumption) throw new Error("no consumption crosses files");
			const aggregate = consumption.consumer;
			const from = routeOf(aggregate);
			await openNorthbank(page, host, from, site);
			const target = routeOf(consumption.consumable);
			const link = page
				.getByRole("main")
				.locator(`a.ref[data-ref="${target}"]`)
				.first();
			await expect(link).toBeVisible();
			await link.click();
			await expect(page).toHaveURL(
				new RegExp(`${hrefOf(target).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
			);
			await expect(h1(page)).toContainText(consumption.consumable.name);
			await page.goBack();
			await expect(page).toHaveURL(
				new RegExp(`${hrefOf(from).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`),
			);
			await expect(h1(page)).toContainText(aggregate.name);
		});

		test("shows the list of workspaces from every file's page, and a route that names no file is the list", async ({
			page,
		}) => {
			await openNorthbank(
				page,
				host,
				northbankRoute("#/boundedcontexts/lending"),
				site,
			);
			if (host === "viewer" || host.startsWith("export")) {
				await page.getByRole("link", { name: "All workspaces" }).click();
				await expect(h1(page)).toContainText("12 files");
			}
			await page.goto(
				page.url().split("#")[0] + modelHash("#/boundedcontexts/lending"),
			);
			await expect(h1(page)).toContainText("Workspaces");
		});
	});
}

test("the viewer says what a read from addresses cannot see, the export does not", async ({
	page,
}) => {
	await openNorthbank(page, "viewer", "", site);
	const notice = page.locator('[data-notice="incomplete"]');
	await expect(notice).toHaveAttribute("role", "status");
	await expect(notice).toContainText(
		"12 workspaces reached from the addresses given",
	);
	await expect(notice).toContainText("not discoverable by URL");
	await openNorthbank(page, "export-http", "", site);
	await expect(page.locator('[data-notice="incomplete"]')).toHaveCount(0);
});
