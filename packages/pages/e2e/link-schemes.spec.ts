import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Workspace } from "@open-domain-specification/core";
import { expect, type Page, test } from "@playwright/test";
import { exportSite } from "../dist/site.js";
import { PETSTORE_SCHEMA } from "./helpers";

/**
 * A workspace file must not run script through a description. The same
 * hostile description is opened on each host that renders pages as HTML: the
 * hosted viewer, a static export opened from disk, and the embedded bundle the
 * VS Code webview loads (driven here by host messages in a browser; the real
 * VS Code host is not observable from an extension-host test).
 */

const UNSAFE = [
	["javascript", "javascript:window.__ran=1"],
	["mixed case", "JaVaScRiPt:window.__ran=1"],
	["data", "data:text/html,<script>window.__ran=1</script>"],
	["vbscript", "vbscript:msgbox(1)"],
	["file", "file:///etc/passwd"],
	["entity-encoded tab", "java&#x09;script:window.__ran=1"],
	["entity-encoded letter", "&#106;avascript:window.__ran=1"],
	["percent-encoded", "javascript%3Awindow.__ran=1"],
] as const;

const SAFE = [
	["http", "http://example.com/a"],
	["https", "https://example.com/b"],
	["mailto", "mailto:someone@example.com"],
	["in-model", "#/teams/orders_team"],
] as const;

const description = [
	"Hostile description.",
	...UNSAFE.map(([name, url]) => `- [unsafe ${name}](${url})`),
	`- ![unsafe image](${UNSAFE[2][1]})`,
	"- [reference][r]",
	"- <javascript:window.__ran=1>",
	...SAFE.map(([name, url]) => `- [safe ${name}](${url})`),
	"",
	`[r]: ${UNSAFE[0][1]}`,
].join("\n");

const schema = { ...PETSTORE_SCHEMA, description };

async function expectInert(page: Page) {
	const md = page.locator("main .page-header .md");
	await expect(md).toContainText("Hostile description.");
	for (const [name] of UNSAFE) await expect(md).toContainText(`unsafe ${name}`);
	await expect(md.getByRole("link", { name: /unsafe|reference/ })).toHaveCount(
		0,
	);
	await expect(md.locator("img")).toHaveCount(0);
	// Nothing in the description carries an unsafe destination.
	const hrefs = await md
		.locator("[href], [src]")
		.evaluateAll((els) =>
			els.map((e) => e.getAttribute("href") ?? e.getAttribute("src")),
		);
	expect(hrefs.sort()).toEqual(SAFE.map(([, url]) => url).sort());
	for (const [name, url] of SAFE)
		await expect(
			md.getByRole("link", { name: `safe ${name}`, exact: true }),
		).toHaveAttribute("href", url);
	expect(await page.evaluate(() => "__ran" in window)).toBe(false);
}

test("the hosted viewer renders unsafe description links as plain text", async ({
	page,
}) => {
	await page.route("**/hostile.json", (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body: JSON.stringify(schema),
		}),
	);
	await page.goto(
		`/?url=${encodeURIComponent("https://workspaces.test/hostile.json")}`,
	);
	await expectInert(page);
	await page
		.locator("main .md")
		.getByRole("link", { name: "safe in-model", exact: true })
		.click();
	await expect(page.locator("main h1")).toContainText("Orders Team");
});

test("the embedded bundle the VS Code webview loads renders unsafe description links as plain text (browser, not VS Code)", async ({
	page,
}) => {
	await page.addInitScript(() => {
		(window as unknown as { acquireVsCodeApi: unknown }).acquireVsCodeApi =
			() => ({ postMessage: () => undefined });
	});
	await page.goto("/");
	await page.evaluate((s) => {
		window.postMessage(
			{ type: "model", workspaces: [{ schema: s, fileLabel: "hostile.json" }] },
			"*",
		);
	}, schema);
	await expectInert(page);
});

test.describe("the static export", () => {
	let dir: string;

	test.beforeAll(async () => {
		dir = await mkdtemp(join(tmpdir(), "ods-link-schemes-"));
		const workspace = Workspace.fromSchema(schema);
		await exportSite({
			appDir: join(__dirname, "../app"),
			sources: [{ workspace, fileLabel: "hostile.json", diagnostics: [] }],
			outDir: dir,
		});
	});

	test.afterAll(async () => {
		await rm(dir, { recursive: true, force: true });
	});

	test("renders unsafe description links as plain text", async ({ page }) => {
		await page.goto(pathToFileURL(join(dir, "index.html")).href);
		await expectInert(page);
	});
});
