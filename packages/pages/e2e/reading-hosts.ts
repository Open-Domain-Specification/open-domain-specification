import { type ChildProcess, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Workspace } from "@open-domain-specification/core";
import type { Page } from "@playwright/test";
import { exportSite } from "../dist/site.js";
import { modelHash, serveModel } from "./helpers";
import { northbankQuery, northbankSet, serveNorthbank } from "./northbank-set";

/**
 * The three hosts a reader meets outside VS Code, for the specs that need a
 * workspace big enough to have a long tree and every diagram family: the
 * viewer, and NorthBank's own static export read over HTTP and from `file://`.
 * The export is a single workspace, so it opens straight on the model (the
 * suite's shared export holds two behind a picker, and a picker is not a fresh
 * page load). Each is opened without taking focus, so the next real Tab is the
 * reader's first.
 */

export type ReadingHost = "viewer" | "export-http" | "export-file";
export const READING_HOSTS: ReadingHost[] = [
	"viewer",
	"export-http",
	"export-file",
];

/**
 * What an export holds: `monolith` is the frozen single-file original of
 * NorthBank as one workspace (the baseline the one-workspace pages are held
 * to), `set` is NorthBank as it ships, twelve files exported as one set.
 */
export type NorthbankKind = "monolith" | "set";

export type NorthbankExport = {
	kind: NorthbankKind;
	dir: string;
	origin: string;
	stop: () => Promise<void>;
};

const NORTHBANK = join(
	__dirname,
	"../../../models/northbank/src/fixtures/northbank.monolith.json",
);

const freePort = () =>
	new Promise<number>((resolve, reject) => {
		const probe = createServer();
		probe.once("error", reject);
		probe.listen(0, () => {
			const { port } = probe.address() as { port: number };
			probe.close(() => resolve(port));
		});
	});

async function listening(origin: string): Promise<void> {
	for (let attempt = 0; attempt < 100; attempt++) {
		try {
			if ((await fetch(origin)).ok) return;
		} catch {
			// not accepting connections yet
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	throw new Error(`the static server at ${origin} never answered`);
}

/**
 * Writes NorthBank's static export and serves it on a free local port: the
 * frozen single workspace by default, or the twelve files as one set.
 */
export async function startNorthbankExport(
	kind: NorthbankKind = "monolith",
): Promise<NorthbankExport> {
	const dir = await mkdtemp(join(tmpdir(), "ods-reading-"));
	if (kind === "set") {
		const set = northbankSet();
		const findings = set.validate();
		await exportSite({
			appDir: join(__dirname, "../app"),
			sources: set.workspaces.map((workspace) => ({
				workspace,
				fileLabel: workspace.file as string,
				path: workspace.file as string,
				set: "northbank",
				diagnostics: findings.filter((d) => d.file === workspace.file),
			})),
			outDir: dir,
		});
	} else {
		const workspace = Workspace.fromSchema(
			JSON.parse(readFileSync(NORTHBANK, "utf8")),
		);
		await exportSite({
			appDir: join(__dirname, "../app"),
			sources: [
				{
					workspace,
					fileLabel: "northbank-monolith.json",
					diagnostics: workspace.validate(),
				},
			],
			outDir: dir,
		});
	}
	const served = await serveDir(dir);
	return {
		kind,
		dir,
		origin: served.origin,
		stop: async () => {
			await served.stop();
			await rm(dir, { recursive: true, force: true });
		},
	};
}

/** Serves a folder on a free local port the way a static host would, until `stop` kills exactly that server. */
export async function serveDir(
	dir: string,
): Promise<{ origin: string; stop: () => Promise<void> }> {
	const port = await freePort();
	const server: ChildProcess = spawn(
		process.execPath,
		[join(__dirname, "static-server.mjs"), String(port), dir],
		{ stdio: "ignore" },
	);
	const origin = `http://localhost:${port}`;
	await listening(origin);
	return {
		origin,
		stop: async () => {
			server.kill();
		},
	};
}

/** NorthBank at `ref` ("" is the workspace, or the set's own page for a set export) in `host`, with nothing focused. */
export async function openNorthbank(
	page: Page,
	host: ReadingHost,
	ref: string,
	site: NorthbankExport,
): Promise<void> {
	if (host === "viewer" && site.kind === "set") {
		await serveNorthbank(page);
		await page.goto(`/${northbankQuery()}${modelHash(ref)}`);
	} else if (host === "viewer") {
		const url = await serveModel(page, "northbank-monolith");
		await page.goto(`/?url=${encodeURIComponent(url)}${modelHash(ref)}`);
	} else if (host === "export-http") {
		await page.goto(`${site.origin}/${modelHash(ref)}`);
	} else {
		await page.goto(
			`${pathToFileURL(join(site.dir, "index.html")).href}${modelHash(ref)}`,
		);
	}
	await page.locator("main h1").waitFor();
}
