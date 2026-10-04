/**
 * What the skill's references say about a folder of files is what core does.
 *
 * `validator-drift.test.ts` pins sentences. This pins the claims behind them
 * against the library the sentences describe: the generated references list
 * every rule core asks, the two rules asked of a set among them; the file
 * grammar the model reference states is the one the generated JSON schema
 * checks and the codec resolves; and the examples in the hand-written
 * references are refs that load.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import {
	encodeWirePath,
	RULE_CATALOG,
	resolveWirePath,
	SET_RULE_CATALOG,
	type WorkspaceSchema,
	WorkspaceSet,
} from "@open-domain-specification/core";
import { Ajv } from "ajv";
import { describe, expect, it } from "vitest";
import {
	renderModelReference,
	renderValidationRules,
	skillRoot,
} from "../scripts/generate.mts";

const require_ = createRequire(import.meta.url);
const corePkgRoot = dirname(
	require_.resolve("@open-domain-specification/core/package.json"),
);
const jsonSchema = require_(
	join(corePkgRoot, "dist/workspace.schema.json"),
) as {
	definitions: {
		RefSchema: {
			properties: { $ref: { pattern?: string; description?: string } };
		};
	};
};
const file = (path: string) => readFileSync(join(skillRoot, path), "utf8");

describe("the generated rule reference", () => {
	const rules = renderValidationRules();
	const headings = [...rules.matchAll(/^## `([a-z0-9-]+)`/gm)].map((m) => m[1]);

	it("lists the 72 rules of a workspace and the two of a set, each once, the set's after the rest", () => {
		expect(RULE_CATALOG).toHaveLength(72);
		expect(SET_RULE_CATALOG.map((it) => it.rule)).toEqual([
			"file-path-invalid",
			"workspace-id-unique",
		]);
		expect(headings).toEqual([
			...RULE_CATALOG.map((it) => it.rule),
			...SET_RULE_CATALOG.map((it) => it.rule),
		]);
		expect(new Set(headings).size).toBe(74);
		expect(rules.indexOf("# Rules about a folder of files")).toBeGreaterThan(
			rules.indexOf(`## \`${RULE_CATALOG[71].rule}\``),
		);
		expect(rules.indexOf("# Rules about a folder of files")).toBeLessThan(
			rules.indexOf("## `file-path-invalid`"),
		);
	});

	it("says in core's own words what each set rule requires, why and how to fix it", () => {
		for (const r of SET_RULE_CATALOG) {
			expect(rules).toContain(`**Requires:** ${r.summary}`);
			expect(rules).toContain(`**Why it matters:** ${r.why}`);
			expect(rules).toContain(`**Usual fix:** ${r.fix}`);
		}
	});

	it("names both rules as ones the real set reports", () => {
		const nothing = (id: string): WorkspaceSchema => ({
			id,
			name: id,
			description: "",
			version: "1",
			odsVersion: "3.0.0",
			domains: {},
			boundedcontexts: {},
			relationships: [],
			teams: {},
		});
		const set = WorkspaceSet.fromSchemas([
			["a.json", nothing("same")],
			["b.json", nothing("same")],
			["c\\d.json", nothing("c")],
		]);
		expect(new Set(set.validate().map((d) => d.rule))).toEqual(
			new Set(SET_RULE_CATALOG.map((it) => it.rule)),
		);
	});
});

describe("the file grammar the references state", () => {
	const ref = jsonSchema.definitions.RefSchema.properties.$ref;
	const pattern = new RegExp(ref.pattern as string);

	it("is the one the generated JSON schema checks, and the model reference carries its description", () => {
		expect(ref.pattern).toBeDefined();
		expect(renderModelReference()).toContain(ref.description as string);
	});

	it("accepts the spellings the references write and refuses the ones they rule out", () => {
		for (const written of [
			"#/boundedcontexts/ledger",
			"ledger.json#/boundedcontexts/ledger",
			"../payments/team.json#/boundedcontexts/ledger",
			"my%20team.json#/boundedcontexts/ledger",
			"a%23%25.json#/boundedcontexts/ledger",
			"team%20b/%C3%BC.json#/boundedcontexts/ledger",
		])
			expect(written, written).toMatch(pattern);
		for (const written of [
			"my team.json#/boundedcontexts/ledger",
			"ü.json#/boundedcontexts/ledger",
			"a\\b.json#/boundedcontexts/ledger",
			"http://x/a.json#/boundedcontexts/ledger",
			"a%2.json#/boundedcontexts/ledger",
			"a//b.json#/boundedcontexts/ledger",
		])
			expect(written, written).not.toMatch(pattern);
	});

	it("is what the codec writes for the file names the references use as examples", () => {
		expect(encodeWirePath("my team.json")).toBe("my%20team.json");
		expect(encodeWirePath("a#%.json")).toBe("a%23%25.json");
		expect(encodeWirePath("team b/ü.json")).toBe("team%20b/%C3%BC.json");
	});

	it("folds dot segments inside the set and refuses to leave it, as the references say", () => {
		expect(resolveWirePath("a/team.json", "../b/team.json")).toEqual({
			ok: true,
			path: "b/team.json",
		});
		expect(resolveWirePath("a/team.json", "../../x.json")).toMatchObject({
			ok: false,
			cause: "escapes-root",
		});
		expect(resolveWirePath("a.json", "/abs.json")).toMatchObject({
			ok: false,
			cause: "absolute",
		});
		expect(resolveWirePath("a.json", "schema.json")).toMatchObject({
			ok: false,
			cause: "reserved-name",
		});
		expect(resolveWirePath("a.json", "x//a.json")).toMatchObject({
			ok: false,
			cause: "empty-segment",
		});
	});

	it("matches the schema for every file ref written in the hand-written references", () => {
		const ajv = new Ajv({ strict: false });
		const check = ajv.compile({ type: "string", pattern: ref.pattern });
		for (const path of [
			"SKILL.md",
			"references/json-mode.md",
			"references/dsl-api.md",
		]) {
			const refs = [...file(path).matchAll(/"\$ref":\s*"([^"]+)"/g)].map(
				(m) => m[1],
			);
			for (const written of refs)
				expect(check(written), `${path}: ${written}`).toBe(true);
		}
	});
});
