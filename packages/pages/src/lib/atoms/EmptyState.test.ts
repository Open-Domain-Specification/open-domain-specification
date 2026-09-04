import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./EmptyState.harness.svelte";
import EmptyState from "./EmptyState.svelte";

describe("EmptyState", () => {
	it("is one sentence in the secondary colour", () => {
		const { container } = render(EmptyState, { text: "Provides nothing." });
		const p = container.querySelector("p.empty");
		expect(p).toHaveTextContent("Provides nothing.");
		expect(p?.querySelector("a")).toBeNull();
	});

	it("can carry one action after the sentence", () => {
		render(Demo);
		const action = screen.getByRole("link", {
			name: "Reconcile with the skill",
		});
		expect(action.closest("p.empty")).toHaveTextContent(
			/No comments recorded for this relationship yet\. Reconcile with the skill/,
		);
	});
});
