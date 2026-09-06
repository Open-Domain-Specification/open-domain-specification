import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { edgeCaseModel, petstoreModel } from "../fixtures";
import SubdomainTable from "./SubdomainTable.svelte";

const petstore = petstoreModel().workspace;
const subdomains = [...[...petstore.domains.values()][0].subdomains.values()];
const headers = (container: HTMLElement) =>
	[...container.querySelectorAll("thead th")].map((th) =>
		th.textContent?.trim(),
	);

describe("SubdomainTable", () => {
	it("is one row per subdomain, with the classification as a keyword and the contexts serving it", () => {
		const { container } = render(SubdomainTable, {
			subdomains,
			empty: "No subdomains yet.",
		});
		expect(headers(container)).toEqual([
			"Subdomain",
			"Classification",
			"Served by",
			"Description",
		]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(
			subdomains.length,
		);
		expect(
			container.querySelector(`tr[id="${subdomains[0].ref}"]`),
		).toBeInTheDocument();
		// The classification carries its meaning as a hover, not a colour.
		const keyword = container.querySelector(
			"tbody td:nth-child(2) .keyword",
		) as HTMLElement;
		expect(keyword.title).toContain("the differentiator");
	});

	it("sorts by classification, which is what replaces v1's colour", async () => {
		const { container } = render(SubdomainTable, {
			subdomains,
			empty: "No subdomains yet.",
		});
		await fireEvent.click(
			screen.getByRole("button", { name: "Classification" }),
		);
		const classifications = [
			...container.querySelectorAll("tbody td:nth-child(2)"),
		].map((td) => td.textContent?.trim());
		expect(classifications).toEqual([...classifications].sort());
	});

	it("leaves the contexts out where they are not the point, and says so when nothing serves a subdomain", () => {
		const edge = edgeCaseModel().workspace;
		const all = [...edge.domains.values()].flatMap((d) => [
			...d.subdomains.values(),
		]);
		const { container } = render(SubdomainTable, {
			subdomains: all,
			empty: "No subdomains reached.",
		});
		expect(headers(container)).toContain("Served by");
		expect(screen.getByText("no context")).toHaveClass("keyword");
		// A type outside the three classifications keeps its own word, with no hover.
		const odd = screen.getByText("unclassified");
		expect(odd).not.toHaveAttribute("title");

		const noContexts = render(SubdomainTable, {
			subdomains: all,
			servedBy: false,
			empty: "No subdomains reached.",
		});
		expect(headers(noContexts.container)).not.toContain("Served by");
	});

	it("says what would fill it when there is nothing to list", () => {
		render(SubdomainTable, { subdomains: [], empty: "No subdomains yet." });
		expect(screen.getByText("No subdomains yet.")).toHaveClass("empty");
	});
});
