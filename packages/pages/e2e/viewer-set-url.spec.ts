import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { expect, type Page, test } from "@playwright/test";
import { modelHash, watchForProblems } from "./helpers";
import {
	NB_ROOT,
	NORTHBANK_FILES,
	northbankQuery,
	serveNorthbank,
} from "./northbank-set";
import { encodedFolder, nestedFolder } from "./set-fixtures";

/**
 * The viewer given addresses rather than files: which files it reads, in what
 * order, where it stops, and what it says when a file cannot be read. Nothing
 * here is a manifest: the addresses and the root are told to the viewer and
 * are never part of the model.
 */
const ROOT = "https://sets.test/p/.ods/";
const query = (urls: string[], root?: string) =>
	`?${urls.map((u) => `url=${encodeURIComponent(u)}`).join("&")}${root ? `&root=${encodeURIComponent(root)}` : ""}`;

const CORS = { "access-control-allow-origin": "*" };
const json = (body: unknown, headers: Record<string, string> = CORS) => ({
	status: 200,
	headers: { "content-type": "application/json", ...headers },
	body: JSON.stringify(body),
});

/** A workspace whose contexts serve subdomains of other files, named by file-qualified $refs. */
const naming = (name: string, ...files: string[]) => ({
	name,
	boundedcontexts: Object.fromEntries(
		files.map((f, i) => [
			`c${i}`,
			{
				name: `C${i}`,
				description: "",
				subdomains: [{ $ref: `${f}#/domains/d/subdomains/s` }],
			},
		]),
	),
});

/** Answers each path under ROOT from `files`, 404 for the rest, and counts what was asked. */
async function serveFolder(
	page: Page,
	files: Record<
		string,
		unknown | ((route: import("@playwright/test").Route) => Promise<void>)
	>,
) {
	const asked: string[] = [];
	await page.route(`${ROOT}**`, async (route) => {
		const path = decodeURIComponent(route.request().url().slice(ROOT.length));
		asked.push(path);
		const found = files[path];
		if (typeof found === "function") return found(route);
		if (found === undefined)
			return route.fulfill({ status: 404, headers: CORS });
		return route.fulfill(json(found));
	});
	return asked;
}

const h1 = (page: Page) => page.locator("main h1");
const rows = (page: Page) =>
	page.locator("#workspaces tbody tr td:nth-child(2) code");
const notices = (page: Page) => page.locator('[data-notice="incomplete"]');
// Notices are above the page, not inside it, and are read as a group.
const noticeText = async (page: Page) =>
	(await notices(page).allTextContents()).join("\n");
const expectNotice = (page: Page, text: string) =>
	expect.poll(() => noticeText(page)).toContain(text);

test("one entry reaches the files it names, and says the others are out of view", async ({
	page,
}) => {
	const problems = watchForProblems(page);
	await serveNorthbank(page);
	await page.goto(`/${query([`${NB_ROOT}channels.json`])}`);
	await expect(h1(page)).toContainText("Workspaces");
	// Channels names Customer Platform, Accounts, Core Banking, ... but nothing it
	// reaches names it back, so a reader at one entry sees eleven of the twelve.
	await expect(h1(page)).toContainText("11 files");
	const seen = await rows(page).allTextContents();
	expect(seen).toHaveLength(11);
	const missing = NORTHBANK_FILES.filter((f) => !seen.includes(f));
	expect(missing).toHaveLength(1);
	await expect(notices(page)).toContainText(
		"11 workspaces reached from the addresses given",
	);
	await expect(notices(page)).toContainText("not discoverable by URL");
	// A browser console error from the app would be a defect; a 404 is not expected here.
	expect(problems).toEqual([]);
	// Naming the twelfth as well makes it twelve.
	await page.goto(`/${northbankQuery()}`);
	await expect(h1(page)).toContainText("12 files");
	expect(await rows(page).allTextContents()).toEqual(NORTHBANK_FILES);
	await expect(notices(page)).toContainText("12 workspaces reached");
});

