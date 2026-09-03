import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import FactList from "./FactList.svelte";

describe("FactList", () => {
	it("shows each statement, and cites its link by kind when it has one", () => {
		const { container } = render(FactList, {
			facts: [
				{
					text: "The kernel is one package.",
					link: {
						kind: "code" as const,
						url: "https://example.com/kernel",
						label: "packages/kernel",
					},
				},
				{ text: "Nobody has written down why." },
			],
		});
		expect(screen.getByText(/The kernel is one package\./)).toBeInTheDocument();
		const link = screen.getByRole("link", { name: "code: packages/kernel" });
		expect(link).toHaveAttribute("href", "https://example.com/kernel");
		expect(link).toHaveAttribute("title", "packages/kernel");
		// The unlinked statement still stands as a fact.
		expect(container.querySelectorAll("li")).toHaveLength(2);
		expect(container.querySelectorAll("a")).toHaveLength(1);
	});

	it("falls back to the url when a link carries no label", () => {
		render(FactList, {
			facts: [
				{
					text: "Cited but unnamed.",
					link: { kind: "adr" as const, url: "https://example.com/adr-1" },
				},
			],
		});
		expect(
			screen.getByRole("link", {
				name: "decision: https://example.com/adr-1",
			}),
		).toBeInTheDocument();
	});

	it("says so when the sheet is empty, with the caller's wording when given", () => {
		render(FactList, { facts: [] });
		expect(screen.getByText("No facts recorded yet.")).toBeInTheDocument();
		render(FactList, { facts: [], empty: "Nothing written down yet." });
		expect(screen.getByText("Nothing written down yet.")).toBeInTheDocument();
	});
});
