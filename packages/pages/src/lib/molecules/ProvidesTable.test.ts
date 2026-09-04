import type { Consumable } from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { edgeCaseModel, petstoreModel } from "../fixtures";
import ProvidesTable from "./ProvidesTable.svelte";

const providesOf = (model: ReturnType<typeof petstoreModel>): Consumable[] =>
	[...model.workspace.boundedcontexts.values()].flatMap((bc) =>
		[...bc.aggregates.values(), ...bc.services.values()].flatMap((m) => [
			...m.consumables.values(),
		]),
	);

describe("ProvidesTable", () => {
	it("gives the kind, the visibility and the pattern a column each instead of three chips in one cell", () => {
		const consumables = providesOf(petstoreModel());
		const { container } = render(ProvidesTable, { consumables });
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual([
			"Consumable",
			"Kind",
			"Visibility",
			"Pattern",
			"Schema",
			"Raises",
			"Consumed by",
		]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(
			consumables.length,
		);
		// An event is drawn with the broadcast codicon, an operation with the zap.
		expect(container.querySelector(".codicon-broadcast")).toBeInTheDocument();
		expect(container.querySelector(".codicon-zap")).toBeInTheDocument();
		// A consumable that stays inside its context says so, and names no consumer.
		expect(screen.getAllByText("internal").length).toBeGreaterThan(0);
		// The pattern is a code from a table, so it is set in the editor font.
		expect(
			container.querySelector("tbody td:nth-child(4) .keyword"),
		).toHaveClass("mono");
	});

	it("sorts by consumable and by kind, the two columns the spec makes sortable", async () => {
		const { container } = render(ProvidesTable, {
			consumables: providesOf(petstoreModel()),
		});
		await fireEvent.click(screen.getByRole("button", { name: "Kind" }));
		const kinds = [...container.querySelectorAll("tbody td:nth-child(2)")].map(
			(td) => td.textContent?.trim(),
		);
		expect(kinds).toEqual([...kinds].sort());

		await fireEvent.click(screen.getByRole("button", { name: "Consumable" }));
		const names = [...container.querySelectorAll("tbody td:first-child")].map(
			(td) => td.textContent?.trim(),
		);
		expect(names).toEqual([...names].sort());
	});

	it("says what is missing rather than leaving a cell blank, and what an empty table would hold", () => {
		// The edge-case workspace provides one operation with a schema and one
		// event nothing raises or consumes, neither with a pattern.
		render(ProvidesTable, { consumables: providesOf(edgeCaseModel()) });
		expect(screen.getAllByText("none").length).toBeGreaterThan(0);
		expect(screen.getAllByText("–").length).toBeGreaterThan(0);

		render(ProvidesTable, { consumables: [] });
		expect(screen.getByText("Provides nothing.")).toHaveClass("empty");
	});
});
