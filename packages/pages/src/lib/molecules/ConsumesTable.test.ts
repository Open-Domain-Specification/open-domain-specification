import type { Consumption } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import ConsumesTable from "./ConsumesTable.svelte";

function firstConsumption() {
	const { workspace } = petstoreModel();
	for (const bc of workspace.boundedcontexts.values())
		for (const m of [...bc.aggregates.values(), ...bc.services.values()])
			for (const c of m.consumptions) return c;
	throw new Error("petstore has no consumptions to test with");
}

describe("ConsumesTable", () => {
	it("shows nothing when there are no consumptions", () => {
		render(ConsumesTable, { consumptions: [] });
		expect(
			screen.getByText("Depends on nothing outside itself."),
		).toBeInTheDocument();
	});

	it("shows the declared protection pattern", () => {
		const consumption = firstConsumption();
		expect(consumption.pattern).toBeTruthy();
		render(ConsumesTable, { consumptions: [consumption] });
		expect(screen.getByText(consumption.pattern as string)).toBeInTheDocument();
	});

	it("shows 'unspecified' when no protection pattern is declared", () => {
		const consumption = {
			...firstConsumption(),
			pattern: undefined,
		} as unknown as Consumption;
		render(ConsumesTable, { consumptions: [consumption] });
		expect(screen.getByText("unspecified")).toBeInTheDocument();
	});
});
