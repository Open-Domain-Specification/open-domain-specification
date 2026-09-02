import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { dotToSvg } from "./graphviz";
import { renderPage } from "./render";
import { pageRefs } from "./site";

const schema = JSON.parse(
	readFileSync(
		join(__dirname, "../../ods-example-ws/.ods/petstore.json"),
		"utf8",
	),
);
const workspace = Workspace.fromSchema(schema);

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

it("a service that consumes nothing shows an empty state instead of a near-empty diagram", async () => {
	const service = [...workspace.boundedcontexts.values()]
		.flatMap((bc) => [...bc.services.values()])
		.find((s) => s.name === "UserApp");
	if (!service) throw new Error("fixture is missing the UserApp service");
	expect(service.consumptions.length).toBe(0);

	const page = await renderPage({
		workspace,
		ref: service.ref,
		fileLabel: "petstore.json",
		diagnostics: [],
		svg: dotToSvg,
	});
	expect(page.body).toContain(
		`<p class="empty">Depends on nothing outside itself.</p>`,
	);
	expect(page.body).not.toContain(`${service.name} consumable map`);
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
