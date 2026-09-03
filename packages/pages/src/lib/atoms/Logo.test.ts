import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Logo from "./Logo.svelte";

describe("Logo", () => {
	it("renders the three-segment mark at the default size, hidden from assistive tech", () => {
		const { container } = render(Logo);
		const svg = container.querySelector("svg.logo") as SVGElement;
		expect(svg.getAttribute("width")).toBe("24");
		expect(svg.getAttribute("aria-hidden")).toBe("true");
		expect(svg.querySelectorAll("path").length).toBe(3);
	});

	it("scales to the requested size", () => {
		const { container } = render(Logo, { size: 40 });
		expect(container.querySelector("svg")?.getAttribute("height")).toBe("40");
	});
});
