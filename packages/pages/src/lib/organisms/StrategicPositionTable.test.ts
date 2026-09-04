import { type BoundedContext, PATTERNS } from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import { edgeCaseModel, petstoreSales } from "../fixtures";
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

	it("discloses what a role code means, and this row's evidence under it", async () => {
		const { model, context } = petstoreSales();
		const { container } = position(model, context);
		const acl = PATTERNS["anti-corruption-layer"];
		const term = [...container.querySelectorAll(".pattern-hover")].find((el) =>
			el.textContent?.includes(acl.abbreviation),
		) as HTMLElement;
		await fireEvent.focusIn(term);
		const card = term.querySelector(".hover-card") as HTMLElement;
		expect(card.querySelector(".heading")).toHaveTextContent(acl.name);
		expect(card).toHaveTextContent(acl.summary);
		// The row's own relationship, not the pattern in general.
		expect(card).toHaveTextContent("PetSummaryClient");
	});

	it("opens the whole relationship detail in the bottom sheet, and closes it again", async () => {
		const { model, context } = petstoreSales();
		const { container } = position(model, context);
		// The detail is no longer a row of the table: a table inside a table
		// row gave the reader two header rows in one grid.
		expect(container.querySelector("tr.detail")).toBeNull();
		expect(document.getElementById("relationship-sheet")).toBeNull();

		const toggle = screen.getAllByRole("button", { name: /^Evidence for/ })[0];
		expect(toggle).toHaveAttribute("aria-controls", "relationship-sheet");
		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute("aria-expanded", "true");
		const sheet = document.getElementById("relationship-sheet") as HTMLElement;
		expect(sheet.querySelector("h2")).toHaveTextContent("Relationship");
		expect(sheet.querySelector("#roles")).toBeInTheDocument();
		expect(container.querySelector("tr.detail")).toBeNull();

		await fireEvent.click(toggle);
		expect(document.getElementById("relationship-sheet")).toBeNull();

		// One sheet, one relationship at a time: a second row replaces the first.
		const others = screen.getAllByRole("button", { name: /^Evidence for/ });
		await fireEvent.click(others[0]);
		const first = document.querySelector(
			"#relationship-sheet .body",
		)?.textContent;
		await fireEvent.click(others[1]);
		const sheets = document.querySelectorAll("#relationship-sheet");
		expect(sheets).toHaveLength(1);
		expect(sheets[0].querySelector(".body")?.textContent).not.toBe(first);
	});

	it("closes the sheet on Escape and puts focus back on the row's toggle", async () => {
		const { model, context } = petstoreSales();
		position(model, context);
		const toggle = screen.getAllByRole("button", { name: /^Evidence for/ })[0];
		toggle.focus();
		await fireEvent.click(toggle);
		expect(document.getElementById("relationship-sheet")).not.toBeNull();

		await fireEvent.keyDown(window, { key: "Escape" });

		expect(document.getElementById("relationship-sheet")).toBeNull();
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(document.activeElement).toBe(toggle);
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
		expect(document.getElementById("relationship-sheet")).toBeNull();
		// With no description of its own, the row reads the generated sentence.
		expect(
			container.querySelector("tbody td:nth-child(2) .description")?.textContent
				?.length,
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
