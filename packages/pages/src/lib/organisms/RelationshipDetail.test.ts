import {
	type ContextRelationship,
	PATTERNS,
	Workspace,
} from "@open-domain-specification/core";
import { render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import { petstoreModel } from "../fixtures";
import type { Model } from "../model";
import RelationshipDetail from "./RelationshipDetail.svelte";

const model = petstoreModel();
const of = (type: string) =>
	model.workspace.relationships.find(
		(r) => r.type === type,
	) as ContextRelationship;

const show = (
	relationship: ContextRelationship,
	extra: Record<string, unknown> = {},
	m: Model = model,
) =>
	render(Harness, {
		model: m,
		component: RelationshipDetail,
		args: { relationship, ...extra },
	});

describe("RelationshipDetail", () => {
	it("titles a symmetric relationship with a double arrow, its type and its disposition", () => {
		const { container } = show(of("shared-kernel"));
		const heading = screen.getByRole("heading", { level: 3 });
		expect(heading).toHaveTextContent("Catalog BC ↔ Inventory BC");
		expect(within(container).getByText("shared-kernel")).toHaveAttribute(
			"title",
			PATTERNS["shared-kernel"].summary,
		);
		expect(screen.getByText("refactor")).toHaveClass("warn");
	});

	it("uses an arrow for a directed relationship and names each side's role", () => {
		show(of("customer-supplier"));
		expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(
			"Catalog BC → Sales BC",
		);
		expect(screen.getByText("upstream")).toBeInTheDocument();
		expect(screen.getByText("downstream")).toBeInTheDocument();
		expect(screen.getByText("open-host-service")).toBeInTheDocument();
		expect(
			screen.getByText(PATTERNS["anti-corruption-layer"].summary),
		).toBeInTheDocument();
	});

	it("gives a symmetric relationship neither side chips nor a repeated summary", () => {
		const { container } = show(of("partnership"));
		expect(container.querySelectorAll(".patterns")).toHaveLength(0);
		expect(screen.queryByText("participant")).not.toBeInTheDocument();
		expect(screen.queryByText("upstream")).not.toBeInTheDocument();
		expect(screen.queryByText("downstream")).not.toBeInTheDocument();
		// The pattern is stated once, above both context cards.
		expect(screen.getAllByText(PATTERNS.partnership.summary)).toHaveLength(1);
		expect(screen.getByText("Sales BC")).toBeInTheDocument();
		expect(screen.getByText("Fulfilment BC")).toBeInTheDocument();
	});

	it("falls back to the relationship's own meaning when a directed side has no role", () => {
		const workspace = new Workspace("Roleless", {
			id: "roleless",
			odsVersion: "1.0.0",
			description:
				"A directed relationship where neither side declares a role.",
			version: "0.0.1",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		const r = a.upstreamOf(b);
		show(r, {}, { workspace, fileLabel: "roleless.json", diagnostics: [] });
		expect(screen.getByText("upstream")).toBeInTheDocument();
		expect(
			screen.getAllByText(PATTERNS["upstream-downstream"].summary),
		).toHaveLength(2);
	});

	it("lists the comments and the crossing consumables, with each consumable's own disposition", () => {
		const { container } = show(of("customer-supplier"));
		expect(
			screen.getByText(/Sales reads Catalog through PetSummaryClient/),
		).toBeInTheDocument();
		const crossings = container.querySelector(".crossings") as HTMLElement;
		const names = [
			...crossings.querySelectorAll("tbody tr td:first-child"),
		].map((td) => td.textContent?.trim());
		expect(names).toEqual(
			expect.arrayContaining(["GetPetSummary", "ReservePet"]),
		);
		const reserve = [...crossings.querySelectorAll("tbody tr")].find((tr) =>
			tr.textContent?.includes("ReservePet"),
		) as HTMLElement;
		expect(within(reserve).getByText("refactor")).toBeInTheDocument();
		expect(within(reserve).getByText("OHS")).toBeInTheDocument();
		expect(within(reserve).getByText("ACL")).toBeInTheDocument();
	});

	it("deduplicates the links and puts the decision first", () => {
		const { container } = show(of("customer-supplier"));
		const links = [...container.querySelectorAll(".links li")].map((li) =>
			li.textContent?.trim(),
		);
		expect(links[0]).toContain("decision");
		expect(new Set(links).size).toBe(links.length);
	});

	it("says what is missing when nobody has written anything down", () => {
		show(of("separate-ways"));
		expect(
			screen.getByText("No comments recorded for this relationship yet."),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"Nothing crosses this boundary; the relationship is strategic only.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"No links yet. The skill's reconciliation pass fills these in.",
			),
		).toBeInTheDocument();
	});

	it("renders as a page heading when it stands alone", () => {
		show(of("shared-kernel"), { heading: "h1" });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			"Catalog BC ↔ Inventory BC",
		);
	});

	it("copes with a relationship that has no description and traffic with no declared pattern", () => {
		const workspace = new Workspace("Plain", {
			id: "plain",
			odsVersion: "1.0.0",
			description: "One undescribed relationship carrying unpatterned traffic.",
			version: "0.0.1",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		const provider = a.addAggregate("Thing", { description: "Provides." });
		const consumer = b.addAggregate("Other", { description: "Consumes." });
		const consumable = provider.addConsumable("Do It", {
			type: "operation",
			description: "No declared pattern on either end.",
		});
		consumer.consumes(consumable, {});
		const r = a.upstreamOf(b, {
			comments: [
				{
					text: "Cited, but the citation has no name of its own.",
					link: { kind: "code", url: "https://example.com/x.ts" },
				},
			],
		});
		const model: Model = {
			workspace,
			fileLabel: "plain.json",
			diagnostics: [],
		};
		const { container } = show(r, {}, model);
		expect(
			screen.getByText("No description on this relationship."),
		).toBeInTheDocument();
		const crossings = container.querySelector(".crossings") as HTMLElement;
		expect(crossings.querySelectorAll("tbody tr")).toHaveLength(1);
		expect(crossings.querySelectorAll("tbody .chip")).toHaveLength(0);
		// An unlabelled link falls back to its url wherever it is shown.
		expect(
			within(container.querySelector(".links") as HTMLElement).getByRole(
				"link",
				{ name: "https://example.com/x.ts" },
			),
		).toBeInTheDocument();
	});
});
