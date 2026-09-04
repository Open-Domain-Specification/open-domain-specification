import type { Attribute } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { edgeCaseModel, petstoreModel } from "../../fixtures";
import AttributeTable from "./AttributeTable.svelte";

const attributesOf = (model: ReturnType<typeof petstoreModel>): Attribute[] =>
	[...model.workspace.boundedcontexts.values()].flatMap((bc) =>
		[...bc.aggregates.values()].flatMap((a) =>
			[...a.entities.values()].flatMap((e) => [...e.attributes.values()]),
		),
	);

describe("AttributeTable", () => {
	it("marks the identity with the key codicon and sets the name and type in the editor font", () => {
		const attributes = attributesOf(petstoreModel());
		const { container } = render(AttributeTable, { attributes });
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["", "Attribute", "Type", "Description"]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(
			attributes.length,
		);
		const key = container.querySelector(".codicon-key") as HTMLElement;
		expect(key).toHaveAttribute("title", "identity");
		expect(container.querySelector("tbody td:nth-child(2) code")).toBeTruthy();
	});

	it("links a type that is a value object in the model", () => {
		const linked = attributesOf(petstoreModel()).filter((a) => a.valueobject);
		render(AttributeTable, { attributes: linked });
		expect(
			screen.getAllByRole("link")[0].closest("code"),
		).toBeInTheDocument();
	});

	it("says what would fill it when nothing is declared", () => {
		render(AttributeTable, {
			attributes: [],
			empty: "The schema has no attributes.",
		});
		expect(screen.getByText("The schema has no attributes.")).toHaveClass(
			"empty",
		);
		render(AttributeTable, { attributes: [] });
		expect(screen.getByText("No attributes.")).toBeInTheDocument();
	});

	it("leaves the description cell empty for an attribute that has none", () => {
		const bare = attributesOf(edgeCaseModel()).filter((a) => !a.description);
		expect(bare.length).toBeGreaterThan(0);
		const { container } = render(AttributeTable, { attributes: bare });
		expect(
			container.querySelector("tbody td:last-child")?.textContent?.trim(),
		).toBe("");
	});
});
