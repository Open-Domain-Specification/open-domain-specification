import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Workspace } from "@open-domain-specification/core";
import { expect, type Page, test } from "@playwright/test";
import { exportSite } from "../dist/site.js";
import { serveModel } from "./helpers";

/**
 * Issue #107, card 157. NorthBank's interview names two owners of Money and
 * AccountNumber, Accounts and Ledger, and the model had invented a Shared
 * Kernel context and team and made four users co-owners. The viewer and the
 * static export render the same facts from the model: the values live in
 * Ledger and say who co-owns them, the one shared kernel joins Accounts and
 * Ledger, a user such as Cards is a conformist downstream of Ledger, and no
 * Shared Kernel context is left to open.
 */
const LEDGER = "#/boundedcontexts/ledger";
const MONEY = `${LEDGER}/valueobjects/money`;
const KERNEL = "#/relationships/accounts~shared-kernel~ledger";
const CARDS_ON_LEDGER = "#/relationships/ledger~upstream-downstream~cards";

let exportDir: string;

test.beforeAll(async () => {
	const schema = JSON.parse(
		readFileSync(
			join(__dirname, "../../../models/northbank/.ods/northbank.json"),
			"utf8",
		),
	);
	const workspace = Workspace.fromSchema(schema);
	exportDir = await mkdtemp(join(tmpdir(), "ods-kernel-"));
	await exportSite({
		appDir: join(__dirname, "../app"),
		sources: [{ workspace, fileLabel: "northbank.json", diagnostics: [] }],
		outDir: exportDir,
	});
});

test.afterAll(async () => {
	await rm(exportDir, { recursive: true, force: true });
});

const hosts: [string, (page: Page, ref: string) => Promise<void>][] = [
	[
		"viewer",
		async (page, ref) => {
			const url = await serveModel(page, "northbank");
			await page.goto(`/?url=${encodeURIComponent(url)}${ref}`);
		},
	],
	[
		"export",
		async (page, ref) => {
			await page.goto(
				`${pathToFileURL(join(exportDir, "index.html")).href}${ref}`,
			);
		},
	],
];

for (const [host, open] of hosts) {
	test(`${host}: Money lives in Ledger, says who co-owns it, and lists its users`, async ({
		page,
	}) => {
		await open(page, MONEY);
		const main = page.getByRole("main");
		await expect(main.getByRole("heading", { level: 1 })).toContainText(
			"Money",
		);
		await expect(main).toContainText(
			"Co-owned by Accounts and Ledger through their shared kernel",
		);
		const usage = main.locator("#usage");
		for (const aggregate of [
			"Account",
			"PaymentInstruction",
			"Card",
			"LoanApplication",
			"RegulatoryReturn",
		])
			await expect(
				usage.getByRole("link", { name: aggregate, exact: true }).first(),
			).toBeVisible();
	});

	test(`${host}: the one shared kernel joins Accounts and Ledger`, async ({
		page,
	}) => {
		await open(page, KERNEL);
		const main = page.getByRole("main");
		await expect(main.getByRole("heading", { level: 1 })).toContainText(
			"Accounts",
		);
		await expect(main.getByRole("heading", { level: 1 })).toContainText(
			"Ledger",
		);
		await expect(main).toContainText(
			"Money and AccountNumber, from @northbank/money, changed and released together by the two teams",
		);
	});

	test(`${host}: Cards takes Money from Ledger as a conformist, not a co-owner`, async ({
		page,
	}) => {
		await open(page, CARDS_ON_LEDGER);
		const main = page.getByRole("main");
		await expect(main).toContainText("Conformist");
		await expect(main).toContainText(
			"Assumed: the Cards lead did not mention the library",
		);
	});

	test(`${host}: no Shared Kernel context or team is left`, async ({
		page,
	}) => {
		await open(page, LEDGER);
		await expect(page.getByRole("main")).toContainText("Core Banking Team");
		const tree = page.getByRole("navigation", { name: "Workspace elements" });
		await expect(tree).toContainText("Ledger");
		await expect(tree).not.toContainText("Shared Kernel");
	});
}
