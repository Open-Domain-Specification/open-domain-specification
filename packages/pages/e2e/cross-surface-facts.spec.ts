import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
	relationshipArrow,
	relationshipTitle,
	Workspace,
} from "@open-domain-specification/core";
import { expect, type Page, test } from "@playwright/test";
import {
	EXPECTED,
	FIXTURE_FILE,
} from "../../../apps/ods-vscode/src/test/fixtures/cross-surface/expected";
import { exportSite } from "../dist/site.js";

/**
 * The same facts on the two hosts that render pages in a browser: the hosted
 * viewer and a static export opened from disk (epic #62). What each fact is
 * lives in `expected.ts`, which the VS Code webview test and the Markdown test
 * read as well, so the four surfaces are held to one list.
 *
 * The fixture is `apps/ods-vscode/.../cross-surface/.ods/cross_surface.json`,
 * written by its `generate.ts`.
 */
const FIXTURE_PATH = join(
	__dirname,
	"../../../apps/ods-vscode/src/test/fixtures/cross-surface/.ods",
	FIXTURE_FILE,
);
const SCHEMA = JSON.parse(readFileSync(FIXTURE_PATH, "utf8"));
const workspace = Workspace.fromSchema(SCHEMA);

type Host = { name: string; open: (page: Page, ref: string) => Promise<void> };

let exportDir: string;

const hosts: Host[] = [
	{
		name: "the hosted viewer",
		open: async (page, ref) => {
			await page.route("**/cross_surface.json", (route) =>
				route.fulfill({
					status: 200,
					headers: {
						"content-type": "application/json",
						"access-control-allow-origin": "*",
					},
					body: JSON.stringify(SCHEMA),
				}),
			);
			await page.goto(
				`/?url=${encodeURIComponent("https://workspaces.test/.ods/cross_surface.json")}${ref}`,
			);
		},
	},
	{
		name: "a static export",
		open: async (page, ref) => {
			await page.goto(
				`${pathToFileURL(join(exportDir, "index.html")).href}${ref}`,
			);
		},
	},
];

test.beforeAll(async () => {
	exportDir = await mkdtemp(join(tmpdir(), "ods-cross-surface-"));
	await exportSite({
		appDir: join(__dirname, "../app"),
		sources: [{ workspace, fileLabel: FIXTURE_FILE, diagnostics: [] }],
		outDir: exportDir,
	});
});

test.afterAll(async () => {
	await rm(exportDir, { recursive: true, force: true });
});

const squash = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();

