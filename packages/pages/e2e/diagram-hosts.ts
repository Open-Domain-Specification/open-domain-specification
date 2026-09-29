import type { Locator, Page } from "@playwright/test";
import {
	EXPORT_ORIGIN,
	openInteractiveDiagram,
	WORKSPACE_NAME,
} from "./helpers";

/**
 * What the keyboard specs share: opening a diagram in either host this suite
 * can reach (the viewer and the static export; the VS Code webview runs the
 * same bundle and is the lead's integration pass), arriving just before it,
 * and Tab-ing to a control by its accessible name.
 */

export type Host = "viewer" | "export";

/** The diagram whose caption contains `title`, on the page at `ref`, in either host. */
export async function openDiagram(
	page: Page,
	host: Host,
	title: string,
	ref: string,
): Promise<Locator> {
	if (host === "viewer") return openInteractiveDiagram(page, title, ref);
	await page.goto(`${EXPORT_ORIGIN}/${ref}`);
	await page.getByRole("link", { name: WORKSPACE_NAME }).click();
	const figure = page.locator("figure.diagram", { hasText: title });
	await figure.scrollIntoViewIfNeeded();
	return figure.locator(".svelte-flow");
}

/**
 * Puts the reader's place just before the diagram, the way arriving from the
 * text above it would, so that Tab is what carries them in.
 */
export async function arriveAt(flow: Locator): Promise<void> {
	await flow.evaluate((el) => {
		const figure = el.closest("figure") as HTMLElement;
		figure.tabIndex = -1;
		figure.focus();
	});
}

/** Presses Tab until the focused element has `name`, or gives up after `limit` presses. */
export async function tabTo(
	page: Page,
	name: string,
	limit = 40,
): Promise<number | undefined> {
	for (let presses = 1; presses <= limit; presses++) {
		await page.keyboard.press("Tab");
		const label = await page.evaluate(() =>
			document.activeElement?.getAttribute("aria-label"),
		);
		if (label === name) return presses;
	}
	return undefined;
}

/** Presses Tab until the focused element matches `selector`; true if it got there in `limit` presses. */
export async function tabUntil(
	page: Page,
	selector: string,
	limit = 60,
): Promise<boolean> {
	for (let presses = 0; presses < limit; presses++) {
		await page.keyboard.press("Tab");
		if (
			await page.evaluate((s) => document.activeElement?.matches(s), selector)
		)
			return true;
	}
	return false;
}
