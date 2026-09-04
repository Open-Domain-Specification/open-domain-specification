import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Crumbs from "./Crumbs.svelte";

describe("Crumbs", () => {
	it("links every crumb and puts one separator between them, never after the last", () => {
		const { container } = render(Crumbs, {
			crumbs: [
				["#", "Swagger Petstore (v3)"],
				["#/domains/petstore_commerce", "Petstore Commerce"],
			] as [string, string][],
		});
		expect(container.querySelectorAll("a")).toHaveLength(2);
		expect(container.querySelectorAll(".sep")).toHaveLength(1);
		expect(container.querySelector("a")).toHaveAttribute("href", "#");
	});
});
