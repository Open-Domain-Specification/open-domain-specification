import type { BoundedContext } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../Page.harness.svelte";
import { petstoreModel } from "../fixtures";

const model = petstoreModel();
const sales = model.workspace.boundedcontexts.get("sales_bc") as BoundedContext;

describe("ContextPage strategic position", () => {
	it("renders the grouped strategic position table with a description column, and no evidence chrome", () => {
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
			[...container.querySelectorAll("table.strategic-position .description")]
				.some((td) => td.textContent && td.textContent.trim().length > 0),
		).toBe(true);
		// No sheets are supplied yet, so the toggle and disposition columns
		// (and any expandable detail) are left out entirely.
		expect(container.querySelector("td.toggle")).toBeNull();
		expect(
			[...container.querySelectorAll("table.strategic-position th")].some(
				(th) => th.textContent === "Disposition",
			),
		).toBe(false);
	});
});
