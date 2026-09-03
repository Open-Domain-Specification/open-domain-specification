import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { edgeCaseModel, petstoreModel } from "../fixtures";
import StructureCard from "./StructureCard.svelte";

describe("StructureCard", () => {
	it("highlights the root entity and shows its relations with cardinality and label", () => {
		const { workspace } = petstoreModel();
		const pet = workspace.boundedcontexts
			.get("catalog_bc")
			?.aggregates.get("pet")
			?.entities.get("pet");
		if (!pet) throw new Error("expected petstore's pet entity");

		render(StructureCard, { element: pet, kind: "entity" });
		expect(screen.getByText("aggregate root")).toBeInTheDocument();
		expect(screen.getByText("0..1")).toBeInTheDocument();
		expect(screen.getByText("categorized-as")).toBeInTheDocument();
	});

	it("shows nothing for a non-root element with no relations", () => {
		const { workspace } = edgeCaseModel();
		const plain = workspace.boundedcontexts
			.get("main_context")
			?.aggregates.get("rootless_aggregate")
			?.entities.get("plain_entity");
		if (!plain) throw new Error("expected the plain entity fixture");

		const { container } = render(StructureCard, {
			element: plain,
			kind: "entity",
		});
		expect(screen.queryByText("aggregate root")).toBeNull();
		expect(container.querySelector("ul.relations")).toBeNull();
	});

	it("shows a relation's cardinality even when it has no label", () => {
		const { workspace } = edgeCaseModel();
		const linker = workspace.boundedcontexts
			.get("main_context")
			?.aggregates.get("rootless_aggregate")
			?.valueobjects.get("linking_value_object");
		if (!linker) throw new Error("expected the linking value object fixture");

		render(StructureCard, { element: linker, kind: "valueobject" });
		expect(screen.getByText("1")).toBeInTheDocument();
		expect(screen.getByText("references")).toBeInTheDocument();
	});

	it("copes with a relation that has no relation kind", () => {
		// biome-ignore lint/suspicious/noExplicitAny: a minimal fake shaped like an Entity, to exercise the missing-kind fallback branch
		const element: any = {
			ref: "#/x",
			name: "X",
			description: "d",
			attributes: new Map(),
			relations: [
				{
					relation: undefined,
					target: { ref: "#/y", name: "Y" },
				},
			],
		};
		const { container } = render(StructureCard, { element, kind: "entity" });
		expect(container.querySelector("ul.relations li")).toBeInTheDocument();
	});
});
