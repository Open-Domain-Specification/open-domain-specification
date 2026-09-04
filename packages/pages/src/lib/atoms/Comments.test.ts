import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Comments from "./Comments.svelte";

describe("Comments", () => {
	it("lists each statement behind a comment icon, citing its link by kind icon and label", () => {
		const { container } = render(Comments, {
			comments: [
				{
					text: "The kernel is one package.",
					link: {
						kind: "code",
						url: "https://example.com/kernel",
						label: "packages/kernel",
					},
				},
				{ text: "Nobody has written down why." },
			],
		});
		expect(container.querySelectorAll("li")).toHaveLength(2);
		expect(container.querySelectorAll(".codicon-comment")).toHaveLength(2);
		const link = screen.getByRole("link", { name: "packages/kernel" });
		expect(link).toHaveAttribute("href", "https://example.com/kernel");
		expect(link).toHaveAttribute("rel", "external noreferrer");
		expect(link).toHaveAttribute("title", "code");
		expect(link.querySelector(".codicon-code")).toBeInTheDocument();
		expect(container.querySelectorAll("a")).toHaveLength(1);
	});

	it("falls back to the url when a link carries no label", () => {
		render(Comments, {
			comments: [
				{
					text: "Cited but unnamed.",
					link: { kind: "adr", url: "https://example.com/adr-1" },
				},
			],
		});
		const link = screen.getByRole("link", {
			name: "https://example.com/adr-1",
		});
		expect(link).toHaveAttribute("title", "decision");
		expect(link.querySelector(".codicon-notebook")).toBeInTheDocument();
	});

	it("says so when the sheet is empty, with the caller's wording when given", () => {
		render(Comments, { comments: [] });
		expect(screen.getByText("No comments recorded yet.")).toBeInTheDocument();
		render(Comments, { comments: [], empty: "Nothing written down yet." });
		expect(screen.getByText("Nothing written down yet.")).toBeInTheDocument();
	});
});
