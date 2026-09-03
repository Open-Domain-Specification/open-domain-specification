import { fireEvent, render, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreSales } from "../fixtures";
import Harness from "../Page.harness.svelte";

const { model, context: sales } = petstoreSales();

describe("ContextPage strategic position", () => {
	it("renders the grouped strategic position table with a description column", () => {
		const { container } = render(Harness, { model, ref: sales.ref });
		const headings = [...container.querySelectorAll("tr.group th")].map(
			(th) => th.textContent,
		);
		expect(headings).toEqual([
			"Depends on",
			"Depended on by",
			"Works alongside",
		]);
		expect(
			[
				...container.querySelectorAll("table.strategic-position .description"),
			].some((td) => td.textContent && td.textContent.trim().length > 0),
		).toBe(true);
	});

	it("discloses the evidence the petstore records, and expands a row in place", async () => {
		const { container } = render(Harness, { model, ref: sales.ref });
		expect(
			[...container.querySelectorAll("table.strategic-position th")].some(
				(th) => th.textContent === "Disposition",
			),
		).toBe(true);
		// Sales → Inventory is the one Sales relationship not by design.
		expect(
			[...container.querySelectorAll("tr.position .chip")].map(
				(c) => c.textContent,
			),
		).toContain("tolerated");

		const toggle = within(container).getByRole("button", {
			name: "Evidence for Catalog BC and Sales BC",
		});
		await fireEvent.click(toggle);
		const detail = container.querySelector(".detail-row") as HTMLElement;
		expect(
			within(detail).getByRole("heading", { name: /Catalog BC → Sales BC/ }),
		).toBeInTheDocument();
		expect(
			within(detail).getByText(/Sales reads Catalog through PetSummaryClient/),
		).toBeInTheDocument();
	});
});
