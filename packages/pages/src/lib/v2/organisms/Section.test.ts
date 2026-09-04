import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./Section.harness.svelte";

describe("Section", () => {
	it("anchors the section, heads it with a level-2 heading, its lead and its count badge", () => {
		const { container } = render(Demo);
		const section = container.querySelector("section") as HTMLElement;
		expect(section).toHaveAttribute("id", "position");
		const heading = screen.getByRole("heading", { level: 2 });
		expect(heading).toHaveTextContent("Strategic position");
		expect(heading.querySelector(".count")).toHaveTextContent("5");
		expect(screen.getByText(/Who this context depends on/)).toHaveClass("lead");
		// The v1 header rule is gone; the space above the heading carries it.
		expect(container.querySelector("header")).toBeNull();
	});

	it("leaves the badge off when the section lists nothing countable", () => {
		render(Demo, { counted: false });
		expect(
			screen.getByRole("heading", { level: 2 }).querySelector(".count"),
		).toBeNull();
	});

	it("draws no problems list when the section has none", () => {
		const { container } = render(Demo);
		expect(container.querySelector(".problems")).toBeNull();
	});

	it("draws each diagnostic as a Problems-panel row: glyph, rule, message, link", () => {
		const { container } = render(Demo, { problems: true });
		const rows = container.querySelectorAll(".problems li");
		expect(rows).toHaveLength(2);

		const [warning, error] = rows;
		expect(warning.querySelector(".codicon-warning")).toHaveClass("warning");
		expect(error.querySelector(".codicon-error")).toHaveClass("error");

		const rule = warning.querySelector(".keyword") as HTMLElement;
		expect(rule).toHaveTextContent("relationship-has-no-comments");
		// A rule id is a code from a table, so it is set in the editor font.
		expect(rule).toHaveClass("mono");
		expect(warning).toHaveTextContent(
			"Sales BC → Inventory BC has no comments.",
		);

		const link = warning.querySelector("a") as HTMLAnchorElement;
		expect(link).toHaveTextContent("go to");
		expect(link).toHaveAttribute(
			"href",
			"#/relationships/sales_bc~upstream-downstream~inventory_bc",
		);
	});
});