for (const host of hosts) {
	test.describe(host.name, () => {
		test("an authored description is printed as written and a generated one says so (#43)", async ({
			page,
		}) => {
			const d = EXPECTED.descriptions;
			await host.open(page, EXPECTED.refs.orders);
			await expect(page.locator("main h1")).toContainText("Orders");

			const row = (counterpart: string) =>
				page.locator(".strategic-position tbody tr", {
					has: page.getByRole("link", { name: counterpart, exact: true }),
				});

			const authored = row(d.authored.counterpart).locator("span.description");
			await expect(authored).toHaveText(d.authored.text);
			await expect(authored).not.toHaveClass(/generated/);
			await expect(authored.locator(".keyword")).toHaveCount(0);

			const generated = row(d.generated.counterpart).locator(
				"span.description",
			);
			await expect(generated).toHaveClass(/generated/);
			expect(squash(await generated.textContent())).toBe(
				`${d.generated.sentence} ${d.generated.keyword}`,
			);
			await expect(generated.locator(".keyword")).toHaveText(
				d.generated.keyword,
			);
			await expect(generated.locator(".keyword")).toHaveAttribute(
				"title",
				d.generated.title,
			);
		});

		test("each consumption names the agreement it runs under, or leaves the cell empty (#55)", async ({
			page,
		}) => {
			const a = EXPECTED.agreements;
			await host.open(page, EXPECTED.refs.warehouseApi);
			await expect(page.locator("main h1")).toContainText("Warehouse API");

			const table = page
				.locator("table", {
					has: page.getByRole("columnheader", { name: a.columnHeader }),
				})
				.first();
			await expect(table.getByRole("columnheader")).toHaveText([
				"Consumable",
				"Provider",
				"Context",
				a.columnHeader,
				"Made By",
				"Protection",
			]);
			await expect(table.locator("tbody tr")).toHaveCount(
				a.consumptions.length,
			);
			for (const c of a.consumptions) {
				const cell = table
					.locator("tbody tr", {
						has: page.getByRole("link", { name: c.consumable, exact: true }),
					})
					.locator("td:nth-child(4)");
				if (c.agreement === null) {
					await expect(cell).toHaveText("");
					await expect(cell.locator("a")).toHaveCount(0);
				} else {
					const link = cell.getByRole("link", {
						name: c.agreement,
						exact: true,
					});
					await expect(link).toHaveAttribute("href", c.relationship as string);
				}
			}

			// The consumable map says the same on the edge's hover.
			const hovers = await page
				.locator(".svelte-flow .svelte-flow__edgelabel-renderer, .svelte-flow")
				.first()
				.evaluate((el) =>
					[...el.querySelectorAll("title")].flatMap((t) =>
						(t.textContent ?? "").split("\n"),
					),
				);
			for (const c of a.consumptions)
				if (c.agreement !== null)
					expect(hovers).toContain(a.edgeTitle(c.agreement));
			expect(hovers.filter((h) => h.startsWith("Under the "))).toHaveLength(
				a.consumptions.filter((c) => c.agreement !== null).length,
			);
		});

		test("each named agreement's page names it, as core titles it, apart from the other (#74)", async ({
			page,
		}) => {
			const headings: string[] = [];
			for (const n of EXPECTED.namedAgreements) {
				const relationship = workspace.relationships.find(
					(r) => r.ref === n.relationship,
				);
				expect(relationship).toBeDefined();
				await host.open(page, n.relationship);
				const h1 = page.locator("main h1");
				await expect(h1.locator(".agreement")).toHaveText(`· ${n.name}`);
				const parts = await h1.evaluate((el) =>
					[...el.querySelectorAll(".name, .arrow, .agreement")]
						.map((x) => x.textContent?.trim())
						.join(" "),
				);
				expect(parts).toBe(relationshipTitle(relationship as never));
				headings.push((await h1.textContent()) ?? "");
			}
			expect(new Set(headings).size).toBe(EXPECTED.namedAgreements.length);
		});

		test("the health report labels a relationship as core titles it, with each context its own link (#44)", async ({
			page,
		}) => {
			const h = EXPECTED.health;
			await host.open(page, EXPECTED.refs.health);
			await expect(page.locator("main h1")).toBeVisible();

			const relationship = workspace.relationships.find(
				(r) =>
					r.source.name === h.source.name && r.target.name === h.target.name,
			);
			expect(relationship).toBeDefined();
			const title = relationshipTitle(relationship as never);

			const cell = page
				.locator(".health-report td")
				.filter({ has: page.locator(".arrow") })
				.first();
			const parts = await cell.evaluate((el) => ({
				names: [...el.querySelectorAll(".name")].map((n) =>
					n.textContent?.trim(),
				),
				arrow: el.querySelector(".arrow")?.textContent,
				links: [...el.querySelectorAll("a")].map((a) => ({
					text: a.textContent?.trim(),
					href: a.getAttribute("href"),
				})),
			}));
			expect(parts.arrow).toBe(
				relationshipArrow((relationship as never as { type: never }).type),
			);
			expect(`${parts.names[0]} ${parts.arrow} ${parts.names[1]}`).toBe(title);
			expect(parts.links).toEqual([
				{ text: h.source.name, href: h.source.ref },
				{ text: h.target.name, href: h.target.ref },
			]);
		});

		test("the relation map draws each identity target as the kind of context it is (#56)", async ({
			page,
		}) => {
			await host.open(page, EXPECTED.refs.account);
			const figure = page.locator("figure.diagram", {
				hasText: "relation map",
			});
			await figure.scrollIntoViewIfNeeded();
			const flow = figure.locator(".svelte-flow");
			await expect(flow.locator(".relation-node").first()).toBeVisible();

			for (const i of EXPECTED.identities) {
				const node = flow.locator(".relation-node", {
					has: page.locator("strong", {
						hasText: new RegExp(`^${i.context}$`),
					}),
				});
				await expect(node.locator(".stereotype")).toHaveText(
					`«${i.stereotype}»`,
				);
			}
		});
	});
}

/**
 * The reference models carry no identity into a boundary-only or big-ball-of-mud
 * context, so those kinds are held by the fixture above. The clinic does draw
 * identities into two external systems, and a change that tagged every target
 * with the wrong kind would show there.
 */
test("the clinic's relation map draws its identity targets as external systems (#56)", async ({
	page,
}) => {
	const body = readFileSync(
		join(__dirname, "../../../models/clinic/.ods/outpatient_clinic.json"),
		"utf8",
	);
	await page.route("**/outpatient_clinic.json", (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body,
		}),
	);
	await page.goto(
		`/?url=${encodeURIComponent("https://workspaces.test/.ods/outpatient_clinic.json")}#/boundedcontexts/patient_records/aggregates/patient_record`,
	);
	const figure = page.locator("figure.diagram", { hasText: "relation map" });
	await figure.scrollIntoViewIfNeeded();
	const flow = figure.locator(".svelte-flow");
	await expect(flow.locator(".relation-node").first()).toBeVisible();
	for (const context of ["GP Practice System", "Laboratory"]) {
		const node = flow.locator(".relation-node", {
			has: page.locator("strong", { hasText: new RegExp(`^${context}$`) }),
		});
		await expect(node.locator(".stereotype")).toHaveText("«external system»");
	}
});
