import type { BoundedContext } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel, rivermartModel } from "../fixtures";
import ContextLockup from "./ContextLockup.svelte";

const contexts = [...petstoreModel().workspace.boundedcontexts.values()];
const clean = contexts.find(
	(bc) => !bc.bigBallOfMud && !bc.boundaryOnly,
) as BoundedContext;
const unread = contexts.find((bc) => bc.boundaryOnly) as BoundedContext;
// Petstore's one unread context is boundary-only rather than a mess, so the
// mud lockup is drawn from RiverMart's legacy purchasing (card 132).
const mud = [...rivermartModel().workspace.boundedcontexts.values()].find(
	(bc) => bc.bigBallOfMud,
) as BoundedContext;

describe("ContextLockup", () => {
	it("is the class symbol and the name as a link, and nothing else", () => {
		// `context` and `title` are both Svelte mount options as well as props
		// of ours, so every render here passes them under `props`.
		const { container } = render(ContextLockup, { props: { context: clean } });
		expect(screen.getByRole("link", { name: clean.name })).toHaveAttribute(
			"href",
			clean.ref,
		);
		expect(
			container.querySelector(".codicon-symbol-class"),
		).toBeInTheDocument();
		expect(container.querySelector(".keyword")).toBeNull();
	});

	it("warns after the name when the model calls the context a big ball of mud", () => {
		const { container } = render(ContextLockup, {
			props: { context: mud, title: "Sales depends on Identity." },
		});
		const keyword = container.querySelector(".keyword") as HTMLElement;
		expect(keyword).toHaveTextContent("big ball of mud");
		expect(keyword).toHaveClass("warn");
		expect(container.querySelector(".context")).toHaveAttribute(
			"title",
			"Sales depends on Identity.",
		);
	});

	// The third context flag reads as a plain keyword after the name: nobody
	// has interviewed it, which is not a warning about its model (card 132).
	it("says after the name when the context is modelled at its boundary only", () => {
		const { container } = render(ContextLockup, { props: { context: unread } });
		const keyword = container.querySelector(".keyword") as HTMLElement;
		expect(keyword).toHaveTextContent("boundary only");
		expect(keyword).not.toHaveClass("warn");
	});
});
