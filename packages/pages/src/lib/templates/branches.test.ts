import {
	aggregateRef,
	policyRef,
	serviceRef,
	Workspace,
} from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import type { Model } from "../model";
import Harness from "../Page.harness.svelte";

/**
 * The shapes neither the petstore nor the shared edge-case fixture happens to
 * contain: a relation with no label, an operation raising more than one event,
 * a service that publishes an event and keeps an operation to itself, an
 * element two glossary terms name, and a page with a diagnostic to show. Built
 * here with the workspace builder rather than added to the shared fixture,
 * which `edge-cases.test.ts` asserts against element by element.
 */
function tacticalEdges(): Model {
	const workspace = new Workspace("Tactical Edges", {
		id: "tactical",
		odsVersion: "1.0.0",
		description:
			"Shapes the tactical templates draw that no other fixture has.",
		version: "0.0.1",
	});
	const bc = workspace.addBoundedContext("Edge Context", {
		description: "Holds the one aggregate and the one service.",
	});
	const aggregate = bc.addAggregate("Edge Aggregate", {
		description: "One root, one relation without a label.",
	});
	const root = aggregate.addEntity("Edge Root", {
		description:
			"The root, which points at a value object without naming the link.",
		root: true,
	});
	root.addAttribute("id", { type: "string", identity: true });
	const vo = bc.addValueObject("Edge Value", {
		description: "The target of the unlabelled relation.",
	});
	root.addRelation(vo, { relation: "uses", cardinality: "1" });
	// An incoming relation that does name its link, so the incoming table's
	// label column has something to draw; the shared edge-case fixture only has
	// an incoming relation without one.
	const neighbour = aggregate.addEntity("Edge Neighbour", {
		description: "Points back at the root, and names the link.",
	});
	neighbour.addRelation(root, {
		relation: "references",
		label: "points-at",
		cardinality: "1",
	});

	// A kind of the root and a kind of the value object, so the two tactical
	// pages have their "A kind of" and "Kinds" facts and their inherited
	// attribute group to draw (decision 22).
	const kind = aggregate.addEntity("Edge Kind", {
		description: "A kind of the root: it has the root's id and one more field.",
		specialises: root,
	});
	kind.addAttribute("kindOnly", { type: "string" });
	bc.addValueObject("Edge Value Kind", {
		description: "A kind of the value object, declared in the same context.",
		specialises: vo,
	});

	const first = aggregate.addConsumable("First Happened", {
		type: "event",
		description: "One of the two events the operation raises.",
	});
	const second = aggregate.addConsumable("Second Happened", {
		type: "event",
		description: "The other, so the raises list needs its separator.",
	});
	aggregate
		.addConsumable("Raise Both", {
			type: "operation",
			description: "Raises two events at once.",
			pattern: "open-host-service",
		})
		.raises(first, second);

	const service = bc.addService("Edge Service", {
		description: "Publishes an event and keeps an operation to itself.",
		type: "application",
	});
	service.addConsumable("Service Observed", {
		type: "event",
		description: "An event provided by a service, not by an aggregate.",
	});
	service
		.addConsumable("Service Raises Both", {
			type: "operation",
			description:
				"The service's own operation, which nothing outside may call.",
			internal: true,
		})
		.raises(first, second);

	// A policy that waits on an answer rather than an event: the shape an
	// operation this context calls comes back with (decision 23). Two of them,
	// because the provider column has two readings — the operation that answers,
	// and nothing at all where the model names a shape nothing answers with,
	// which is what a reader sees while a model is half-written.
	const answering = workspace.addBoundedContext("Answering Context", {
		description: "Answers the edge context's one call.",
	});
	const answeringApi = answering.addService("Answering API", {
		description: "The boundary the edge context asks through.",
		type: "application",
	});
	const verdict = answering.addSchema("Verdict", {
		description: "What the call comes back with.",
	});
	const unanswered = answering.addSchema("Unanswered Shape", {
		description: "A shape no operation the edge context calls answers with.",
	});
	const score = answeringApi.addConsumable("Score", {
		type: "operation",
		description: "Answers its caller with a verdict.",
		pattern: "open-host-service",
		returns: verdict,
	});
	const askForScore = service.addConsumable("Ask For Score", {
		type: "operation",
		description: "The edge context's own step: it makes the call.",
		internal: true,
	});
	service.consumes(score, { pattern: "conformist", by: [askForScore] });
	bc.addPolicy("Act on the verdict", {
		description: "Waits for the answer to come back, and acts on it.",
	})
		.on(verdict, unanswered)
		.issues(askForScore);

	// Two words of the language name the same element, so the terms list needs
	// its separator.
	bc.addTerm("Edge", {
		definition: "What the root is called here.",
		embodiedBy: root,
	});
	bc.addTerm("Boundary", {
		definition: "What the root is also called.",
		embodiedBy: root,
	});

	return {
		workspace,
		fileLabel: "tactical-edges.ts",
		diagnostics: [
			{
				severity: "warning",
				rule: "aggregate-should-be-evidenced",
				message: "Edge Aggregate has nothing recorded about the real system.",
				ref: aggregate.ref,
			},
		],
	};
}

