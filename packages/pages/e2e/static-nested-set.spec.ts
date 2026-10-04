import { existsSync, readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import { exportSite } from "../dist/site.js";
import { modelHash } from "./helpers";
import { serveDir } from "./reading-hosts";
import { encodedFolder, type Folder, nestedFolder } from "./set-fixtures";

/**
 * The static export of a set: every file of the folder, at its own path, in the
 * one bootstrap, so a link between files keeps reaching the file it names from
 * a folder, `file://` or any static host. Nested folders and names that need
 * encoding are the cases a flat layout never meets.
 */
const dirs: string[] = [];
const servers: Array<() => Promise<void>> = [];
test.afterAll(async () => {
	for (const stop of servers) await stop();
	for (const d of dirs) await rm(d, { recursive: true, force: true });
});

async function exported(folder: Folder) {
	const dir = await mkdtemp(join(tmpdir(), "ods-nested-"));
	dirs.push(dir);
	const result = await exportSite({
		appDir: join(__dirname, "../app"),
		outDir: dir,
		sources: folder.set.workspaces.map((workspace) => ({
			workspace,
			fileLabel: workspace.file as string,
			path: workspace.file as string,
			set: "folder",
			diagnostics: [],
		})),
	});
	const served = await serveDir(dir);
	servers.push(served.stop);
	return { dir, origin: served.origin, result };
}

const h1 = (page: Page) => page.locator("main h1");
const rows = (page: Page) =>
	page.locator("#workspaces tbody tr td:nth-child(2) code");
const hosts = ["http", "file"] as const;
const open = (
	site: { dir: string; origin: string },
	host: (typeof hosts)[number],
	route = "",
) =>
	host === "http"
		? `${site.origin}/${route ? modelHash(route) : ""}`
		: `${pathToFileURL(join(site.dir, "index.html")).href}${route ? modelHash(route) : ""}`;

for (const host of hosts) {
	test(`${host}: a set of sibling folders opens on its list, each file at its own nested path`, async ({
		page,
	}) => {
		const folder = nestedFolder();
		const site = await exported(folder);
		await page.goto(open(site, host));
		await expect(h1(page)).toContainText("2 files");
		expect(await rows(page).allTextContents()).toEqual([
			"a/team.json",
			"b/team.json",
		]);
		// An export is the whole folder: nothing about files out of view.
		await expect(page.locator("[data-notice]")).toHaveCount(0);
	});

	test(`${host}: a link from a/team.json to b/team.json lands on b, not on a's own Post`, async ({
		page,
	}) => {
		const folder = nestedFolder();
		const site = await exported(folder);
		const [a, b] = folder.teams;
		expect(a.post.ref).toBe(b.post.ref);
		await page.goto(
			open(site, host, `#/workspaces/a~1team.json${a.account.ref.slice(1)}`),
		);
		await expect(h1(page)).toContainText("Account");
		await expect(page.locator(".crumbs")).toContainText("Team A");
		const target = `#/workspaces/b~1team.json${b.post.ref.slice(1)}`;
		const own = `#/workspaces/a~1team.json${a.post.ref.slice(1)}`;
		await expect(page.locator(`main a.ref[data-ref="${own}"]`)).toHaveCount(0);
		await page.locator(`main a.ref[data-ref="${target}"]`).first().click();
		await expect(h1(page)).toContainText("Post");
		await expect(page.locator(".crumbs")).toContainText("Team B");
		await expect(page).toHaveURL(
			new RegExp(
				`${modelHash(target).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
			),
		);
	});

	test(`${host}: names that need encoding open at one segment each, the right file each time`, async ({
		page,
	}) => {
		const folder = encodedFolder();
		const site = await exported(folder);
		await page.goto(open(site, host));
		await expect(h1(page)).toContainText("4 files");
		expect(await rows(page).allTextContents()).toEqual([
			"a#%.json",
			"a%41.json",
			"my team.json",
			"ü/é.json",
		]);
		const expected: Array<[string, RegExp]> = [
			["Team Hash", /#\/workspaces\/a%2523%2525\.json$/],
			["Team Percent", /#\/workspaces\/a%252541\.json$/],
			["Team Space", /#\/workspaces\/my%2520team\.json$/],
			["Team Accent", /#\/workspaces\/%25C3%25BC~1%25C3%25A9\.json$/],
		];
		for (const [name, url] of expected) {
			await page.goto(open(site, host));
			await page.getByRole("link", { name }).first().click();
			await expect(page).toHaveURL(url);
			await expect(h1(page)).toContainText(name);
		}
	});
}

test("the export also keeps each file as plain JSON at its path, so the folder can be read by URL as well as opened", async ({
	page,
}) => {
	const folder = nestedFolder();
	const site = await exported(folder);
	expect(site.result.files.map((f) => f.slice(site.dir.length + 1))).toEqual([
		join("workspaces", "a", "team.json"),
		join("workspaces", "b", "team.json"),
	]);
	expect(existsSync(join(site.dir, "workspaces", "a", "team.json"))).toBe(true);
	const copy = JSON.parse(
		readFileSync(join(site.dir, "workspaces", "a", "team.json"), "utf8"),
	);
	// The copy holds the file-qualified ref the export set wrote, relative to its own folder.
	expect(JSON.stringify(copy)).toContain('"$ref":"../b/team.json#/');

	// The viewer reads those copies: ../ resolves inside the explicit root, and without it it escapes.
	const root = "https://export.test/workspaces/";
	await page.route(`${root}**`, (route) => {
		const path = route.request().url().slice(root.length);
		return route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body: readFileSync(
				join(site.dir, "workspaces", ...path.split("/")),
				"utf8",
			),
		});
	});
	const entry = encodeURIComponent(`${root}a/team.json`);
	await page.goto(`/?url=${entry}&root=${encodeURIComponent(root)}`);
	await expect(h1(page)).toContainText("2 files");
	expect(await rows(page).allTextContents()).toEqual([
		"a/team.json",
		"b/team.json",
	]);
	await page.goto(`/?url=${entry}`);
	await expect
		.poll(async () =>
			(await page.locator('[data-notice="incomplete"]').allTextContents()).join(
				"\n",
			),
		)
		.toContain("escapes-root");
});

test("refuses to export a file whose path cannot be a path of the set, and writes nothing", async () => {
	const folder = nestedFolder();
	const dir = await mkdtemp(join(tmpdir(), "ods-nested-bad-"));
	dirs.push(dir);
	await expect(
		exportSite({
			appDir: join(__dirname, "../app"),
			outDir: dir,
			sources: [
				{
					workspace: folder.set.workspaces[0],
					fileLabel: "x",
					path: "../x.json",
					set: "folder",
					diagnostics: [],
				},
			],
		}),
	).rejects.toThrow("cannot be a file of an exported set");
	expect(existsSync(join(dir, "index.html"))).toBe(false);
});
