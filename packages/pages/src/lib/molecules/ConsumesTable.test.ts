import type { Consumption } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import ConsumesTable from "./ConsumesTable.svelte";

const consumptions = (): Consumption[] =>
	[...petstoreModel().workspace.boundedcontexts.values()].flatMap((bc) =>
		[...bc.aggregates.values(), ...bc.services.values()].flatMap(
			(m) => m.consumptions,
		),
	);

describe("ConsumesTable", () => {
	it("names what is consumed, who provides it, from which context, and the protection", () => {
		const rows = consumptions();
		const { container } = render(ConsumesTable, { consumptions: rows });
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Consumable", "Provider", "Context", "Protection"]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(rows.length);
		expect(
			container.querySelector(".codicon-symbol-class"),
		).toBeInTheDocument();
		// The protection is a code from the pattern table, in the editor font.
		expect(
			container.querySelector("tbody td:nth-child(4) .keyword.mono"),
		).toBeInTheDocument();
	});

	it("says a consumption with no declared protection is unspecified", () => {
		const rows = consumptions();
		const bare = rows[0];
		Object.defineProperty(bare, "pattern", {
			value: undefined,
			configurable: true,
		});
		render(ConsumesTable, { consumptions: [bare] });
		expect(screen.getByText("unspecified")).toHaveClass("keyword");
	});

	it("says what would fill it when the context depends on nothing", () => {
		render(ConsumesTable, { consumptions: [] });
		expect(screen.getByText("Depends on nothing outside itself.")).toHaveClass(
			"empty",
		);
	});
});
