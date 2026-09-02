import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { dotToSvg } from "./graphviz";
import { renderPage } from "./render";

const schema = JSON.parse(
	readFileSync(
		join(__dirname, "../../../../packages/ods-example-ws/.ods/petstore.json"),
		"utf8",
	),
);
const workspace = Workspace.fromSchema(schema);

/** Every ref that owns a page: workspace, teams, domains, subdomains, contexts and everything inside them. */
function pageRefs(ws: Workspace): string[] {
	const refs = ["#"];
	for (const t of ws.teams.values()) refs.push(t.ref);
	for (const d of ws.domains.values()) {
		refs.push(d.ref);
		for (const s of d.subdomains.values()) refs.push(s.ref);
	}
	for (const bc of ws.boundedcontexts.values()) {
		refs.push(bc.ref);
		for (const a of bc.aggregates.values()) {
			refs.push(a.ref);
			for (const m of [
				...a.entities.values(),
				...a.valueobjects.values(),
				...a.invariants.values(),
				...a.consumables.values(),
			])
				refs.push(m.ref);
		}
		for (const s of bc.services.values()) {
			refs.push(s.ref);
			for (const c of s.consumables.values()) refs.push(c.ref);
		}
		for (const p of bc.policies.values()) refs.push(p.ref);
		for (const s of bc.schemas.values()) refs.push(s.ref);
		for (const t of bc.glossary.values()) refs.push(t.ref);
	}
	return refs;
}

describe("every element of the petstore renders its own page", () => {
	const refs = pageRefs(workspace);
	it("covers more than the container pages", () => {
		expect(refs.length).toBeGreaterThan(40);
	});
	for (const ref of refs) {
		it(ref, async () => {
			const page = await renderPage({
				workspace,
				ref,
				fileLabel: "petstore.json",
				diagnostics: workspace.validate(),
				svg: dotToSvg,
			});
			expect(page.title).not.toBe("");
			expect(page.body).toContain("<section");
			expect(page.body).not.toContain("could not be rendered");
			// A ref that owns a page is never treated as an anchor inside another page.
			expect(page.anchor).toBeUndefined();
		});
	}
});

it("an attribute ref opens its owner's page and anchors to the attribute", async () => {
	const entity = [...workspace.boundedcontexts.values()]
		.flatMap((bc) => [...bc.aggregates.values()])
		.flatMap((a) => [...a.entities.values()])
		.find((e) => e.attributes.size > 0);
	if (!entity) return;
	const attribute = [...entity.attributes.values()][0];
	const page = await renderPage({
		workspace,
		ref: attribute.ref,
		fileLabel: "petstore.json",
		diagnostics: [],
		svg: dotToSvg,
	});
	expect(page.title).toBe(entity.name);
	expect(page.anchor).toBe(attribute.ref);
});
