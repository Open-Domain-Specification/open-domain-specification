import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Locator, Page } from "@playwright/test";

/** Shared fixtures: the example workspace, served to the viewer over an intercepted URL. */

export const PETSTORE_PATH = join(
	__dirname,
	"../../../models/petstore/.ods/petstore.json",
);
export const PETSTORE_JSON = readFileSync(PETSTORE_PATH, "utf8");
export const PETSTORE_SCHEMA = JSON.parse(PETSTORE_JSON);

/** Any absolute URL works: Playwright fulfils it from disk, so no server is needed. */
export const PETSTORE_URL = "https://workspaces.test/.ods/petstore.json";
export const WORKSPACE_NAME = "Swagger Petstore (v3)";
export const ORDER_REF = "#/boundedcontexts/sales_bc/aggregates/order";
export const EXPORT_ORIGIN = "http://localhost:4174";

/** The viewer with the workspace already requested through the `?url=` import. */
export const viewerAt = (hash = "") =>
	`/?url=${encodeURIComponent(PETSTORE_URL)}${hash}`;

/** Fulfils every request for the example workspace from the repository file. */
export async function servePetstore(page: Page): Promise<void> {
	await page.route("**/petstore.json", (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body: PETSTORE_JSON,
		}),
	);
}

/**
 * Serves the petstore, navigates to `ref` and switches the diagram whose
 * caption contains `title` into its interactive view, returning the
 * `.svelte-flow` locator once the toggle has been clicked.
 */
export async function openInteractiveDiagram(
	page: Page,
	title: string,
	ref = "",
): Promise<Locator> {
	await servePetstore(page);
	await page.goto(viewerAt(ref));
	const figure = page.locator("figure.diagram", { hasText: title });
	await figure.scrollIntoViewIfNeeded();
	await figure.getByRole("button", { name: "interactive" }).click();
	return figure.locator(".svelte-flow");
}
