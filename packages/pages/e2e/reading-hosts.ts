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

export type NorthbankExport = {
	dir: string;
	origin: string;
	stop: () => Promise<void>;
};

const NORTHBANK = join(
	__dirname,
	"../../../models/northbank/.ods/northbank.json",
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

/** Writes NorthBank's single-workspace static export and serves it on a free local port. */
export async function startNorthbankExport(): Promise<NorthbankExport> {
	const dir = await mkdtemp(join(tmpdir(), "ods-reading-"));
	const workspace = Workspace.fromSchema(
		JSON.parse(readFileSync(NORTHBANK, "utf8")),
	);
	await exportSite({
		appDir: join(__dirname, "../app"),
		sources: [
			{
				workspace,
				fileLabel: "northbank.json",
				diagnostics: workspace.validate(),
			},
		],
		outDir: dir,
	});
	const port = await freePort();
	const server: ChildProcess = spawn(
		process.execPath,
		[join(__dirname, "static-server.mjs"), String(port), dir],
		{ stdio: "ignore" },
	);
	const origin = `http://localhost:${port}`;
	await listening(origin);
	return {
		dir,
		origin,
		stop: async () => {
			server.kill();
			await rm(dir, { recursive: true, force: true });
		},
	};
}

/** NorthBank at `ref` ("" is the workspace) in `host`, with nothing focused. */
export async function openNorthbank(
	page: Page,
	host: ReadingHost,
	ref: string,
	site: NorthbankExport,
): Promise<void> {
	if (host === "viewer") {
		const url = await serveModel(page, "northbank");
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
