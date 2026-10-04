import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { NORTHBANK_FILES } from "./northbank-set";
import { serveDir } from "./reading-hosts";

/**
 * The viewer as `apps/ods-ui` builds it: the pages bundle in `dist/`, with the
 * reference models beside it as the examples the import screen offers. NorthBank
 * is twelve files, so its example is all twelve: the build copies every
 * workspace file of a model and never the first one standing in for the rest.
 */
const UI = join(__dirname, "../../../apps/ods-ui");
const DIST = join(UI, "dist");

let stop: () => Promise<void>;
let origin: string;
test.beforeAll(async () => {
	execFileSync(process.execPath, ["scripts/build.mjs"], {
		cwd: UI,
		stdio: "pipe",
	});
	const served = await serveDir(DIST);
	stop = served.stop;
	origin = served.origin;
});
test.afterAll(async () => {
	await stop();
});

test("the build copies every workspace file of NorthBank into its example folder, and the schema with none", () => {
	const copied = readdirSync(join(DIST, "examples", "northbank")).sort();
	expect(copied).toEqual(NORTHBANK_FILES);
	expect(copied).toHaveLength(12);
	// No first-file stand-in beside the folder.
	expect(readdirSync(join(DIST, "examples")).sort()).toEqual([
		"northbank",
		"petstore.json",
		"rivermart.json",
		"streamline.json",
	]);
});

test("the example cards name NorthBank once, with its files listed as entries and the folder they share", async () => {
	const html = readFileSync(join(DIST, "index.html"), "utf8");
	const boot = JSON.parse(
		(html.match(/window\.__ODS__=(.*?);<\/script>/s)?.[1] as string).replace(
			/\\u003c/g,
			"<",
		),
	) as {
		examples: Array<{
			name: string;
			url: string;
			urls?: string[];
			root?: string;
		}>;
	};
	const bank = boot.examples.filter((e) => e.name === "NorthBank");
	expect(bank).toHaveLength(1);
	expect(bank[0].urls).toEqual(
		NORTHBANK_FILES.map((f) => `./examples/northbank/${f}`),
	);
	expect(bank[0].root).toBe("./examples/northbank/");
	expect(bank[0].url).toBe(bank[0].urls?.[0]);
	expect(boot.examples.map((e) => e.name).sort()).toEqual(
		["NorthBank", "RiverMart", "StreamLine", "Swagger Petstore (v3)"].sort(),
	);
});

test("choosing the NorthBank example opens all twelve files as one set", async ({
	page,
}) => {
	await page.goto(origin);
	await page.getByRole("button", { name: /NorthBank/ }).click();
	await expect(page.locator("main h1")).toContainText("12 files");
	expect(
		await page
			.locator("#workspaces tbody tr td:nth-child(2) code")
			.allTextContents(),
	).toEqual(NORTHBANK_FILES);
	await expect(page.locator(".context-node")).toHaveCount(19);
	await expect(page.locator('[data-notice="incomplete"]')).toContainText(
		"12 workspaces reached from the addresses given",
	);
	// Focus lands on the heading: the reader asked for this import.
	await expect(page.locator("main h1")).toBeFocused();
});

test("choosing a one-file example opens it as the workspace it is", async ({
	page,
}) => {
	await page.goto(origin);
	await page.getByRole("button", { name: /Swagger Petstore/ }).click();
	await expect(page.locator("main h1")).toContainText("Swagger Petstore");
	await expect(page.locator("nav.tree")).toBeVisible();
	await expect(page.locator("[data-notice]")).toHaveCount(0);
});
