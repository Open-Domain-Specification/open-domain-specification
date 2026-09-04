import {
	aggregateRef,
	consumableRef,
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
		const petstore = petstoreModel();
		const { container } = render(Harness, {
			model: petstore,
			ref: entityRef("inventory_bc", "inventory_projection", "inventory_view")
				.$ref,
		});
		expect(container.textContent).toContain("no identity attribute marked");
		expect(container.textContent).toContain("No attributes.");
	});

	it("ValueObjectPage: unused, with no relations", () => {
		const text = textOf(
			valueObjectRef(
				"main_context",
				"rootless_aggregate",
				"unused_value_object",
			).$ref,
		);
		expect(text).toContain("Nothing uses this value object as a type yet.");
		expect(text).toContain("No relations.");
		expect(text).toContain("No invariant names this value object.");
	});

	it("ValueObjectPage: a relation carries its cardinality as a code keyword", () => {
		const { container } = render(Harness, {
			model,
			ref: valueObjectRef(
				"main_context",
				"rootless_aggregate",
				"linking_value_object",
			).$ref,
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
