import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { WorkspaceSet } from "@open-domain-specification/core";
import type { Page } from "@playwright/test";
import { modelHash } from "./helpers";

/**
 * NorthBank as it ships: twelve workspace files in `models/northbank/.ods`, one
 * per team, read as one set. This is what the viewer, the static export and the
 * extension show for NorthBank, and what every assertion about NorthBank as it
 * is must be made against. The frozen single-file original is
 * `northbank-monolith` in `helpers.ts`: a baseline for the one-workspace pages,
 * never a stand-in for this.
 */
export const NORTHBANK_DIR = join(__dirname, "../../../models/northbank/.ods");

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** The twelve file names, in the code-point order every reader lists them in. */
export const NORTHBANK_FILES = readdirSync(NORTHBANK_DIR)
	.filter((f) => f.endsWith(".json") && f !== "schema.json")
	.sort(byCodePoint);

/** The folder the viewer reads them from; any absolute URL works, since Playwright fulfils it from disk. */
export const NB_ROOT = "https://workspaces.test/northbank/.ods/";

export const northbankJson = (file: string) =>
	JSON.parse(readFileSync(join(NORTHBANK_DIR, file), "utf8"));

/** The set the files make, for facts a test reads from the model rather than from the page. */
export const northbankSet = () =>
	WorkspaceSet.fromSchemas(
		NORTHBANK_FILES.map((f) => [f, northbankJson(f)] as [string, never]),
	);

/** Fulfils each of the twelve files from the repository, with the cross-origin header a real host would send. */
export async function serveNorthbank(
	page: Page,
	files: string[] = NORTHBANK_FILES,
): Promise<void> {
	await page.route(`${NB_ROOT}*.json`, (route) => {
		const file = decodeURIComponent(
			route.request().url().slice(NB_ROOT.length),
		);
		return files.includes(file)
			? route.fulfill({
					status: 200,
					headers: {
						"content-type": "application/json",
						"access-control-allow-origin": "*",
					},
					body: readFileSync(join(NORTHBANK_DIR, file), "utf8"),
				})
			: route.fulfill({
					status: 404,
					headers: { "access-control-allow-origin": "*" },
				});
	});
}

/** The viewer's query for these files, each named as an entry (no one file reaches all twelve). */
export const northbankQuery = (files: string[] = NORTHBANK_FILES) =>
	`?${files.map((f) => `url=${encodeURIComponent(`${NB_ROOT}${f}`)}`).join("&")}`;

/**
 * The route of an element NorthBank's local ref names, qualified by the one
 * file that owns it. Throws when none does or when more than one does, which
 * would be a model that needed the qualification the route exists to give.
 */
export function northbankRoute(ref: string): string {
	const set = northbankSet();
	const owners = set.workspaces.filter(
		(w) =>
			w.getByRef(ref) ??
			w.findRelationship(ref) ??
			(ref === "#" ? w : undefined),
	);
	if (owners.length !== 1)
		throw new Error(`${ref} is in ${owners.length} NorthBank files, not one`);
	return `#/workspaces/${encodeFileSegment(owners[0].file as string)}${ref === "#" ? "" : ref.slice(1)}`;
}

/** A file name as one pointer segment of a route: the wire path, with a slash as `~1`. */
const encodeFileSegment = (file: string) =>
	file
		.split("/")
		.map((s) => encodeURIComponent(s))
		.join("~1");

/** Opens the viewer on the whole of NorthBank at `route` ("" is the set's own page). */
export async function openNorthbankSet(page: Page, route = ""): Promise<void> {
	await serveNorthbank(page);
	await page.goto(`/${northbankQuery()}${route ? modelHash(route) : ""}`);
	await page.locator("main h1").waitFor();
}
