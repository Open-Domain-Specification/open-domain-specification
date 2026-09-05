import {
	aggregateRef,
	consumableRef,
	contextInvariantRef,
	entityRef,
	invariantRef,
	policyRef,
	schemaRef,
	serviceRef,
	termRef,
	valueObjectRef,
} from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { edgeCaseModel, petstoreModel } from "../fixtures";
import Harness from "../Page.harness.svelte";

/**
 * The branches the petstore never reaches: an aggregate with no root, an
 * element with nothing to list, a consumable nobody consumes. v1 had the same
 * suite; this one asserts the v2 sentence and the v2 treatment — a keyword in
 * the error tone rather than a warn chip, an `EmptyState` rather than an
 * italic placeholder.
 */
const model = edgeCaseModel();
const textOf = (ref: string) =>
	render(Harness, { model, ref }).container.textContent ?? "";

describe("the tactical templates on the alternate branches", () => {
	it("AggregatePage: says a missing root is an error, and an invariant may bind the whole aggregate", () => {
		const { container } = render(Harness, {
			model,
			ref: aggregateRef("main_context", "rootless_aggregate").$ref,
		});
		expect(container.querySelector(".keyword.error")).toHaveTextContent(
			"no root entity",
		);
		expect(container.textContent).toContain("whole aggregate");
	});

	it("ContextPage: lists the rules the context keeps, with what each names", () => {
		const { container } = render(Harness, {
			model,
			ref: "#/boundedcontexts/main_context",
		});
		const section = container.querySelector("#invariants") as HTMLElement;
		expect(section.querySelector("h2")).toHaveTextContent("Invariants");
		const rows = [...section.querySelectorAll("tbody tr")].map(
			(r) => r.textContent ?? "",
		);
		expect(rows).toHaveLength(2);
		expect(rows[0]).toContain("Cross-Instance Invariant");
		expect(rows[0]).toContain("Plain Entity");
		expect(rows[0]).toContain("Silent Operation");
		// A rule naming nothing binds the whole boundary, and here that is the
		// context rather than an aggregate.
		expect(rows[1]).toContain("whole context");
	});

	it("InvariantPage: a context's rule says which kind it is and which boundary keeps it", () => {
		const { container } = render(Harness, {
			model,
			ref: contextInvariantRef("main_context", "cross_instance_invariant").$ref,
		});
		expect(container.querySelector(".page-header .keyword")).toHaveTextContent(
			"context invariant",
		);
		const facts = container.querySelector(".page-header dd") as HTMLElement;
		expect(facts).toHaveTextContent("Main Context");
		expect(facts.querySelector("a")).toHaveAttribute(
			"href",
			"#/boundedcontexts/main_context",
		);
		expect(container.textContent).toContain(
			"no one instance can see the others",
		);
		const guards = container.querySelector("#guards") as HTMLElement;
		expect(guards.textContent).toContain("Silent Operation");
	});

	it("InvariantPage: an unguarded context rule says nothing keeps it, and binds the context as a whole", () => {
		const { container } = render(Harness, {
			model,
			ref: contextInvariantRef("main_context", "unguarded_context_invariant")
				.$ref,
		});
		expect(container.textContent).toContain(
			"Applies to the context as a whole.",
		);
		expect(container.textContent).toContain(
			"a rule across instances needs a guard",
		);
	});

	it("InvariantPage: an aggregate's rule still says it is the aggregate that keeps it", () => {
		const { container } = render(Harness, {
			model,
			ref: invariantRef(
				"main_context",
				"rootless_aggregate",
				"linked_invariant",
			).$ref,
		});
		expect(container.querySelector(".page-header .keyword")).toHaveTextContent(
			"aggregate invariant",
		);
		expect(container.querySelector(".page-header dd")).toHaveTextContent(
			"Rootless Aggregate",
		);
	});

	it("AggregatePage: an operation an aggregate provides shows what it answers with, and one that answers with nothing shows no Returns", () => {
		const { container } = render(Harness, {
			model,
			ref: aggregateRef("main_context", "rootless_aggregate").$ref,
		});
		const subsectionFor = (name: string) =>
			[...container.querySelectorAll(".subsection")].find((s) =>
				s.querySelector("h3")?.textContent?.includes(name),
			);

		const answering = subsectionFor("Answering Operation");
		const terms = [...(answering?.querySelectorAll("dt") ?? [])].map(
			(t) => t.textContent,
		);
		expect(terms).toContain("Payload");
		expect(terms).toContain("Returns");
		expect(answering?.textContent).toContain("Answer Schema");

		// Silent Operation carries a payload but answers with nothing, so the
		// row is absent rather than empty.
		const silent = subsectionFor("Silent Operation");
		expect(
			[...(silent?.querySelectorAll("dt") ?? [])].map((t) => t.textContent),
		).not.toContain("Returns");
	});

	it("AggregatePage: an aggregate with nothing in it says what would fill each section", () => {
		const text = textOf(aggregateRef("main_context", "empty_aggregate").$ref);
		expect(text).toContain("No entities. An aggregate needs a root entity.");
		expect(text).toContain("No value objects.");
		expect(text).toContain("No operations. How does state change?");
		expect(text).toContain(
			"No events. Nothing outside will ever know what happened here.",
		);
		expect(text).toContain(
			"No invariants stated. If nothing can go wrong, is this really an aggregate?",
		);
	});

	it("EntityPage: two identity attributes are comma-separated and the entity may point at nothing", () => {
		const text = textOf(
			entityRef("main_context", "rootless_aggregate", "plain_entity").$ref,
		);
		expect(text).toMatch(/Id A,\s*Id B/);
		expect(text).toContain("Points at nothing.");
		// The linking value object points back, so the incoming table draws.
		expect(text).toContain("Linking Value Object");
		expect(text).toContain("No glossary term names this element.");
	});

	it("EntityPage: an entity with no identity attribute and no attributes says so", () => {
		const text = textOf(
			entityRef("main_context", "rootless_aggregate", "bare_entity").$ref,
		);
		expect(text).toContain("no identity attribute marked");
		expect(text).toContain("No attributes.");
	});

	it("ValueObjectPage: unused, with no relations", () => {
		const text = textOf(
			valueObjectRef("main_context", "unused_value_object").$ref,
		);
		expect(text).toContain("Nothing uses this value object as a type yet.");
		expect(text).toContain("No relations.");
		expect(text).toContain("No invariant names this value object.");
	});

	it("ValueObjectPage: a relation carries its cardinality as a code keyword", () => {
		const { container } = render(Harness, {
			model,
			ref: valueObjectRef("main_context", "linking_value_object").$ref,
		});
		const relations = container.querySelector("#relations");
		expect(relations?.textContent).toContain("Plain Entity");
		expect(relations?.querySelector(".keyword.mono")).toHaveTextContent("1");
	});

	it("ServicePage: an unknown service type falls back to the raw value, and a consumption may name no protection", () => {
		expect(textOf(serviceRef("second_context", "odd_service").$ref)).toContain(
			"custom",
		);
		const petstore = petstoreModel();
		const { container } = render(Harness, {
			model: petstore,
			ref: serviceRef("inventory_bc", "inventory_query").$ref,
		});
		expect(container.textContent).toContain("unspecified");
	});

	it("ServicePage: a service that provides nothing and consumes nothing says so", () => {
		const text = textOf(serviceRef("second_context", "odd_service").$ref);
		expect(text).toContain("Provides nothing.");
		expect(text).toContain("Depends on nothing outside itself.");
	});

	it("ConsumablePage: a schema with no attributes, and an operation no policy issues", () => {
		const text = textOf(
			consumableRef(
				"main_context",
				"rootless_aggregate",
				"silent_operation",
				"aggregate",
			).$ref,
		);
		expect(text).toContain("The schema has no attributes.");
		expect(text).toContain(
			"No policy issues this operation; it comes from users or application services.",
		);
		expect(text).toContain(
			"Raises nothing. Its effect is invisible to the rest of the system.",
		);
		expect(text).toContain("No comments recorded for this consumable yet.");
		expect(text).toContain("Nobody consumes this yet.");
	});

	it("ConsumablePage: an event with no schema and no raiser", () => {
		const text = textOf(
			consumableRef(
				"main_context",
				"rootless_aggregate",
				"orphan_event",
				"aggregate",
			).$ref,
		);
		expect(text).toContain("No schema declared.");
		expect(text).toContain(
			"No operation raises this event. Is it ever emitted?",
		);
		expect(text).toContain("No policy reacts to this event.");
	});

	it("ConsumablePage: an internal consumable is nobody's to consume", () => {
		const petstore = petstoreModel();
		const { container } = render(Harness, {
			model: petstore,
			ref: consumableRef("catalog_bc", "pet", "change_pet_status", "aggregate")
				.$ref,
		});
		expect(container.textContent).toContain("Internal to the context.");
	});

	it("InvariantPage: applies to the whole aggregate", () => {
		expect(
			textOf(
				invariantRef(
					"main_context",
					"rootless_aggregate",
					"whole_aggregate_invariant",
				).$ref,
			),
		).toContain("Applies to the aggregate as a whole.");
	});

	it("PolicyPage: triggered by nothing and issues nothing", () => {
		const text = textOf(policyRef("main_context", "idle_policy").$ref);
		expect(text).toContain("Triggered by nothing.");
		expect(text).toContain("Issues nothing.");
	});

	it("SchemaPage: nothing carries it", () => {
		expect(textOf(schemaRef("main_context", "unused_schema").$ref)).toContain(
			"Nothing carries this schema yet.",
		);
	});

	it("SchemaPage: one operation sends and answers with the same shape, listed once", () => {
		const text = textOf(schemaRef("main_context", "echoed_schema").$ref);
		expect(text).toContain("Echoing Operation");
		// One row, both directions on it, rather than the consumable listed twice.
		expect(text).toContain("payload, returns");
		expect(text.split("Echoing Operation")).toHaveLength(2);
	});

	it("TermPage: not modelled, and a word only one context uses", () => {
		const text = textOf(termRef("main_context", "widget").$ref);
		expect(text).toContain(
			"Not modelled. Either the word is not needed, or the model is missing something.",
		);
		expect(text).toContain("Only this context uses the word.");
	});

	it("TermPage: an embodied target with no name falls back to its ref", () => {
		expect(textOf(termRef("main_context", "nameless").$ref)).toContain(
			"#/boundedcontexts/main_context/aggregates/rootless_aggregate",
		);
	});
});
