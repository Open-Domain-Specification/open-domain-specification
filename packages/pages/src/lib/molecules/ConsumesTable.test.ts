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
	it("names what is consumed, who provides it, from which context, what makes the call, and the protection", () => {
		const rows = consumptions();
		const { container } = render(ConsumesTable, { consumptions: rows });
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Consumable", "Provider", "Context", "Made By", "Protection"]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(rows.length);
		expect(
			container.querySelector(".codicon-symbol-class"),
		).toBeInTheDocument();
		// The protection is a code from the pattern table, in the editor font.
		expect(
			container.querySelector("tbody td:nth-child(5) .keyword.mono"),
		).toBeInTheDocument();
	});

	it("names the consumer's own operation behind a consumption, and says so when it is the whole consumer", () => {
		// Sales asks Catalog to reserve a pet, and to mark it sold, from one
		// operation of its own each, and reads the catalogue summary from its
		// process; the whole of Inventory's projection takes the pet facts.
		const { container } = render(ConsumesTable, {
			consumptions: consumptions(),
		});
		const madeBy = [...container.querySelectorAll("tbody tr")].map((tr) => [
			tr.querySelector("td:nth-child(1)")?.textContent?.trim(),
			tr.querySelector("td:nth-child(4)")?.textContent?.trim(),
		]);
		expect(madeBy).toContainEqual(["ReservePetForOrder", "ReservePet"]);
		expect(madeBy).toContainEqual(["MarkPetSoldForOrder", "MarkPetSold"]);
		expect(madeBy).toContainEqual(["GetPetSummary", "Order fulfilment"]);
		expect(madeBy).toContainEqual(["PetRegistered", "whole consumer"]);
		expect(screen.getAllByText("whole consumer")[0]).toHaveClass("keyword");
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
