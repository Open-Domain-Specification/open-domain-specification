import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import { petstoreModel } from "../fixtures";
import RelationshipPage, { sections } from "./RelationshipPage.svelte";

describe("RelationshipPage", () => {
	it("points the table of contents at the detail's own headings", () => {
		expect(sections.map((s) => s.id)).toEqual([
			"roles",
			"comments",
			"crossings",
			"links",
		]);
	});

	it("is the trail and the detail at title size, with no kind eyebrow", () => {
		const model = petstoreModel();
		const relationship = model.workspace.relationships[0];
		const { container } = render(Harness, {
			model,
			component: RelationshipPage,
			args: { relationship },
		});
		expect(
			[...container.querySelectorAll(".crumbs a")].map((a) => a.textContent),
		).toEqual([
			model.workspace.name,
			relationship.source.name,
			relationship.target.name,
		]);
		expect(container.querySelector(".crumbs .kind")).toBeNull();

		// The title is the two context lockups, at level 1.
		const title = screen.getByRole("heading", { level: 1 });
		expect(title.querySelectorAll(".context")).toHaveLength(2);
		expect(container.querySelector("#roles")).toBeInTheDocument();
	});

	it("nests its parts as h2 under the h1, at the level-3 scale (#81)", () => {
		const model = petstoreModel();
		const { container } = render(Harness, {
			model,
			component: RelationshipPage,
			args: { relationship: model.workspace.relationships[0] },
		});
		const parts = [...container.querySelectorAll("section > .heading")];
		expect(parts.map((h) => h.id || h.parentElement?.id)).toEqual(
			sections.map((s) => s.id),
		);
		for (const h of parts) {
			expect(h.tagName).toBe("H2");
			expect(h).toHaveClass("h3");
		}
		expect(container.querySelector("h3")).toBeNull();
	});
});
