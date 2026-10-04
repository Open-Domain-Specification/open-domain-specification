import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import { NORTHBANK_DIR, NORTHBANK_FILES } from "./northbank-set";
import { encodedFolder, type Folder } from "./set-fixtures";

/**
 * The viewer given files from the reader's own computer: several files picked
 * together, and a folder. A pick is complete by construction, so no notice says
 * otherwise; each file keeps its own path under the folder, raw, and the set
 * encodes it where a ref or a route needs it. The single-file input and its
 * keyboard, focus and reset behaviour are held by `import-screen.spec.ts` and
 * are not changed here.
 */
const h1 = (page: Page) => page.locator("main h1");
const rows = (page: Page) =>
	page.locator("#workspaces tbody tr td:nth-child(2) code");

let dir: string;
let folder: Folder;
test.beforeAll(async () => {
	dir = await mkdtemp(join(tmpdir(), "ods-upload-"));
	folder = encodedFolder();
	// A folder as a reader keeps it: the .ods folder, with the schema beside the files.
	const root = join(dir, ".ods");
	for (const [file, schema] of folder.files) {
		const target = join(root, ...file.split("/"));
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, JSON.stringify(schema), "utf8");
	}
	await writeFile(join(root, "schema.json"), "{}", "utf8");
});
test.afterAll(async () => {
	await rm(dir, { recursive: true, force: true });
});

test("several files picked together open as one complete set, with focus on the heading and nothing about files out of view", async ({
	page,
}) => {
	await page.goto("/");
	await page
		.locator("#files")
		.setInputFiles(NORTHBANK_FILES.map((f) => join(NORTHBANK_DIR, f)));
	await expect(h1(page)).toContainText("12 files");
	await expect(h1(page)).toBeFocused();
	expect(await rows(page).allTextContents()).toEqual(NORTHBANK_FILES);
	await expect(page.locator("[data-notice]")).toHaveCount(0);
	// The 19 contexts of the twelve files, each kept apart.
	await expect(page.locator(".context-node")).toHaveCount(19);
});

test("a folder picked from the computer keeps each file's path under it, drops the folder's own schema and says so", async ({
	page,
}) => {
	await page.goto("/");
	await page.locator("#folder").setInputFiles(join(dir, ".ods"));
	await expect(h1(page)).toContainText("4 files");
	// Raw names, code-point order; the schema beside them is not a workspace.
	expect(await rows(page).allTextContents()).toEqual([
		"a#%.json",
		"a%41.json",
		"my team.json",
		"ü/é.json",
	]);
	await expect(page.locator('[data-notice="incomplete"]')).toContainText(
		"1 file was not a workspace file and was left out: schema.json.",
	);
});

test("opens each file of a folder with a space, #, % or accented letter in its name at one encoded segment, and links across them to the owner", async ({
	page,
}) => {
	await page.goto("/");
	await page.locator("#folder").setInputFiles(join(dir, ".ods"));
	await expect(h1(page)).toContainText("4 files");
	await page.getByRole("link", { name: "Team Hash" }).first().click();
	await expect(page).toHaveURL(/#\/workspaces\/a%2523%2525\.json$/);
	await expect(h1(page)).toContainText("Team Hash");

	// Team Hash's Account consumes Team Space's Post: the link goes to the file named "my team.json".
	const account = folder.teams[0].account;
	const post = folder.teams[1].post;
	await page.goto(
		`${page.url().split("#")[0]}#/workspaces/a%2523%2525.json${account.ref.slice(1)}`,
	);
	await expect(h1(page)).toContainText("Account");
	const target = `#/workspaces/my%20team.json${post.ref.slice(1)}`;
	const link = page.locator(`main a.ref[data-ref="${target}"]`).first();
	await expect(link).toBeVisible();
	await link.click();
	await expect(page).toHaveURL(
		new RegExp(
			`#/workspaces/my%2520team\\.json${post.ref.slice(1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
		),
	);
	await expect(page.locator(".crumbs")).toContainText("Team Space");

	// The accented file in a nested folder is one segment with the slash as ~1.
	await page.getByRole("link", { name: "All workspaces" }).click();
	await page.getByRole("link", { name: "Team Accent" }).first().click();
	await expect(page).toHaveURL(/#\/workspaces\/%25C3%25BC~1%25C3%25A9\.json$/);
	await expect(h1(page)).toContainText("Team Accent");
});

test("a pick that holds nothing to read says so and empties the input so the same pick counts again", async ({
	page,
}) => {
	await page.goto("/");
	const notes = {
		name: "notes.txt",
		mimeType: "text/plain",
		buffer: Buffer.from("not a workspace"),
	};
	await page
		.locator("#files")
		.setInputFiles([notes, { ...notes, name: "more.md" }]);
	await expect(page.getByRole("alert")).toContainText(
		"Those files include no workspace .json file.",
	);
	await expect(page.locator(".many-chosen").first()).toHaveText("2 files");
	expect(
		await page
			.locator("#files")
			.evaluate((el: HTMLInputElement) => el.files?.length),
	).toBe(0);
});

test("keeps the single-file tab order and adds the new controls after it, each a native input with a visible ring", async ({
	page,
}) => {
	await page.goto("/");
	await page.keyboard.press("Tab");
	await expect(page.getByLabel("From a URL")).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(
		page.getByRole("button", { name: "Load", exact: true }),
	).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(page.locator("#file")).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(page.locator("#files")).toBeFocused();
	const ring = await page
		.locator(".many-face")
		.first()
		.evaluate((el) => getComputedStyle(el).outlineStyle);
	expect(ring).not.toBe("none");
	await page.keyboard.press("Tab");
	await expect(page.locator("#folder")).toBeFocused();
	await page.keyboard.press("Tab");
	await expect(
		page.locator("summary", { hasText: "Several files by URL" }),
	).toBeFocused();
});

test("asks the native picker for several files from Space and Enter, and for a folder, and the folder's own chooser", async ({
	page,
}) => {
	await page.goto("/");
	await page.locator("#files").focus();
	for (const key of ["Space", "Enter"]) {
		const [chooser] = await Promise.all([
			page.waitForEvent("filechooser", { timeout: 5000 }),
			page.keyboard.press(key),
		]);
		expect(chooser.isMultiple()).toBe(true);
		await chooser.setFiles([]);
		await page.locator("#files").focus();
	}
	await page.locator("#folder").focus();
	const [chooser] = await Promise.all([
		page.waitForEvent("filechooser", { timeout: 5000 }),
		page.keyboard.press("Space"),
	]);
	// The browser's own folder chooser: the input that asked for it names a directory.
	expect(
		await chooser.element().getAttribute("webkitdirectory"),
	).not.toBeNull();
	await expect(page.getByRole("alert")).toHaveText("");
});
