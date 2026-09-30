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
 * Issue #114, card 164. NorthBank's Ledger publishes PostingLine, and no
 * operation or event carries it: PostEntry and EntryPosted nest it, and those
 * are what consumables carry. The context page called it "unused" and
 * Markdown printed "-". The viewer and the static export read the same users
 * as Markdown now, and say which schema nests it.
 */
const LEDGER = "#/boundedcontexts/ledger";

let exportDir: string;

test.beforeAll(async () => {
	const schema = JSON.parse(
		readFileSync(
			join(__dirname, "../../../models/northbank/.ods/northbank.json"),
			"utf8",
		),
	);
	exportDir = await mkdtemp(join(tmpdir(), "ods-schema-users-"));
	await exportSite({
		appDir: join(__dirname, "../app"),
		sources: [
			{
				workspace: Workspace.fromSchema(schema),
				fileLabel: "northbank.json",
				diagnostics: [],
			},
		],
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
	test(`${host}: Ledger's PostingLine names the schemas that nest it and is not unused`, async ({
		page,
	}) => {
		await open(page, LEDGER);
		const schemas = page.getByRole("main").locator("#schemas");
		const heading = schemas
			.getByRole("heading", { level: 3 })
			.filter({ has: page.getByRole("link", { name: "PostingLine" }) });
		await expect(heading).toContainText("used by");
		await expect(heading).not.toContainText("unused");
		for (const [name, href] of [
			["PostEntry", "#/boundedcontexts/ledger/schemas/post_entry"],
			["EntryPosted", "#/boundedcontexts/ledger/schemas/entry_posted"],
		]) {
			await expect(
				heading.getByRole("link", { name, exact: true }),
			).toHaveAttribute("href", href);
		}
		await expect(heading).toContainText("schema");

		// A link lands on the user's page.
		await heading.getByRole("link", { name: "PostEntry", exact: true }).click();
		await expect(
			page.getByRole("main").getByRole("heading", { level: 1 }),
		).toContainText("PostEntry");
	});
}
