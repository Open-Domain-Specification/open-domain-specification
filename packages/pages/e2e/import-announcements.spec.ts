import { expect, test } from "@playwright/test";
import { PETSTORE_SCHEMA, PETSTORE_URL, servePetstore } from "./helpers";

/**
 * The import screen speaks as well as shows. The loading state is announced
 * through a polite live region and each failure through an alert, and every
 * failure says what was wrong and what to do next. A live region only speaks
 * when its text changes after it is in the page, so each test takes the
 * region's handle before the text arrives and checks the same node carries it.
 *
 * Only the viewer has an import screen: the static export and the VS Code
 * webview are handed a workspace and never draw it.
 */

const status = "[role=status]";
const alert = "[role=alert]";

test("announces loading through a polite live region that was already in the page", async ({
	page,
}) => {
	let release!: () => void;
	const held = new Promise<void>((resolve) => {
		release = resolve;
	});
	await page.route("**/slow.json", async (route) => {
		await held;
		await route.fulfill({
			status: 200,
			headers: { "access-control-allow-origin": "*" },
			body: JSON.stringify(PETSTORE_SCHEMA),
		});
	});
	await page.goto("/");
	const region = await page.locator(status).elementHandle();
	expect(region).not.toBeNull();
	await expect(page.locator(status)).toHaveText("");

	await page.getByLabel("From a URL").fill("https://workspaces.test/slow.json");
	await page.getByRole("button", { name: "Load" }).click();

	await expect(page.locator(status)).toContainText("Loading");
	expect(await region?.evaluate((el) => el.isConnected)).toBe(true);
	expect(await page.locator(status).getAttribute("aria-live")).not.toBe(
		"assertive",
	);
	release();
	await expect(page.locator("main h1")).toContainText("Swagger Petstore");
});

test.describe("failures", () => {
	test("an unreachable url says it could not be reached and what to check", async ({
		page,
	}) => {
		await page.route("**/down.json", (route) => route.abort("failed"));
		await page.goto("/");
		const region = await page.locator(alert).elementHandle();
		expect(region).not.toBeNull();
		await expect(page.locator(alert)).toHaveText("");

		await page
			.getByLabel("From a URL")
			.fill("https://workspaces.test/down.json");
		await page.getByRole("button", { name: "Load" }).click();

		await expect(page.locator(alert)).toContainText(
			"Could not reach https://workspaces.test/down.json",
		);
		await expect(page.locator(alert)).toContainText("cross-origin");
		await expect(page.locator(alert)).toContainText("try again");
		expect(await region?.evaluate((el) => el.isConnected)).toBe(true);
		await expect(page.locator(status)).toHaveText("");
	});

	test("an http error names the status and the next step", async ({ page }) => {
		await page.route("**/missing.json", (route) =>
			route.fulfill({ status: 404 }),
		);
		await page.goto("/");
		await page
			.getByLabel("From a URL")
			.fill("https://workspaces.test/missing.json");
		await page.getByRole("button", { name: "Load" }).click();

		await expect(page.locator(alert)).toContainText("404");
		await expect(page.locator(alert)).toContainText(
			"Check the address is correct",
		);
	});

	test("a url that is not json says so and points at the .ods file", async ({
		page,
	}) => {
		await page.route("**/page.json", (route) =>
			route.fulfill({
				status: 200,
				headers: { "access-control-allow-origin": "*" },
				body: "<html>not json</html>",
			}),
		);
		await page.goto("/");
		await page
			.getByLabel("From a URL")
			.fill("https://workspaces.test/page.json");
		await page.getByRole("button", { name: "Load" }).click();

		await expect(page.locator(alert)).toContainText("is not valid JSON");
		await expect(page.locator(alert)).toContainText(".ods");
	});

	test("a file that is not json says so and what to choose instead", async ({
		page,
	}) => {
		await page.goto("/");
		await page.locator("#file").setInputFiles({
			name: "notes.json",
			mimeType: "application/json",
			buffer: Buffer.from("this is not json"),
		});

		await expect(page.locator(alert)).toContainText(
			"notes.json is not valid JSON",
		);
		await expect(page.locator(alert)).toContainText(".ods");
	});

	test("json that is not a workspace says so and what to choose instead", async ({
		page,
	}) => {
		await page.goto("/");
		await page.locator("#file").setInputFiles({
			name: "other.json",
			mimeType: "application/json",
			buffer: Buffer.from(JSON.stringify({ hello: "world" })),
		});

		await expect(page.locator(alert)).toContainText(
			"other.json is valid JSON but is not an Open Domain Specification workspace",
		);
		await expect(page.locator(alert)).toContainText("Choose");
		await expect(page.locator(alert)).not.toContainText(
			"Cannot read properties",
		);
	});

	test("the alert clears when a load begins again", async ({ page }) => {
		await servePetstore(page);
		await page.goto("/");
		await page.locator("#file").setInputFiles({
			name: "notes.json",
			mimeType: "application/json",
			buffer: Buffer.from("nope"),
		});
		await expect(page.locator(alert)).toContainText("notes.json");

		await page.getByLabel("From a URL").fill(PETSTORE_URL);
		await page.getByRole("button", { name: "Load" }).click();

		await expect(page.locator("main h1")).toContainText("Swagger Petstore");
	});
});
