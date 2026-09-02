import fs from "node:fs";
import path from "node:path";
import type { Workspace } from "@open-domain-specification/core";
import { toDoc } from "@open-domain-specification/doc";
import { workspace as northbank } from "./northbank/workspace.ts";
import { workspace as petstore } from "./petstore/workspace.ts";
import { workspace as rivermart } from "./rivermart/workspace.ts";
import { workspace as streamline } from "./streamline/workspace.ts";

/**
 * The reference workspaces and the file stem each is written under. The
 * petstore keeps its historical file name because tests and the pages
 * fixtures reference `.ods/petstore.json`; the others use their workspace id.
 */
const workspaces: Array<{ workspace: Workspace; file: string }> = [
	{ workspace: petstore, file: "petstore" },
	{ workspace: rivermart, file: rivermart.id },
	{ workspace: streamline, file: streamline.id },
	{ workspace: northbank, file: northbank.id },
];

fs.mkdirSync(".ods", { recursive: true });

for (const { workspace, file } of workspaces) {
	const diagnostics = workspace.validate();
	console.log(`${workspace.name}: ${diagnostics.length} diagnostic(s)`);
	for (const d of diagnostics) {
		console.log(`  [${d.severity}] ${d.rule}: ${d.message} (${d.ref})`);
	}

	// One docsify site per workspace; the sidebar links are absolute, so each
	// site is served from its own folder (see the `serve` script).
	const docs = await toDoc(workspace);
	for (const [docFile, content] of Object.entries(docs)) {
		const target = path.join("docs", file, docFile);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content, "utf-8");
	}

	// The same model as a .ods folder, which is what the VS Code extension
	// and the pages fixtures open.
	fs.writeFileSync(
		path.join(".ods", `${file}.json`),
		JSON.stringify(
			{ $schema: "./schema.json", ...workspace.toSchema() },
			null,
			2,
		),
		"utf-8",
	);
}
