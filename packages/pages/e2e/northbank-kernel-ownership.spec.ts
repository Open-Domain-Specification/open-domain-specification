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

	test(`${host}: Ledger's page lists every user of AccountNumber and Money, here and elsewhere`, async ({
		page,
	}) => {
		await open(page, LEDGER);
		const values = page.getByRole("main").locator("#values");
		const row = (name: string) =>
			values
				.getByRole("row")
				.filter({ has: page.getByRole("link", { name, exact: true }) });
		const link = (name: string) =>
			page.getByRole("link", { name, exact: true });

		// AccountNumber: a foreign aggregate and a nested value object of Ledger's
		// own, where the old page said nothing held it.
		const accountNumber = row("AccountNumber");
		await expect(
			accountNumber.getByRole("link", {
				name: "Accounts / Account",
				exact: true,
			}),
		).toHaveAttribute("href", "#/boundedcontexts/accounts/aggregates/account");
		await expect(
			accountNumber.getByRole("link", {
				name: "CustomerLedgerAccount",
				exact: true,
			}),
		).toHaveAttribute(
			"href",
			"#/boundedcontexts/ledger/valueobjects/customer_ledger_account",
		);
		await expect(accountNumber).toContainText("value object");
		await expect(accountNumber).not.toContainText("nothing");

		// Money: its own aggregate, four other contexts' aggregates, and nested
		// value objects and schemas that type it.
		const money = row("Money");
		for (const [name, href] of [
			["JournalEntry", "#/boundedcontexts/ledger/aggregates/journal_entry"],
			["Accounts / Account", "#/boundedcontexts/accounts/aggregates/account"],
			[
				"Accounts / OverdraftLimit",
				"#/boundedcontexts/accounts/valueobjects/overdraft_limit",
			],
			[
				"Payments Hub / PaymentInstruction",
				"#/boundedcontexts/payments_hub/aggregates/payment_instruction",
			],
			["Cards / Card", "#/boundedcontexts/cards/aggregates/card"],
			[
				"Lending / LoanApplication",
				"#/boundedcontexts/lending/aggregates/loan_application",
			],
			[
				"Regulatory Reporting / RegulatoryReturn",
				"#/boundedcontexts/regulatory_reporting/aggregates/regulatory_return",
			],
			[
				"Accounts / AvailableBalance",
				"#/boundedcontexts/accounts/schemas/available_balance",
			],
		])
			await expect(
				money.getByRole("link", { name, exact: true }),
			).toHaveAttribute("href", href);
		await expect(money).toContainText("schema");
		await expect(money).not.toContainText("nothing");
		// A kind is a user of its parent; a holder typed by the parent may hold
		// either kind. The old page warned that neither kind was used.
		const ledgerAccount = row("LedgerAccount");
		for (const kind of ["CustomerLedgerAccount", "NominalLedgerAccount"])
			await expect(
				ledgerAccount.getByRole("link", { name: kind, exact: true }),
			).toBeVisible();
		await expect(ledgerAccount).toContainText("kind");
		for (const id of ["customer_ledger_account", "nominal_ledger_account"]) {
			const kindRow = values.locator(
				`[id="#/boundedcontexts/ledger/valueobjects/${id}"]`,
			);
			await expect(
				kindRow.getByRole("link", { name: "JournalEntry", exact: true }),
			).toHaveAttribute(
				"href",
				"#/boundedcontexts/ledger/aggregates/journal_entry",
			);
			await expect(kindRow).toContainText("through LedgerAccount");
			await expect(kindRow).not.toContainText("nothing");
		}

		// A link lands on the user's page.
		await link("Accounts / Account").first().click();
		await expect(
			page.getByRole("main").getByRole("heading", { level: 1 }),
		).toContainText("Account");
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
