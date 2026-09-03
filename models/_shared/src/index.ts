import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { type Aggregate, Workspace } from "@open-domain-specification/core";
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

/**
 * The assertions shared, byte-for-byte, by RiverMart's, StreamLine's and
 * NorthBank's workspace tests: every relationship type is used and there is
 * one big ball of mud, every context has a team, there's a glossary,
 * policies and schemas on cross-context events, `validate()` reports exactly
 * the deliberate problems (by rule id and severity), and the workspace
 * round-trips through `Workspace.fromSchema`.
 *
 * Each reference package keeps only its own id assertion, its `deliberate`
 * array, and a single `it` that calls this helper.
 */
export function assertStressTestWorkspace(
	workspace: Workspace,
	deliberate: Array<{ rule: string; severity: "error" | "warning" }>,
): void {
	const types = new Set(workspace.relationships.map((r) => r.type));
	assert.deepStrictEqual([...types].sort(), [
		"customer-supplier",
		"partnership",
		"separate-ways",
		"shared-kernel",
		"upstream-downstream",
	]);
	const legacy = [...workspace.boundedcontexts.values()].filter(
		(bc) => bc.bigBallOfMud,
	);
	assert.strictEqual(legacy.length, 1);

	for (const bc of workspace.boundedcontexts.values()) {
		assert.notStrictEqual(bc.team, undefined, `${bc.name} has no team`);
	}

	const contexts = [...workspace.boundedcontexts.values()];
	assert.ok(contexts.some((bc) => bc.glossary.size > 0));
	assert.ok(contexts.reduce((n, bc) => n + bc.policies.size, 0) > 5);
	for (const bc of contexts) {
		for (const provider of [
			...bc.aggregates.values(),
			...bc.services.values(),
		]) {
			for (const c of provider.consumables.values()) {
				const consumedElsewhere = c.consumptions.some(
					(it) => it.consumer.boundedcontext !== bc,
				);
				if (c.type === "event" && consumedElsewhere && !c.internal) {
					assert.notStrictEqual(c.schema, undefined, `${c.name} has no schema`);
				}
			}
		}
	}

	const diagnostics = workspace
		.validate()
		.map(({ rule, severity }) => ({ rule, severity }))
		.sort((a, b) => a.rule.localeCompare(b.rule));
	assert.deepStrictEqual(
		diagnostics,
		[...deliberate].sort((a, b) => a.rule.localeCompare(b.rule)),
	);

	const schema = workspace.toSchema();
	const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
	assert.deepStrictEqual(rebuilt.toSchema(), schema);
	assert.deepStrictEqual(rebuilt.validate(), workspace.validate());
}
