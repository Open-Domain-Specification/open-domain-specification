import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { exportSite } from "../dist/site.js";

export const PETSTORE = join(
	__dirname,
	"../../../models/petstore/.ods/petstore.json",
);
export const EXPORT_DIR = join(__dirname, ".export");

/** Builds a two-workspace static export from the package's own dist, so e2e runs against real output. */
export default async function globalSetup() {
	await rm(EXPORT_DIR, { recursive: true, force: true });
	const schema = JSON.parse(readFileSync(PETSTORE, "utf8"));
	const petstore = Workspace.fromSchema(schema);
	const second = Workspace.fromSchema({
		...schema,
		id: "second",
		name: "Second Workspace",
	});
	await exportSite({
		appDir: join(__dirname, "../app"),
		sources: [
			{
				workspace: petstore,
				fileLabel: "petstore.json",
				diagnostics: petstore.validate(),
			},
			{ workspace: second, fileLabel: "second.json", diagnostics: [] },
		],
		outDir: EXPORT_DIR,
	});
	buildStorybook();
}

/**
 * The design surfaces are only reviewable through Storybook, and a story that
 * compiles is not a story that renders, so `storybook.spec.ts` opens each one
 * from a real build. Built here rather than left to the developer so the
 * check cannot silently skip in CI.
 */
function buildStorybook() {
	const result = spawnSync(
		"npx",
		["storybook", "build", "-o", "storybook-static"],
		{
			cwd: join(__dirname, ".."),
			stdio: "inherit",
			shell: process.platform === "win32",
		},
	);
	if (result.status !== 0)
		throw new Error(`storybook build failed with status ${result.status}`);
}
