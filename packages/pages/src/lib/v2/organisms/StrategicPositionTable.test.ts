import type { BoundedContext } from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../../evidence/WithModel.harness.svelte";
import { edgeCaseModel, petstoreSales } from "../../fixtures";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

type Model = ReturnType<typeof petstoreSales>["model"];

const position = (model: Model, context: BoundedContext) =>
	render(Harness, {
		model,
		component: StrategicPositionTable,
		args: { context },
	});

describe("StrategicPositionTable", () => {
	it("groups the relationships by what they mean from here, with the counterpart as a lockup and the roles as codes", () => {
		const { model, context } = petstoreSales();
		const { container } = position(model, context);
		expect(
			[...container.querySelectorAll("tr.group th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Depends on", "Depended on by", "Works alongside"]);
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual([
			"",
			"With",
			"Description",
			"Type",
			"Upstream",
			"Downstream",
			"Disposition",
		]);
		// The counterpart is a link, not a pill, and carries the generated sentence.
		const counterpart = container.querySelector(
			"tbody td:nth-child(2) .context",
		) as HTMLElement;
		expect(counterpart.title.length).toBeGreaterThan(0);
		expect(counterpart.querySelector("a")).toBeInTheDocument();
		expect(container.querySelector(".keyword.mono")).toBeInTheDocument();
		expect(container.querySelector(".disposition")).toBeInTheDocument();
	});

	it("expands a row in place into the whole relationship detail, and closes it again", async () => {
		const { model, context } = petstoreSales();
		const { container } = position(model, context);
		expect(container.querySelector("tr.detail")).toBeNull();

		const toggle = screen.getAllByRole("button", { name: /^Evidence for/ })[0];
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		const detail = container.querySelector("tr.detail") as HTMLElement;
		expect(detail.querySelector("td")).toHaveAttribute("colspan", "7");
		expect(detail.querySelector("#roles")).toBeInTheDocument();

		await fireEvent.click(toggle);
		expect(container.querySelector("tr.detail")).toBeNull();

		// Opening another row replaces the open one.
		const others = screen.getAllByRole("button", { name: /^Evidence for/ });
		await fireEvent.click(others[0]);
		await fireEvent.click(others[1]);
		expect(container.querySelectorAll("tr.detail")).toHaveLength(1);
	});

	it("leaves the toggle and disposition columns out where nothing is recorded", () => {
		const model = edgeCaseModel();
		const context = model.workspace.boundedcontexts.get(
			"main_context",
		) as BoundedContext;
		const { container } = position(model, context);
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["With", "Description", "Type", "Upstream", "Downstream"]);
		expect(container.querySelector("tr.detail")).toBeNull();
		// With no description of its own, the row reads the generated sentence.
		expect(
			container.querySelector("tbody td:nth-child(2) .description")
				?.textContent?.length,
		).toBeGreaterThan(0);
	});

	it("says so when a context has no explicit relationship at all", () => {
		const model = edgeCaseModel();
		const context = model.workspace.boundedcontexts.get(
			"thin_context",
		) as BoundedContext;
		position(model, context);
		expect(
			screen.getByText(
				"No explicit relationships. Consumptions imply upstream and downstream links.",
			),
		).toHaveClass("empty");
	});
});
