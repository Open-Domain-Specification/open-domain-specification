import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./DefinitionList.harness.svelte";

describe("DefinitionList", () => {
	it("lays terms and values out as dt/dd pairs in one list", () => {
		const { container } = render(Demo);
		const dl = container.querySelector("dl.definitions") as HTMLElement;
		expect(dl).toBeInTheDocument();
		const terms = [...dl.querySelectorAll("dt")].map((t) => t.textContent);
		expect(terms).toEqual(["Root", "Context", "Owned by", "Identity"]);
		expect(dl.querySelectorAll("dd")).toHaveLength(4);
		expect(dl.querySelector("dd")).toHaveTextContent("Pet");
	});

	it("keeps its rhythm with ten rows", () => {
		const { container } = render(Demo, { dense: true });
		expect(container.querySelectorAll("dt")).toHaveLength(10);
	});
});
