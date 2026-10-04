import { expect, type Page, test } from "@playwright/test";
import { PETSTORE_PATH, servePetstore, WORKSPACE_NAME } from "./helpers";

/**
 * The import screen's file control and load error, in the four cells a reader
 * can be in: 1300 and 390 px wide, light and dark. The native file input is
 * kept (it is the focus target, the label's control and what opens the OS
 * picker) but drawn as a themed "Choose a file…" button, with the chosen name
 * beside it; a load error is a Problems row.
 *
 * What a test cannot do is drive the OS dialog: `filechooser` proves the
 * native picker was asked for, `setInputFiles` stands in for the choice, and
 * the real browser's refusal to fire `change` for the same file twice is
 * accounted for by asserting the input's selection is cleared once read.
 *
 * Expected colours are the stock Light Modern and Dark Modern values
 * (extensions/theme-defaults/themes/{light,dark}_modern.json in VS Code
 * 1.139.1): button.background and foreground, descriptionForeground, and
 * editorError.foreground from the default Light+/Dark+ base.
 */

const CELLS = [
	{
		width: 1300,
		scheme: "light",
		button: "rgb(0, 95, 184)",
		label: "rgb(255, 255, 255)",
		fg: "rgb(59, 59, 59)",
		muted: "rgb(97, 97, 97)",
		error: "rgb(229, 20, 0)",
	},
	{
		width: 1300,
		scheme: "dark",
		button: "rgb(0, 120, 212)",
		label: "rgb(255, 255, 255)",
		fg: "rgb(204, 204, 204)",
		muted: "rgb(157, 157, 157)",
		error: "rgb(241, 76, 76)",
	},
	{
		width: 390,
		scheme: "light",
		button: "rgb(0, 95, 184)",
		label: "rgb(255, 255, 255)",
		fg: "rgb(59, 59, 59)",
		muted: "rgb(97, 97, 97)",
		error: "rgb(229, 20, 0)",
	},
	{
		width: 390,
		scheme: "dark",
		button: "rgb(0, 120, 212)",
		label: "rgb(255, 255, 255)",
		fg: "rgb(204, 204, 204)",
		muted: "rgb(157, 157, 157)",
		error: "rgb(241, 76, 76)",
	},
] as const;

const NOT_JSON = {
	name: "notes.json",
	mimeType: "application/json",
	buffer: Buffer.from("this is not json"),
};
const MISSING = "https://workspaces.test/missing.json";

const open = async (page: Page, cell: (typeof CELLS)[number]) => {
	await page.setViewportSize({ width: cell.width, height: 900 });
	await page.emulateMedia({ colorScheme: cell.scheme });
	await servePetstore(page);
	await page.goto("/");
	await expect(
		page.getByRole("heading", { name: "Open a workspace" }),
	).toBeVisible();
};

const css = (page: Page, selector: string, props: string[]) =>
	page.locator(selector).evaluate((el, names) => {
		const style = getComputedStyle(el);
		return Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n)]));
	}, props);

