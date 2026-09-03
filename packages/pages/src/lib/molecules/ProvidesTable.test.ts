import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import ProvidesTable from "./ProvidesTable.svelte";

describe("ProvidesTable", () => {
	it("shows an empty state when nothing is provided", () => {
		render(ProvidesTable, { consumables: [] });
		expect(screen.getByText("Provides nothing.")).toBeInTheDocument();
	});

	it("lists every provided consumable", () => {
		const { workspace } = petstoreModel();
		const bc = [...workspace.boundedcontexts.values()][0];
		const aggregate = [...bc.aggregates.values()][0];
		const { container } = render(ProvidesTable, {
			consumables: aggregate.consumables.values(),
		});
		for (const c of aggregate.consumables.values())
			expect(container.querySelector(`tr[id="${c.ref}"]`)).toBeTruthy();
	});
});
