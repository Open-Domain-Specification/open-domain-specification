import { expect, type Frame, test } from "@playwright/test";
import {
	emulateReducedMotion,
	type Host,
	launchVSCode,
	openPageByKeyboard,
	webviewContentFrame,
} from "./host";

const active = (frame: Frame) =>
	frame.evaluate(() => {
		const el = document.activeElement;
		return {
			tag: el?.tagName ?? null,
			text: (el?.textContent ?? "").trim(),
			href: el?.getAttribute("href") ?? null,
		};
	});

/** Presses Tab until the focused element's text matches, else fails with the trail. */
async function tabTo(host: Host, frame: Frame, linkText: string) {
	const trail: string[] = [];
	for (let i = 0; i < 60; i++) {
		await host.window.keyboard.press("Tab");
		const now = await active(frame);
		trail.push(`${now.tag}:${now.text.slice(0, 30)}`);
		if (now.tag === "A" && now.text === linkText) return now;
	}
	throw new Error(
		`Tab never reached link "${linkText}"; trail: ${trail.join(" | ")}`,
	);
}

test.describe("real keys in the real VS Code webview", () => {
	let host: Host;
	test.beforeEach(async () => {
		host = await launchVSCode({
			folder: "src/test/fixtures/cross-surface",
		});
	});
	test.afterEach(async () => {
		await host.close();
	});

	test("Tab reaches a link in the page and Enter follows it", async () => {
		await openPageByKeyboard(host.window, "Cross surface");
		const frame = await webviewContentFrame(host.window);
		await expect(frame.locator("h1").first()).toContainText("Cross surface");

		// The webview has focus after the quick pick closes; Tab moves within it.
		const focused = await tabTo(host, frame, "Trade");
		console.log("focused", JSON.stringify(focused));
		await host.window.keyboard.press("Enter");
		await expect(frame.locator("h1").first()).toContainText("Trade");
		await expect(frame.locator("h1").first()).not.toContainText(
			"Cross surface",
		);
	});

	test("reduced motion emulated on the window reaches the webview", async () => {
		const reduced = (frame: Frame) =>
			frame.evaluate(
				() => matchMedia("(prefers-reduced-motion: reduce)").matches,
			);
		await emulateReducedMotion(host.window, "reduce");
		await openPageByKeyboard(host.window, "Cross surface");
		const frame = await webviewContentFrame(host.window);
		expect(await reduced(frame)).toBe(true);
		await emulateReducedMotion(host.window, "no-preference");
		expect(await reduced(frame)).toBe(false);
	});
});
