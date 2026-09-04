import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Locator, Page } from "@playwright/test";

/**
 * Everything a page can tell us went wrong: console errors, uncaught page
 * errors, requests that never landed, and responses that came back non-2xx.
 * `file://` responses are left out -- they have no meaningful status.
 */
export function watchForProblems(page: Page): string[] {
	const problems: string[] = [];
	page.on("console", (m) => {
		if (m.type() === "error") problems.push(m.text());
	});
	page.on("pageerror", (e) => problems.push(e.message));
	page.on("requestfailed", (r) => problems.push(`failed ${r.url()}`));
	page.on("response", (r) => {
		if (r.url().startsWith("http") && !r.ok())
			problems.push(`${r.status()} ${r.url()}`);
	});
	return problems;
}

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

/** The petstore's generated docsify site, served as a plain folder of files. */
export const DOCSIFY_DIR = join(__dirname, "../../../models/petstore/docs");
export const DOCSIFY_ORIGIN = "http://localhost:4175";

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
 * Every workspace the repository ships. The bigger three are the stress
 * cases: a fit that holds on the petstore can still put a node under a panel
 * on a map with five times the contexts.
 */
export const REFERENCE_MODELS = [
	"petstore",
	"rivermart",
	"streamline",
	"northbank",
] as const;

export type ReferenceModel = (typeof REFERENCE_MODELS)[number];

const modelPath = (name: ReferenceModel) =>
	join(__dirname, `../../../models/${name}/.ods/${name}.json`);

/** Fulfils every request for that model's workspace from the repository file. */
export async function serveModel(
	page: Page,
	name: ReferenceModel,
): Promise<string> {
	const body = readFileSync(modelPath(name), "utf8");
	await page.route(`**/${name}.json`, (route) =>
		route.fulfill({
			status: 200,
			headers: {
				"content-type": "application/json",
				"access-control-allow-origin": "*",
			},
			body,
		}),
	);
	return `https://workspaces.test/.ods/${name}.json`;
}

/**
 * Serves the petstore, navigates to `ref` and scrolls to the diagram whose
 * caption contains `title`, returning its `.svelte-flow` locator.
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
	return figure.locator(".svelte-flow");
}