for (const cell of CELLS) {
	test.describe(`${cell.width}px ${cell.scheme}`, () => {
		test.beforeEach(async ({ page }) => open(page, cell));

		test("draws Choose a file… as a button in the VS Code button colours and the interface font, over a hidden native input", async ({
			page,
		}) => {
			const face = page.getByText("Choose a file…", { exact: true });
			await expect(face).toBeVisible();
			expect(await css(page, ".face", ["background-color", "color"])).toEqual({
				"background-color": cell.button,
				color: cell.label,
			});
			// The caption is interface text: it must match the URL field and Load.
			const fonts = await page.evaluate(() => {
				const family = (el: Element | null) =>
					el ? getComputedStyle(el).fontFamily : null;
				return {
					face: family(document.querySelector(".face")),
					url: family(document.querySelector("#url")),
					load: family(
						[...document.querySelectorAll("button")].find(
							(b) => b.textContent?.trim() === "Load",
						) ?? null,
					),
				};
			});
			expect(fonts.load).toBeTruthy();
			expect(fonts.url).toBe(fonts.load);
			expect(fonts.face).toBe(fonts.load);
			const native = page.getByLabel("From a file");
			await expect(native).toHaveAttribute("type", "file");
			await expect(native).toHaveAttribute("accept", ".json,application/json");
			await expect(native).not.toHaveAttribute("multiple");
			// Invisible, yet the very thing a pointer lands on over the face.
			expect((await css(page, "#file", ["opacity"])).opacity).toBe("0");
			const hit = await page.evaluate(() => {
				const box = document.querySelector(".face")?.getBoundingClientRect();
				if (!box) return null;
				return document.elementFromPoint(
					box.x + box.width / 2,
					box.y + box.height / 2,
				)?.id;
			});
			expect(hit).toBe("file");
		});

		test("keeps the tab order url, Load, file and rings the face when the native input has focus", async ({
			page,
		}) => {
			await page.keyboard.press("Tab");
			await expect(page.getByLabel("From a URL")).toBeFocused();
			await page.keyboard.press("Tab");
			await expect(page.getByRole("button", { name: "Load" })).toBeFocused();
			await page.keyboard.press("Tab");
			await expect(page.locator("#file")).toBeFocused();
			const ring = await css(page, ".face", [
				"outline-style",
				"outline-width",
				"outline-color",
			]);
			expect(ring["outline-style"]).not.toBe("none");
			expect(Number.parseFloat(ring["outline-width"])).toBeGreaterThan(0);
			expect(ring["outline-color"]).toBe(cell.button);
		});

		test("asks the native picker for one file from Space, Enter, the face and the label", async ({
			page,
		}) => {
			await page.locator("#file").focus();
			const ways = {
				Space: () => page.keyboard.press("Space"),
				Enter: () => page.keyboard.press("Enter"),
				// The native input lies over the face, so a pointer at the face lands on it.
				"a pointer click on the face": async () => {
					const box = await page.locator(".face").boundingBox();
					if (!box) throw new Error("the face has no box");
					await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
				},
				"a click on the label": () =>
					page.getByText("From a file", { exact: true }).click(),
			};
			for (const [way, open] of Object.entries(ways))
				await test.step(way, async () => {
					const [chooser] = await Promise.all([
						page.waitForEvent("filechooser", { timeout: 5_000 }),
						open(),
					]);
					expect(chooser.isMultiple()).toBe(false);
					await chooser.setFiles([]);
					await page.locator("#file").focus();
				});
			await expect(page.locator("[role=alert]")).toHaveText("");
		});

		test("names a failed file in the secondary colour, retries it, then loads a valid one with focus on the heading", async ({
			page,
		}) => {
			const chosen = page.locator(".chosen");
			await expect(chosen).toHaveText("");
			await page.locator("#file").setInputFiles(NOT_JSON);
			await expect(page.locator("[role=alert]")).toContainText(
				"notes.json is not valid JSON",
			);
			await expect(chosen).toHaveText("notes.json");
			expect((await css(page, ".chosen", ["color"])).color).toBe(cell.muted);
			// A browser fires no change for the same file twice unless the
			// input was emptied: the selection is cleared once it has been read.
			expect(
				await page
					.locator("#file")
					.evaluate((el: HTMLInputElement) => el.files?.length),
			).toBe(0);

			await page.locator("#file").setInputFiles([]);
			await expect(page.locator("[role=alert]")).toContainText(
				"notes.json is not valid JSON",
			);
			await expect(chosen).toHaveText("notes.json");

			await page.locator("#file").setInputFiles(NOT_JSON);
			await expect(page.locator("[role=alert]")).toContainText(
				"notes.json is not valid JSON",
			);

			await page.locator("#file").setInputFiles(PETSTORE_PATH);
			await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
			expect(
				await page.evaluate(() => document.activeElement?.matches("main h1")),
			).toBe(true);
		});

		test("draws a load error as a Problems row: error icon in the gutter, message and plain URL in the foreground", async ({
			page,
		}) => {
			await page.route("**/missing.json", (route) =>
				route.fulfill({ status: 404 }),
			);
			await page.getByLabel("From a URL").fill(MISSING);
			await page.getByRole("button", { name: "Load" }).click();

			const alert = page.getByRole("alert");
			await expect(alert).toContainText("404");
			await expect(alert).toContainText(MISSING);
			const icon = alert.locator("i.codicon-error");
			await expect(icon).toHaveAttribute("aria-hidden", "true");
			expect(
				(await css(page, "[role=alert] i.codicon-error", ["color"])).color,
			).toBe(cell.error);
			const message = alert.locator(".message");
			expect((await css(page, "[role=alert] .message", ["color"])).color).toBe(
				cell.fg,
			);
			await expect(alert.locator("a")).toHaveCount(0);
			const row = await css(page, "[role=alert] p", [
				"display",
				"line-height",
				"grid-template-columns",
			]);
			expect(row.display).toBe("grid");
			expect(row["line-height"]).toBe("22px");
			expect(row["grid-template-columns"]).toMatch(/^16px /);
			const [iconBox, messageBox] = await Promise.all([
				icon.boundingBox(),
				message.boundingBox(),
			]);
			expect(iconBox?.width).toBe(16);
			expect(messageBox?.x).toBeGreaterThan((iconBox?.x ?? 0) + 16);
		});

		test("fits the file control and a long error inside the page without sideways scroll", async ({
			page,
		}) => {
			await page.locator("#file").setInputFiles({
				...NOT_JSON,
				name: `${"a-very-long-file-name-".repeat(6)}.json`,
			});
			await expect(page.locator("[role=alert] .message")).toBeVisible();
			await page.route("**/missing.json", (route) =>
				route.fulfill({ status: 404 }),
			);
			await page.getByLabel("From a URL").fill(MISSING);
			await page.getByRole("button", { name: "Load" }).click();
			await expect(page.locator("[role=alert] .message")).toContainText("404");

			const fit = await page.evaluate(() => {
				const main = document.querySelector("main")?.getBoundingClientRect();
				const inside = (sel: string) => {
					const box = document.querySelector(sel)?.getBoundingClientRect();
					return (
						!!box &&
						!!main &&
						box.left >= main.left - 0.5 &&
						box.right <= main.right + 0.5
					);
				};
				const root = document.documentElement;
				return {
					scrolls: root.scrollWidth > root.clientWidth,
					face: inside(".face"),
					chosen: inside(".chosen"),
					alert: inside("[role=alert] p"),
				};
			});
			expect(fit).toEqual({
				scrolls: false,
				face: true,
				chosen: true,
				alert: true,
			});
		});
	});
}
