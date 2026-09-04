import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./InvariantsSection.harness.svelte";

const headers = (container: HTMLElement) =>
	[...container.querySelectorAll("thead th")].map((th) =>
		th.textContent?.trim(),
	);

describe("InvariantsSection", () => {
	it("lists each invariant as a row with its lockup and its wording, not a card", () => {
		const { container } = render(Demo);
		expect(container.querySelector(".card")).toBeNull();
		expect(headers(container)).toEqual(["Invariant", "Description"]);
		expect(
			screen.getByRole("heading", { level: 2 }).querySelector(".count"),
		).toHaveTextContent("2");

		const row = container.querySelector("tbody tr") as HTMLElement;
		expect(row.querySelector(".codicon-shield")).not.toBeNull();
		const link = row.querySelector("a") as HTMLAnchorElement;
		expect(link).toHaveTextContent("NameRequired");
		expect(link).toHaveAttribute(
			"href",
			"#/boundedcontexts/catalog_bc/aggregates/pet/invariants/name_required",
		);
		expect(row.textContent).toContain("Pet.name must be non-empty");
	});

	it("adds the Constrains column only when the page asks for it", () => {
		const { container } = render(Demo);
		expect(headers(container)).not.toContain("Constrains");
		const withColumn = render(Demo, { constrains: true, dense: true });
		expect(headers(withColumn.container)).toEqual([
			"Invariant",
			"Constrains",
			"Description",
		]);
	});

	it("names an attribute target by its owner, and says whole aggregate when a rule names nothing", () => {
		const { container } = render(Demo, { constrains: true, dense: true });
		const cellOf = (ref: string) =>
			(
				container.querySelector(`tr#${CSS.escape(ref)}`) as HTMLElement
			).querySelectorAll("td")[1];

		const named = cellOf(
			"#/boundedcontexts/catalog_bc/aggregates/pet/invariants/name_required",
		);
		expect(named).toHaveTextContent("Pet.name");
		expect(named.querySelector("a")).toHaveAttribute(
			"href",
			"#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet/attributes/name",
		);

		// Two targets are comma-separated, the way every ref list reads in v2.
		const two = cellOf(
			"#/boundedcontexts/sales_bc/aggregates/order/invariants/deliver_only_when_approved",
		);
		expect(two.querySelectorAll("a")).toHaveLength(2);
		expect(two.textContent?.trim()).toBe("OrderStatus, ShipDate");

		const whole = cellOf(
			"#/boundedcontexts/main_context/aggregates/rootless_aggregate/invariants/whole_aggregate_invariant",
		);
		expect(whole.querySelector("a")).toBeNull();
		expect(whole.querySelector(".keyword")).toHaveTextContent(
			"whole aggregate",
		);
	});

	it("says what would fill it when nothing constrains the element", () => {
		const { container } = render(Demo, { empty: true });
		expect(container.querySelector("table")).toBeNull();
		expect(screen.getByText("No invariant names this entity.")).toHaveClass(
			"empty",
		);
	});
});
