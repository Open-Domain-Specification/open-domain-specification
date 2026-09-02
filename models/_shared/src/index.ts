import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { Aggregate, Workspace } from "@open-domain-specification/core";
import { toDoc } from "@open-domain-specification/doc";

const require = createRequire(import.meta.url);

/**
 * Money as a value object, declared once in every aggregate that carries an
 * amount. Minor units and an ISO 4217 code, so no float ever touches a price.
 * The description can say what the organisation makes of it.
 */
export function money(
	aggregate: Aggregate,
	description = "An amount in a currency: minor units and an ISO 4217 code",
) {
	const vo = aggregate.addValueObject("Money", { description });
	vo.addAttribute("amountMinor", { type: "int64" });
	vo.addAttribute("currency", { type: "ISO 4217 code" });
	return vo;
}

/**
 * Generates one reference model package's build output: the docsify docs
 * under `docs/`, and `.ods/<file>.json` with `$schema` pointing at a copy of
 * core's JSON schema written beside it as `.ods/schema.json` -- what the VS
 * Code extension and the pages viewer open.
 */
export async function generate(
	workspace: Workspace,
	{ file }: { file: string },
): Promise<void> {
	const diagnostics = workspace.validate();
	console.log(`${workspace.name}: ${diagnostics.length} diagnostic(s)`);
	for (const d of diagnostics) {
		console.log(`  [${d.severity}] ${d.rule}: ${d.message} (${d.ref})`);
	}

	const docs = await toDoc(workspace);
	for (const [docFile, content] of Object.entries(docs)) {
		const target = path.join("docs", docFile);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content, "utf-8");
	}

	fs.mkdirSync(".ods", { recursive: true });
	fs.writeFileSync(
		path.join(".ods", `${file}.json`),
		JSON.stringify(
			{ $schema: "./schema.json", ...workspace.toSchema() },
			null,
			2,
		),
		"utf-8",
	);

	const coreSchema = require.resolve(
		"@open-domain-specification/core/dist/workspace.schema.json",
	);
	fs.copyFileSync(coreSchema, path.join(".ods", "schema.json"));
}
