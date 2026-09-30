import {
	type ContextRelationship,
	relationshipTitle,
} from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import { rivermartModel } from "../fixtures";
import RelationshipTitle from "./RelationshipTitle.svelte";

const model = rivermartModel();
const [lookup, feed] = model.workspace.relationships.filter((r) => r.name);
const unnamed = model.workspace.relationships.find(
	(r) => !r.name,
) as ContextRelationship;

/** The parts a reader sees, in order, whitespace as a reader hears it. */
const read = (container: HTMLElement) =>
	[...container.querySelectorAll(".name, .arrow, .agreement")]
		.map((n) => n.textContent?.replace(/\s+/g, " ").trim())
		.join(" ");

describe("RelationshipTitle", () => {
	it("reads as relationshipTitle does and follows the relationship it is given (#74)", async () => {
		const { container, rerender } = render(Harness, {
			model,
			component: RelationshipTitle,
			args: { relationship: lookup },
		});
		expect(read(container)).toBe(relationshipTitle(lookup));

		await rerender({
			model,
			component: RelationshipTitle,
			args: { relationship: feed },
		});
		expect(read(container)).toBe(relationshipTitle(feed));

		await rerender({
			model,
			component: RelationshipTitle,
			args: { relationship: unnamed },
		});
		expect(container.querySelector(".agreement")).toBeNull();
		expect(read(container)).toBe(relationshipTitle(unnamed));
	});

	it("keeps the dot on the name's line", () => {
		const { container } = render(Harness, {
			model,
			component: RelationshipTitle,
			args: { relationship: lookup },
		});
		expect(container.querySelector(".agreement")?.textContent).toBe(
			`· ${lookup.name}`,
		);
	});
});
