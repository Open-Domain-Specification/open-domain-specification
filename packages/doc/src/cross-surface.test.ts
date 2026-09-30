import { readFileSync } from "node:fs";
import { join } from "node:path";
import { relationshipTitle, Workspace } from "@open-domain-specification/core";
import { beforeAll, describe, expect, it } from "vitest";
import {
	EXPECTED,
	FIXTURE_FILE,
} from "../../../apps/ods-vscode/src/test/fixtures/cross-surface/expected";
import { toDoc } from "./index";

/**
 * The cross-surface facts of epic #62 in their Markdown form. The viewer, the
 * static export and the VS Code webview are held to the same
 * `expected.ts` (`packages/pages/e2e/cross-surface-facts.spec.ts`,
 * `apps/ods-vscode/src/test/cross-surface.test.ts`).
 *
 * Markdown writes no relationship page, so the pages' relationship heading
 * has no Markdown form. The workspace page's health section lists each
 * relationship by core's `relationshipTitle` in bold, so a named agreement's
 * name (#74) is asserted there.
 */
const dir = join(
	__dirname,
	"../../../apps/ods-vscode/src/test/fixtures/cross-surface/.ods",
);
const workspace = Workspace.fromSchema(
	JSON.parse(readFileSync(join(dir, FIXTURE_FILE), "utf8")),
);

let docs: Record<string, string>;
beforeAll(async () => {
	docs = await toDoc(workspace);
});

const textOf = (svg: string) =>
	[...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]);
/** Graphviz writes an edge's tooltip as the title of the link around it. */
const tooltipsOf = (svg: string) =>
	[...svg.matchAll(/xlink:title="([^"]*)"/g)].map((m) => m[1]);

/** The Markdown path of the page a pages ref names. */
const pathOf = (ref: string) => `${ref.replace("#/", "")}/index.md`;

describe("the cross-surface fixture as Markdown", () => {
	it("prints an authored description as written and marks a generated one (#43)", () => {
		const d = EXPECTED.descriptions;
		const table = docs[pathOf(EXPECTED.refs.orders)].split(
			"## Context Relationships",
		)[1];
		const row = (counterpart: string) =>
			table.split("\n").find((l) => l.startsWith(`| ${counterpart} |`));

		expect(row(d.authored.counterpart)).toBe(
			`| ${d.authored.counterpart} | ${d.authored.text} | customer-supplier | - | - |`,
		);
		expect(row(d.generated.counterpart)).toBe(
			`| ${d.generated.counterpart} | *${d.generated.sentence}* ${d.generated.markdownSuffix} | customer-supplier | - | - |`,
		);
		// The marker belongs to the generated row alone.
		expect(table.split(d.generated.markdownSuffix)).toHaveLength(2);
	});

	it("names the agreement on each consumption, and leaves it out where none is named (#55)", () => {
		const a = EXPECTED.agreements;
		const service = docs[pathOf(EXPECTED.refs.warehouseApi)];
		const section = (consumable: string) => {
			const after = service.split(`### ${consumable} `)[1];
			return after.split("\n### ")[0];
		};
		for (const c of a.consumptions) {
			const body = section(c.consumable);
			if (c.agreement === null) expect(body).not.toContain("**Agreement**");
			else expect(body).toContain(a.bullet(c.agreement));
		}

		// The context page's table carries the column, with `-` for the row that names none.
		const table = docs[pathOf(EXPECTED.refs.warehouse)]
			.split("## Consumptions")[1]
			.split("\n")
			.filter((l) => l.startsWith("|"));
		const header = table[0].split("|").map((c) => c.trim());
		const at = header.indexOf(a.columnHeader);
		expect(at).toBeGreaterThan(0);
		for (const c of a.consumptions) {
			const cells = table
				.find((l) => l.includes(` ${c.consumable} `))
				?.split("|")
				.map((x) => x.trim());
			expect(cells?.[at]).toBe(c.agreement ?? "-");
		}

		// The consumable map the page embeds carries the agreement on its edge.
		const svg =
			docs[
				`${pathOf(EXPECTED.refs.warehouseApi).replace("index.md", "consumablemap.svg")}`
			];
		for (const c of a.consumptions.filter((x) => x.agreement !== null)) {
			expect(textOf(svg)).toContain(c.agreement);
			expect(
				tooltipsOf(svg).some((t) =>
					t.includes(a.edgeTitle(c.agreement as string)),
				),
			).toBe(true);
		}
	});

	it("lists each named agreement under its own title in the health section and the context map table (#74)", () => {
		const page = docs[`${workspace.path}/index.md`];
		const health = page.split("## Health")[1].split("\n## ")[0];
		const map = page.split("## Context Relationships")[1].split("\n## ")[0];
		for (const n of EXPECTED.namedAgreements) {
			const relationship = workspace.relationships.find(
				(r) => r.ref === n.relationship,
			);
			expect(relationship?.name).toBe(n.name);
			expect(health).toContain(
				`- **${relationshipTitle(relationship as never)}** (`,
			);
			expect(relationshipTitle(relationship as never)).toContain(n.name);
			// The context map's table names it after the type, as the map's badge does.
			expect(map).toContain(`| ${relationship?.type} · ${n.name} |`);
		}
	});

	it("draws each identity target on the relation map as the kind of context it is (#56)", () => {
		const svg =
			docs[
				`${pathOf(EXPECTED.refs.account).replace("index.md", "relationmap.svg")}`
			];
		const words = textOf(svg);
		for (const i of EXPECTED.identities) {
			const at = words.indexOf(`«${i.stereotype}»`);
			expect(at, `«${i.stereotype}» is on the map`).toBeGreaterThan(-1);
			expect(words[at + 1]).toBe(i.context);
		}
	});
});
