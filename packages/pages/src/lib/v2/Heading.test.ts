import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./Heading.harness.svelte";

describe("Heading", () => {
	it("renders the three levels as h1, h2 and h3 with ids and leads where given", () => {
		const { container } = render(Demo);
		expect(container.querySelector("h1.heading")).toHaveTextContent("Pet");
		const structure = container.querySelector("h2#structure") as HTMLElement;
		expect(structure).toHaveClass("h2");
		expect(structure.nextElementSibling).toHaveClass("lead");
		expect(structure.nextElementSibling).toHaveTextContent(
			/Entities have identity/,
		);
		expect(container.querySelectorAll("h3.heading")).toHaveLength(2);
		// A level-3 heading with no lead has no lead paragraph after it.
		const valueObjects = [...container.querySelectorAll("h3")].at(
			-1,
		) as HTMLElement;
		expect(valueObjects.nextElementSibling).toHaveClass("empty");
	});

	it("carries the platform badge for a count, nothing at zero, and nothing when there is no count", () => {
		const { container } = render(Demo);
		const counts = [...container.querySelectorAll(".count")].map(
			(c) => c.textContent,
		);
		// Value objects is counted at zero: the empty sentence says so, the badge does not.
		expect(counts).toEqual(["5", "1"]);
		const valueObjects = [...container.querySelectorAll("h3")].at(
			-1,
		) as HTMLElement;
		expect(valueObjects.querySelector(".count")).toBeNull();
		const bare = render(Demo, { withCounts: false });
		expect(bare.container.querySelector(".count")).toBeNull();
	});
});
