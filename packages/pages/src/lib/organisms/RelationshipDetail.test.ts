import {
	type ContextRelationship,
	isSymmetricRelationship,
	PATTERNS,
} from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import { edgeCaseModel, petstoreModel } from "../fixtures";
import RelationshipDetail from "./RelationshipDetail.svelte";

const model = petstoreModel();
const relationships = model.workspace.relationships;
const asymmetric = relationships.find(
	(r) => !isSymmetricRelationship(r.type),
) as ContextRelationship;
const symmetric = relationships.find((r) =>
	isSymmetricRelationship(r.type),
) as ContextRelationship;
const detail = (relationship: ContextRelationship, heading?: "h1" | "h3") =>
	render(Harness, {
		model,
		component: RelationshipDetail,
		args: { relationship, heading },
	});

describe("RelationshipDetail", () => {
	it("titles itself with both context lockups, the arrow, the type and the disposition — no card around any of it", () => {
		const { container } = detail(asymmetric);
		const title = screen.getByRole("heading", { level: 3, name: /→/ });
		expect(title.querySelectorAll(".context")).toHaveLength(2);
		expect(title.querySelector(".arrow")).toHaveTextContent("→");
		expect(title.querySelector(".keyword")).toHaveTextContent(asymmetric.type);
		expect(container.querySelector(".card")).toBeNull();
		// Each part keeps its id so a page's table of contents can point at it.
		for (const id of ["roles", "comments", "crossings", "links"])
			expect(container.querySelector(`#${id}`)).toBeInTheDocument();
	});

	it("lists the roles as a definition per side, each role a code with its pattern's name and summary", () => {
		const { container } = detail(asymmetric);
		const roles = container.querySelector("#roles") as HTMLElement;
		expect(
			[...roles.querySelectorAll("dt")].map((dt) => dt.textContent),
		).toEqual(["Upstream", "Downstream"]);
		expect(roles.querySelector(".keyword.mono")).toBeInTheDocument();
		expect(roles.querySelector(".summary")).toHaveTextContent("—");
	});

	it("discloses the pattern and this relationship's evidence from the type and role keywords", async () => {
		const { container } = detail(asymmetric);
		const acl = PATTERNS["anti-corruption-layer"];
		const roles = container.querySelector("#roles") as HTMLElement;
		const term = [...roles.querySelectorAll(".pattern-hover")].find((el) =>
			el.textContent?.includes(acl.abbreviation),
		) as HTMLElement;
		await fireEvent.focusIn(term);
		const card = term.querySelector(".hover-card") as HTMLElement;
		expect(card.querySelector(".heading")).toHaveTextContent(acl.name);
		expect(card).toHaveTextContent(acl.summary);
		expect(card).toHaveTextContent("PetSummaryClient");

		// The type keyword in the title is the same disclosure, so the reader
		// never meets a pattern code on this block that teaches nothing.
		const title = screen.getByRole("heading", { level: 3, name: /→/ });
		expect(title.querySelector(".pattern-hover")).toBeInTheDocument();
	});

	it("states a symmetric relationship's pattern once, above both sides, with the ↔ arrow", () => {
		const { container } = detail(symmetric);
		expect(container.querySelector(".arrow")).toHaveTextContent("↔");
		const roles = container.querySelector("#roles") as HTMLElement;
		expect(roles.querySelector("dl")).toBeNull();
		expect(roles.querySelector(".summary")).toBeInTheDocument();
	});

	it("falls back to the relationship's own pattern for a side that plays no role", () => {
		const edge = edgeCaseModel();
		const bare = edge.workspace.relationships[0];
		bare.downstreamRoles.length = 0;
		const { container } = render(Harness, {
			model: edge,
			component: RelationshipDetail,
			args: { relationship: bare },
		});
		const rows = container.querySelectorAll("#roles dd");
		expect(rows[1].querySelector(".keyword.mono")).toBeNull();
		expect(rows[1].querySelector(".summary")).toBeInTheDocument();
	});

	it("takes the page's title level and says what is missing where nothing is recorded", () => {
		const edge = edgeCaseModel();
		const bare = edge.workspace.relationships[0];
		render(Harness, {
			model: edge,
			component: RelationshipDetail,
			args: { relationship: bare, heading: "h1" },
		});
		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
		expect(
			screen.getByText("No description on this relationship."),
		).toBeInTheDocument();
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

	it("shows a link's url when nobody gave it a label", () => {
		const fresh = petstoreModel();
		const relationship = fresh.workspace.relationships.find((r) =>
			r.comments.some((c) => c.link),
		) as ContextRelationship;
		const link = relationship.comments.find((c) => c.link)?.link as NonNullable<
			(typeof relationship.comments)[number]["link"]
		>;
		link.label = undefined;
		render(Harness, {
			model: fresh,
			component: RelationshipDetail,
			args: { relationship },
		});
		expect(
			screen.getAllByRole("link", { name: link.url }).length,
		).toBeGreaterThan(0);
	});

	it("tables the consumables that cross the boundary, with their patterns and the links behind them", () => {
		const withCrossings = relationships.find(
			(r) => r.comments.length > 0,
		) as ContextRelationship;
		const { container } = detail(withCrossings);
		const crossings = container.querySelector("#crossings") as HTMLElement;
		expect(
			[...crossings.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Consumable", "Pattern", "Consumed by", "Disposition"]);
		expect(crossings.querySelectorAll("tbody tr").length).toBeGreaterThan(0);

		const links = container.querySelector("#links") as HTMLElement;
		expect(links.querySelector("a")).toHaveAttribute(
			"rel",
			"external noreferrer",
		);
	});
});
