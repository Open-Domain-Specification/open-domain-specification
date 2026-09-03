import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Chip from "./Chip.svelte";

describe("Chip", () => {
	it("applies the given tone as a class", () => {
		const { container } = render(Chip, { label: "core", tone: "core" });
		const span = container.querySelector(".chip");
		expect(span).toHaveClass("core");
		expect(span).toHaveTextContent("core");
	});

	it("falls back to no tone class when none is given", () => {
		const { container } = render(Chip, { label: "plain" });
		const span = container.querySelector(".chip");
		expect(span?.className.trim()).toBe("chip");
		expect(span).toHaveTextContent("plain");
	});

	it("falls back to no tone class when tone is explicitly nullish", () => {
		const { container } = render(Chip, {
			label: "plain",
			tone: null as unknown as "",
		});
		const span = container.querySelector(".chip");
		expect(span?.className.trim()).toBe("chip");
	});

	it("shows a title when one is given", () => {
		const { container } = render(Chip, { label: "x", title: "explains x" });
		expect(container.querySelector(".chip")).toHaveAttribute(
			"title",
			"explains x",
		);
	});
});
