import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Keyword from "./Keyword.svelte";

describe("Keyword", () => {
	it("is plain text with no tone by default", () => {
		const { container } = render(Keyword, { text: "event" });
		const span = container.querySelector(".keyword");
		expect(span).toHaveTextContent("event");
		expect(span).not.toHaveClass("mono");
		expect(span).not.toHaveClass("warn");
		expect(span).not.toHaveClass("error");
		expect(span).not.toHaveAttribute("title");
	});

	it("sets codes in the editor font", () => {
		const { container } = render(Keyword, { text: "OHS", mono: true });
		expect(container.querySelector(".keyword")).toHaveClass("mono");
	});

	it("takes a diagnostic tone only when asked, and explains itself on hover", () => {
		const warn = render(Keyword, {
			text: "big ball of mud",
			tone: "warn",
			title: "Not coherent.",
		});
		expect(warn.container.querySelector(".keyword")).toHaveClass("warn");
		expect(warn.container.querySelector(".keyword")).toHaveAttribute(
			"title",
			"Not coherent.",
		);
		const error = render(Keyword, { text: "no root", tone: "error" });
		expect(error.container.querySelector(".keyword")).toHaveClass("error");
	});
});
