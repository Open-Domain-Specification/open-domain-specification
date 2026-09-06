import {
	aggregateRef,
	consumableRef,
	contextInvariantRef,
	entityRef,
	invariantRef,
	policyRef,
	processRef,
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
		expect(rows).toHaveLength(4);
		expect(rows[0]).toContain("Cross-Instance Invariant");
		expect(rows[0]).toContain("Plain Entity");
		expect(rows[0]).toContain("Silent Operation");
		// A rule naming nothing binds the whole boundary, and here that is the
		// context rather than an aggregate.
		expect(rows[1]).toContain("whole context");
	});

	it("InvariantPage: a postcondition says it is a guarantee about the answer", () => {
		const { container } = render(Harness, {
			model,
			ref: invariantRef(
				"main_context",
				"rootless_aggregate",
				"answer_guarantee",
			).$ref,
		});
		expect(container.querySelector(".page-header .keyword")).toHaveTextContent(
			"postcondition",
		);
		const guards = container.querySelector("#guards") as HTMLElement;
		expect(guards).toHaveTextContent("Answering Operation");
		expect(guards.querySelector("p")?.textContent).toContain("guarantee about");
		// What it constrains is a field of the shape the call answers with.
		expect(container.querySelector("#constrains")).toHaveTextContent("Result");
	});

	it("PolicyPage: a completion is a trigger with no shape, linked to the call", () => {
		const { container } = render(Harness, {
			model,
			ref: policyRef("main_context", "completion_policy").$ref,
		});
		const when = container.querySelector("#when") as HTMLElement;
		expect(when).toHaveTextContent("completes");
		expect(when).toHaveTextContent("completion");
		// No shape to link to, so the name links to the call that came back.
		expect(
			[...when.querySelectorAll("a")].map((a) => a.getAttribute("href")),
		).toContain(
			"#/boundedcontexts/main_context/aggregates/rootless_aggregate/provides/silent_operation",
		);
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
			"a rule across instances is kept only by whoever checks it",
		);
		// A context's rule is checked, never guaranteed, so its section says so.
		expect(container.querySelector("#guards h2")).toHaveTextContent(
			"Checked by",
		);
	});

	// A context's rule is a check either way, and the heading says which side of
	// the call it is made on (decision 27, third amendment).
	it("InvariantPage: a context precondition says it is checked before", () => {
		const { container } = render(Harness, {
			model,
			ref: contextInvariantRef("main_context", "checked_before_invariant").$ref,
		});
		expect(container.querySelector("#guards h2")).toHaveTextContent(
			"Checked before",
		);
		expect(container.textContent).toContain(
			"The operations this rule is checked before.",
		);
	});

	it("InvariantPage: a context postcondition says it is checked after", () => {
		const { container } = render(Harness, {
			model,
			ref: contextInvariantRef("main_context", "checked_after_invariant").$ref,
		});
		expect(container.querySelector("#guards h2")).toHaveTextContent(
			"Checked after",
		);
		expect(container.textContent).toContain(
			"The operations this rule is checked of.",
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

	it("AggregatePage: an operation an aggregate provides names every shape it refuses with, and one that refuses with nothing shows no Rejects with", () => {
		const { container } = render(Harness, {
			model,
			ref: aggregateRef("main_context", "rootless_aggregate").$ref,
		});
		const subsectionFor = (name: string) =>
			[...container.querySelectorAll(".subsection")].find((s) =>
				s.querySelector("h3")?.textContent?.includes(name),
			);

		const refusing = subsectionFor("Refusing Operation");
		expect(
			[...(refusing?.querySelectorAll("dt") ?? [])].map((t) => t.textContent),
		).toContain("Rejects with");
		// Both refusals are named, comma-joined, the way Raises lists its events.
		expect(refusing?.textContent).toContain("Refusal Schema");
		expect(refusing?.textContent).toContain("Over Limit Schema");

		// Answering Operation returns a shape but refuses with none, so the row
		// is absent rather than empty.
		expect(
			[
				...(subsectionFor("Answering Operation")?.querySelectorAll("dt") ?? []),
			].map((t) => t.textContent),
		).not.toContain("Rejects with");
	});

	it("AggregatePage: an operation whose request is a list of a shape says so where the payload reads", () => {
		const { container } = render(Harness, {
			model,
			ref: aggregateRef("main_context", "rootless_aggregate").$ref,
		});
		const subsectionFor = (name: string) =>
			[...container.querySelectorAll(".subsection")].find((s) =>
				s.querySelector("h3")?.textContent?.includes(name),
			);
		const terms = (name: string) =>
			[...(subsectionFor(name)?.querySelectorAll("dt") ?? [])].map(
				(t) => t.textContent,
			);
		// The same treatment an answer that is a list gets, in the same place.
		expect(terms("Importing Operation")).toContain("Payload, many");
		expect(terms("Listing Operation")).toContain("Returns many");
		// One of the shape says nothing about how many, as it always has.
		expect(terms("Answering Operation")).toContain("Payload");
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
		expect(text).toContain("This value keeps no rule of its own.");
		expect(text).toContain("No aggregate's rule names this value object.");
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
		// PetApp consumes its own aggregate's operations: inside one context
		// there is no boundary to protect, so no downstream role is declared.
		const { container } = render(Harness, {
			model: petstore,
			ref: serviceRef("catalog_bc", "pet_app").$ref,
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

	it("ConsumablePage: a refusal that enumerates its outcomes names them under the shape", () => {
		const text = textOf(
			consumableRef(
				"main_context",
				"rootless_aggregate",
				"refusing_operation",
				"aggregate",
			).$ref,
		);
		// The outcomes the contract states, under the shape that carries them;
		// a refusal that enumerates none says nothing extra.
		expect(text).toContain("Refuses for");
		expect(text).toContain("daily_limit");
		expect(text).toContain("per_txn_limit");
		expect(text).toContain("Refusal Schema");
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

	it("InvariantPage: a value's rule says it holds by construction and names its owner", () => {
		const text = textOf(
			`${valueObjectRef("main_context", "ruled_value_object").$ref}/invariants/value_invariant`,
		);
		expect(text).toContain("value invariant");
		expect(text).toContain("Ruled Value Object");
		expect(text).toContain("Nothing guards a value's rule.");
	});

	it("InvariantPage: applies to the whole value", () => {
		expect(
			textOf(
				`${valueObjectRef("main_context", "ruled_value_object").$ref}/invariants/whole_value_invariant`,
			),
		).toContain("Applies to the value as a whole.");
	});

	it("ValueObjectPage: lists the value's own rules apart from the ones that name it", () => {
		const { container } = render(Harness, {
			model,
			ref: valueObjectRef("main_context", "ruled_value_object").$ref,
		});
		const own = container.querySelector("#invariants") as HTMLElement;
		expect(own.querySelector("h2")).toHaveTextContent("Invariants");
		expect(own.textContent).toContain("Value Invariant");
		expect(own.textContent).toContain("whole value");
		const named = container.querySelector("#constrained-by") as HTMLElement;
		expect(named.textContent).toContain(
			"No aggregate's rule names this value object.",
		);
	});

	it("PolicyPage: triggered by nothing and issues nothing", () => {
		const text = textOf(policyRef("main_context", "idle_policy").$ref);
		expect(text).toContain("Triggered by nothing.");
		expect(text).toContain("Issues nothing.");
	});

	it("ProcessPage: an empty lifecycle says so at each of its four points", () => {
		const { container } = render(Harness, {
			model,
			ref: processRef("main_context", "idle_process").$ref,
		});
		const text = container.textContent ?? "";
		expect(text).toContain("Nothing begins an instance.");
		expect(text).toContain("Waits for nothing else once it has started.");
		expect(text).toContain("Issues nothing.");
		expect(text).toContain(
			"Nothing completes an instance, so the model never says how it finishes.",
		);
		// A process is an intent like any other, so what the architecture thinks
		// of it and what is known about the real one read on the page.
		expect(
			[...container.querySelectorAll(".page-header dt")].map(
				(dt) => dt.textContent,
			),
		).toEqual(["Lives in", "Disposition"]);
		expect(text).toContain("Two cron jobs and a spreadsheet, in truth.");
	});

	// A clock says how long and, where the process anchors it, from what: the
	// two together are the whole of a limit nobody outside can see
	// (decision 23, fifth amendment).
	it("ProcessPage: an anchored deadline says how long it waits and from what", () => {
		const { container } = render(Harness, {
			model,
			ref: processRef("main_context", "timed_process").$ref,
		});
		expect(container.querySelector("#ends")).toHaveTextContent(
			"after two working days from Orphan Event",
		);
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

	it("ConsumablePage: an operation that refuses in two shapes draws a table for each", () => {
		const text = textOf(
			`${aggregateRef("main_context", "rootless_aggregate").$ref}/provides/refusing_operation`,
		);
		expect(text).toContain("Refusal Schema");
		expect(text).toContain("Over Limit Schema");
		// The attributes of both, not just the names in the fact row.
		expect(text).toContain("Reason");
		expect(text).toContain("Limit");
	});

	it("SchemaPage: a shape that is only ever refused with says so, rather than reading as carried by nothing", () => {
		const text = textOf(schemaRef("main_context", "refusal_schema").$ref);
		expect(text).toContain("Refusing Operation");
		expect(text).toContain("rejects with");
		expect(text).not.toContain("Nothing carries this schema yet");
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
