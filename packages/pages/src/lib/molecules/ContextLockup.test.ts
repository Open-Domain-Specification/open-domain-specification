import type { BoundedContext } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import ContextLockup from "./ContextLockup.svelte";

const contexts = [...petstoreModel().workspace.boundedcontexts.values()];
const clean = contexts.find((bc) => !bc.bigBallOfMud) as BoundedContext;
const mud = contexts.find((bc) => bc.bigBallOfMud) as BoundedContext;

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
});
