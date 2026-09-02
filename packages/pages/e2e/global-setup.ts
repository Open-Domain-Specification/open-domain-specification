import { readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { exportSite } from "../dist/site.js";

export const PETSTORE = join(
	__dirname,
	"../../ods-example-ws/.ods/petstore.json",
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
}
