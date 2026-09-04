import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "./PageHeader.harness.svelte";

describe("PageHeader", () => {
	it("puts the trail, the title lockup, the classifying word, the description and the facts in that order", () => {
		const { container } = render(Harness);
		const crumbs = container.querySelectorAll(".crumbs a");
		expect([...crumbs].map((a) => a.textContent)).toEqual([
			"Swagger Petstore (v3)",
			"Petstore Commerce",
		]);
		// One separator between two crumbs, never a trailing one.
		expect(container.querySelectorAll(".crumbs .sep")).toHaveLength(1);

		const title = screen.getByRole("heading", { level: 1 });
		expect(title).toHaveTextContent("Catalog");
		// The kind is the lockup's detail, not an uppercase eyebrow above it.
		expect(title.querySelector(".detail")).toHaveTextContent("Subdomain");
		expect(title.querySelector(".id")).toHaveTextContent("catalog");

		expect(container.querySelector(".meta")).toHaveTextContent("core");
		expect(screen.getByText(/Pet definitions/)).toBeInTheDocument();
		expect(container.querySelector("dt")).toHaveTextContent("Classification");
	});

	it("draws no trail, no keyword line and no facts on a page that has none", () => {
		const { container } = render(Harness, { bare: true });
		expect(container.querySelector(".crumbs")).toBeNull();
		expect(container.querySelector(".meta")).toBeNull();
		expect(container.querySelector("dl")).toBeNull();
		expect(container.querySelector(".md")).toBeNull();
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Swagger Petstore (v3)",
		);
	});
});
