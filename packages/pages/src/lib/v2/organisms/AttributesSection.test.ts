import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./AttributesSection.harness.svelte";

const cells = (row: Element) =>
	[...row.querySelectorAll("td")].map((td) => td.textContent?.trim());

describe("AttributesSection", () => {
	it("heads the section with the attribute count and a sentence-case header row", () => {
		const { container } = render(Demo);
		expect(
			screen.getByRole("heading", { level: 2 }).querySelector(".count"),
		).toHaveTextContent("6");
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["", "Attribute", "Type", "Description"]);
		// The key column is 16px, so the name column starts where the eye expects.
		expect(
			(container.querySelectorAll("thead th")[0] as HTMLElement).style.width,
		).toBe("16px");
	});

	it("marks only the identity attribute with the key codicon", () => {
		const { container } = render(Demo);
		const keys = container.querySelectorAll("tbody .codicon-key");
		expect(keys).toHaveLength(1);
		expect(keys[0]).toHaveAttribute("title", "identity");
		const first = container.querySelector("tbody tr") as HTMLElement;
		expect(first.querySelector(".codicon-key")).not.toBeNull();
		expect(cells(first).slice(1, 3)).toEqual(["id", "int64"]);
	});

	it("anchors each row at the attribute's ref, links a type that is a value object, and prints the rest as code", () => {
		const { container } = render(Demo);
		const row = container.querySelector(
			"tr#\\#\\/boundedcontexts\\/catalog_bc\\/aggregates\\/pet\\/entities\\/pet\\/attributes\\/category",
		) as HTMLElement;
		const link = row.querySelector("a") as HTMLAnchorElement;
		expect(link).toHaveTextContent("Category");
		expect(link).toHaveAttribute(
			"href",
			"#/boundedcontexts/catalog_bc/aggregates/pet/valueobjects/category",
		);
		// A plain type is code, not a link.
		const plain = container.querySelectorAll("tbody tr")[1] as HTMLElement;
		expect(plain.querySelector("a")).toBeNull();
		expect(cells(plain).slice(1, 3)).toEqual(["name", "string"]);
	});

	it("prints a description where there is one and leaves the cell empty otherwise", () => {
		const { container } = render(Demo, { dense: true });
		const described = container.querySelector(
			"tr#\\#\\/boundedcontexts\\/sales_bc\\/aggregates\\/order\\/entities\\/order\\/attributes\\/pet_id",
		) as HTMLElement;
		expect(cells(described).at(-1)).toBe(
			"Identity of the Pet root in Catalog; only the id crosses the boundary",
		);
		const undescribed = container.querySelector("tbody tr") as HTMLElement;
		expect(cells(undescribed).at(-1)).toBe("");
	});

	it("says what would fill the section when the element has no attributes", () => {
		const { container } = render(Demo, { empty: true });
		expect(container.querySelector("table")).toBeNull();
		expect(screen.getByText("No attributes.")).toHaveClass("empty");
		expect(
			screen.getByRole("heading", { level: 2 }).querySelector(".count"),
		).toHaveTextContent("0");
	});
});