test("reads sibling folders through .. inside an explicit root, ends the cycle, and fetches each file once", async ({
	page,
}) => {
	const { files, teams } = nestedFolder();
	const asked = await serveFolder(page, Object.fromEntries(files));
	await page.goto(`/${query([`${ROOT}a/team.json`], ROOT)}`);
	await expect(h1(page)).toContainText("2 files");
	expect(await rows(page).allTextContents()).toEqual([
		"a/team.json",
		"b/team.json",
	]);
	expect(asked.sort()).toEqual(["a/team.json", "b/team.json"]);
	// The nested file is one pointer segment of the route, and each team's Ledger is its own page.
	const b = teams[1].ledger.ref;
	await page.goto(
		`/${query([`${ROOT}a/team.json`], ROOT)}${modelHash(`#/workspaces/b~1team.json${b.slice(1)}`)}`,
	);
	await expect(page.locator(".crumbs")).toContainText("Team B");
	await expect(h1(page)).toContainText("Ledger");
	await page.goto(
		`/${query([`${ROOT}a/team.json`], ROOT)}${modelHash(`#/workspaces/a~1team.json${b.slice(1)}`)}`,
	);
	await expect(page.locator(".crumbs")).toContainText("Team A");
});

test("takes the folder the entries share when no root is given, and reads names that need encoding at their encoded addresses", async ({
	page,
}) => {
	const { files } = encodedFolder();
	const asked = await serveFolder(page, Object.fromEntries(files));
	await page.goto(`/${query([`${ROOT}a%23%25.json`])}`);
	await expect(h1(page)).toContainText("4 files");
	// Raw names on the page, whatever they were on the wire; code-point order.
	expect(await rows(page).allTextContents()).toEqual([
		"a#%.json",
		"a%41.json",
		"my team.json",
		"ü/é.json",
	]);
	expect(asked.sort()).toEqual([
		"a#%.json",
		"a%41.json",
		"my team.json",
		"ü/é.json",
	]);
	// The file with # and % in its name opens at one encoded segment.
	await page.getByRole("link", { name: "Team Hash" }).first().click();
	await expect(page).toHaveURL(/#\/workspaces\/a%2523%2525\.json$/);
	await expect(h1(page)).toContainText("Team Hash");
});

test("reports a dependency that answers 404 and still shows what loaded", async ({
	page,
}) => {
	await serveFolder(page, { "a.json": naming("A", "gone.json") });
	await page.goto(`/${query([`${ROOT}a.json`])}`);
	await expectNotice(
		page,
		`gone.json (named by a.json): The server answered 404 for ${ROOT}gone.json.`,
	);
	// The file that named it is still there, with the unresolved ref reported as its own.
	await expect(h1(page)).toContainText("A");
	await expect(page.locator("main")).toContainText("unresolved-ref");
	await expect(rows(page)).toHaveCount(0);
});

test("reports a dependency the host will not share cross-origin, naming CORS as what to check", async ({
	page,
}) => {
	// A real server on another origin: the browser's own CORS check is what refuses b.json.
	const server = createServer((req, res) => {
		const body = req.url?.endsWith("a.json")
			? JSON.stringify(naming("A", "b.json"))
			: JSON.stringify({ name: "B" });
		res.writeHead(200, {
			"content-type": "application/json",
			// Only a.json says it may be read from the viewer's origin.
			...(req.url?.endsWith("a.json") ? CORS : {}),
		});
		res.end(body);
	});
	await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
	try {
		const { port } = server.address() as AddressInfo;
		await page.goto(`/${query([`http://127.0.0.1:${port}/a.json`])}`);
		await expectNotice(page, "allows cross-origin requests");
		await expectNotice(page, "b.json (named by a.json)");
		await expect(h1(page)).toContainText("A");
		await expect(page.locator("main")).toContainText("unresolved-ref");
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
});

test("reports a dependency that is not JSON, and one that is not a workspace", async ({
	page,
}) => {
	await serveFolder(page, {
		"a.json": naming("A", "page.json", "wrong.json"),
		"page.json": async (route) =>
			route.fulfill({
				status: 200,
				headers: { "content-type": "text/html", ...CORS },
				body: "<!doctype html><title>404</title>",
			}),
		"wrong.json": [1, 2, 3],
	});
	await page.goto(`/${query([`${ROOT}a.json`])}`);
	await expectNotice(page, "page.json (named by a.json)");
	await expectNotice(page, "is not valid JSON");
	// A response that is JSON but no workspace is read and then refused with its own message.
	await expect(page.locator('[data-notice="excluded"]')).toContainText(
		"wrong.json is not a workspace file",
	);
	await expect(h1(page)).toContainText("A");
});

test("does not fetch a path that leaves the root, and says which file wrote it", async ({
	page,
}) => {
	const asked = await serveFolder(page, {
		"n/a.json": naming("A", "../../x.json", "%2E%2E/%2E%2E/y.json"),
	});
	await page.goto(`/${query([`${ROOT}n/a.json`], ROOT)}`);
	await expectNotice(page, "n/a.json refers to");
	await expectNotice(page, "escapes-root");
	expect(asked).toEqual(["n/a.json"]);
});

test("stops at 64 files, with at most four requests in flight, and says what was left", async ({
	page,
}) => {
	const names = Array.from(
		{ length: 99 },
		(_, i) => `f${String(i).padStart(2, "0")}.json`,
	);
	const files: Record<string, unknown> = {
		"entry.json": naming("Entry", ...names),
	};
	let inFlight = 0;
	let peak = 0;
	let total = 0;
	for (const n of names)
		files[n] = async (route: import("@playwright/test").Route) => {
			total += 1;
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			await new Promise((r) => setTimeout(r, 40));
			inFlight -= 1;
			await route.fulfill(json({ name: n }));
		};
	await serveFolder(page, files);
	await page.goto(`/${query([`${ROOT}entry.json`])}`);
	await expect(h1(page)).toContainText("64 files");
	await expect(page.locator("main")).toContainText(
		"Stopped at 64 workspace files: 36 more files were named and not fetched",
	);
	// 63 siblings were fetched besides the entry; never more than four at once.
	expect(total).toBe(63);
	expect(peak).toBe(4);
});

test("refuses a file over 2 MiB, by its size, without reading it all", async ({
	page,
}) => {
	const big = JSON.stringify({
		name: "Big",
		description: "x".repeat(2 * 1024 * 1024 + 10),
	});
	await serveFolder(page, {
		"a.json": naming("A", "big.json", "ok.json"),
		"big.json": async (route) =>
			route.fulfill({
				status: 200,
				headers: { "content-type": "application/json", ...CORS },
				body: big,
			}),
		"ok.json": { name: "Fine" },
	});
	await page.goto(`/${query([`${ROOT}a.json`])}`);
	await expect(page.locator("main")).toContainText(
		"big.json (named by a.json)",
	);
	await expect(page.locator("main")).toContainText("larger than 2 MiB");
	await expect(rows(page)).toHaveText(["a.json", "ok.json"]);
});

test("says every file failed when none could be read, in the words a single file always had", async ({
	page,
}) => {
	await serveFolder(page, {});
	await page.goto(`/${query([`${ROOT}a.json`, `${ROOT}b.json`])}`);
	await expect(page.getByRole("alert")).toContainText(
		`The server answered 404 for ${ROOT}a.json.`,
	);
	await expect(
		page.getByRole("heading", { name: "Open a workspace" }),
	).toBeVisible();
});

test("keeps a single file with no ref to another as the workspace alone it always was", async ({
	page,
}) => {
	await serveFolder(page, { "solo.json": { name: "Solo" } });
	await page.goto(`/${query([`${ROOT}solo.json`])}`);
	await expect(h1(page)).toContainText("Solo");
	await expect(page.locator("nav.tree")).toBeVisible();
	await expect(page.locator("[data-notice]")).toHaveCount(0);
	await expect(page.getByRole("link", { name: "All workspaces" })).toHaveCount(
		0,
	);
});

test("opens the form with what the address gave it, and loads several addresses from the form", async ({
	page,
}) => {
	const { files } = nestedFolder();
	await serveFolder(page, Object.fromEntries(files));
	await page.goto(
		`/${query([`${ROOT}a/team.json`, `${ROOT}b/team.json`], ROOT)}`,
	);
	await expect(h1(page)).toContainText("2 files");
	// Going back to the import screen is a reload of the bare viewer.
	await page.goto("/");
	await page.locator("summary", { hasText: "Several files by URL" }).click();
	await page
		.getByLabel("Workspace file URLs")
		.fill(`${ROOT}b/team.json\n${ROOT}a/team.json`);
	await page.getByLabel("Folder they are all under").fill(ROOT);
	await page.getByRole("button", { name: "Read addresses" }).click();
	await expect(h1(page)).toContainText("2 files");
	expect(await rows(page).allTextContents()).toEqual([
		"a/team.json",
		"b/team.json",
	]);
});