const model = tacticalEdges();
const draw = (ref: string) => render(Harness, { model, ref }).container;
/** The page header's facts, as term to what it says. */
const facts = (container: Element) =>
	Object.fromEntries(
		[...container.querySelectorAll("dt")].map((t) => [
			t.textContent?.trim(),
			t.nextElementSibling?.textContent?.trim(),
		]),
	);

describe("the tactical templates on the shapes no shared fixture carries", () => {
	it("EntityPage: a relation with no label leaves its cell empty rather than inventing one", () => {
		const container = draw(
			"#/boundedcontexts/edge_context/aggregates/edge_aggregate/entities/edge_root",
		);
		const outgoing = [
			...container.querySelectorAll("#relations table.data"),
		][0];
		const cells = [...(outgoing?.querySelectorAll("tbody td") ?? [])].map((c) =>
			c.textContent?.trim(),
		);
		expect(cells).toEqual(["uses", "Edge Value", "1", ""]);
	});

	it("EntityPage: an incoming relation carries the label the link was given", () => {
		const container = draw(
			"#/boundedcontexts/edge_context/aggregates/edge_aggregate/entities/edge_root",
		);
		const incoming = [
			...container.querySelectorAll("#relations table.data"),
		][1];
		expect(incoming?.textContent).toContain("Edge Neighbour");
		expect(incoming?.textContent).toContain("points-at");
	});

	it("EntityPage: a kind names what it is a kind of, and its parent names its kinds", () => {
		const kind = draw(
			"#/boundedcontexts/edge_context/aggregates/edge_aggregate/entities/edge_kind",
		);
		expect(facts(kind)["A kind of"]).toBe("Edge Root");
		// It has no identity of its own; the one it is identified by is the
		// root's, and the fact reads it as the kind's.
		expect(facts(kind).Identity).toBe("id");
		// Own attributes first, then a group naming where the rest come from.
		const groups = [...kind.querySelectorAll("#attributes tr.group th")].map(
			(th) => th.textContent?.trim(),
		);
		expect(groups).toEqual(["Inherited from Edge Root"]);
		expect(kind.querySelector("#attributes .count")?.textContent).toContain(
			"2",
		);

		const parent = draw(
			"#/boundedcontexts/edge_context/aggregates/edge_aggregate/entities/edge_root",
		);
		expect(facts(parent).Kinds).toBe("Edge Kind");
		expect(facts(parent)["A kind of"]).toBeUndefined();
		expect(parent.querySelector("#attributes tr.group")).toBeNull();
	});

	it("ValueObjectPage: a kind names what it is a kind of, and its parent names its kinds", () => {
		const kind = draw(
			"#/boundedcontexts/edge_context/valueobjects/edge_value_kind",
		);
		expect(facts(kind)["A kind of"]).toBe("Edge Value");
		const parent = draw(
			"#/boundedcontexts/edge_context/valueobjects/edge_value",
		);
		expect(facts(parent).Kinds).toBe("Edge Value Kind");
		expect(facts(parent)["A kind of"]).toBeUndefined();
	});

	it("ConsumablePage: an operation raising two events separates them", () => {
		const container = draw(
			"#/boundedcontexts/edge_context/aggregates/edge_aggregate/provides/raise_both",
		);
		expect(container.querySelector("#raises .refs")?.textContent).toMatch(
			/First Happened,\s*Second Happened/,
		);
	});

	it("LanguageSection: two terms naming one element are comma-separated links", () => {
		const container = draw(
			"#/boundedcontexts/edge_context/aggregates/edge_aggregate/entities/edge_root",
		);
		const terms = container.querySelector("#language .terms");
		expect(terms?.textContent).toMatch(/Edge,\s*Boundary/);
		expect(terms?.querySelectorAll("a.ref").length).toBe(2);
	});

	it("AggregatePage: an operation raising two events lists both, and the section shows its problem", () => {
		const container = draw(aggregateRef("edge_context", "edge_aggregate").$ref);
		expect(container.querySelector("#boundary .problems")).toBeInTheDocument();
		expect(
			container.querySelector("#boundary .problems .warning"),
		).toBeInTheDocument();
		expect(container.textContent).toContain(
			"Edge Aggregate has nothing recorded about the real system.",
		);
		const raises = [...container.querySelectorAll("#behaviour dt")].find(
			(t) => t.textContent === "Raises",
		)?.nextElementSibling;
		expect(raises?.textContent).toMatch(/First Happened,\s*Second Happened/);
	});

	it("ProvidesTable: a service may publish an event and keep an operation internal", () => {
		const container = draw(serviceRef("edge_context", "edge_service").$ref);
		const rows = [...container.querySelectorAll("table.data tbody tr")];
		const text = rows.map((r) => r.textContent ?? "");
		expect(
			text.some((t) => t.includes("Service Observed") && t.includes("event")),
		).toBe(true);
		expect(
			text.some(
				(t) => t.includes("Service Raises Both") && t.includes("internal"),
			),
		).toBe(true);
		// The internal operation raises two events, so the raises cell lists both
		// inside one `Joined`, whose comma is drawn by the stylesheet.
		const raises = [...container.querySelectorAll("table.data tbody .joined")]
			.map((j) => [...j.querySelectorAll("a.ref")].map((a) => a.textContent))
			.find((names) => names.includes("First Happened"));
		expect(raises).toEqual(["First Happened", "Second Happened"]);
	});

	it("AggregatePage: a consumable with two consumers lists both", () => {
		const container = render(Harness, {
			model: petstoreModel(),
			ref: aggregateRef("sales_bc", "order").$ref,
		}).container;
		const consumed = [...container.querySelectorAll("#behaviour dt")]
			.filter((t) => t.textContent === "Consumed by")
			.map((t) => t.nextElementSibling?.textContent ?? "");
		expect(consumed.some((t) => t.split(",").length > 1)).toBe(true);
	});

	it("PolicyPage: an answer is a row of its own, naming the operation it comes back from", () => {
		const container = draw(
			policyRef("edge_context", "act_on_the_verdict").$ref,
		);
		const rows = [...container.querySelectorAll("#when tbody tr")].map((r) =>
			[...r.querySelectorAll("td")].map((c) => c.textContent?.trim()),
		);
		// The shape, marked as an answer, with the operation that answers with it
		// in the provider column and the context that owns the shape beside it.
		expect(rows[0]).toEqual([
			"Verdict",
			"answer",
			"Score",
			"Answering Context",
			"What the call comes back with.",
		]);
		// And the half-written case: a shape nothing this context calls answers
		// with has no operation to name, which the row says rather than leaving
		// the cell blank.
		expect(rows[1]?.slice(0, 3)).toEqual([
			"Unanswered Shape",
			"answer",
			"nothing",
		]);
	});
});
