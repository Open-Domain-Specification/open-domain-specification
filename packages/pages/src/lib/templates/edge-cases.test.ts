import {
	aggregateRef,
	boundedcontextRef,
	consumableRef,
	domainRef,
	entityRef,
	invariantRef,
	PATTERNS,
	policyRef,
	schemaRef,
	serviceRef,
	subdomainRef,
	teamRef,
	termRef,
	valueObjectRef,
	Workspace,
} from "@open-domain-specification/core";
import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { edgeCaseModel } from "../fixtures";
import Harness from "../Page.harness.svelte";

const model = edgeCaseModel();

function renderRef(ref: string) {
	return render(Harness, { model, ref }).container;
}

describe("templates render the alternate branches the petstore fixture never hits", () => {
	it("AggregatePage: no root entity, and an invariant with no named targets", () => {
		const text = renderRef(
			aggregateRef("main_context", "rootless_aggregate").$ref,
		).textContent;
		expect(text).toContain("no root entity");
		expect(text).toContain("Constrains the whole aggregate.");
	});

	it("AggregatePage: no entities at all", () => {
		const text = renderRef(
			aggregateRef("main_context", "empty_aggregate").$ref,
		).textContent;
		expect(text).toContain("No entities. An aggregate needs a root entity.");
	});

	it("ConsumablePage: schema with no attributes", () => {
		const text = renderRef(
			consumableRef(
				"main_context",
				"rootless_aggregate",
				"silent_operation",
				"aggregate",
			).$ref,
		).textContent;
		expect(text).toContain("The schema has no attributes.");
	});

	it("ConsumablePage: event never raised by any operation", () => {
		const text = renderRef(
			consumableRef(
				"main_context",
				"rootless_aggregate",
				"orphan_event",
				"aggregate",
			).$ref,
		).textContent;
		expect(text).toContain(
			"No operation raises this event. Is it ever emitted?",
		);
	});

	it("EntityPage: two identity attributes are comma-separated, and incoming relations are shown", () => {
		const text = renderRef(
			entityRef("main_context", "rootless_aggregate", "plain_entity").$ref,
		).textContent;
		expect(text).toMatch(/Id A,\s*Id B/);
		expect(text).toContain("Incoming");
		expect(text).toContain("Linking Value Object");
	});

	it("ValueObjectPage: unused, with no relations", () => {
		const text = renderRef(
			valueObjectRef(
				"main_context",
				"rootless_aggregate",
				"unused_value_object",
			).$ref,
		).textContent;
		expect(text).toContain("Nothing uses this value object as a type yet.");
		expect(text).toContain("No relations.");
	});

	it("ValueObjectPage: with a relation to another element", () => {
		const text = renderRef(
			valueObjectRef(
				"main_context",
				"rootless_aggregate",
				"linking_value_object",
			).$ref,
		).textContent;
		expect(text).toContain("Plain Entity");
	});

	it("InvariantPage: applies to the whole aggregate", () => {
		const text = renderRef(
			invariantRef(
				"main_context",
				"rootless_aggregate",
				"whole_aggregate_invariant",
			).$ref,
		).textContent;
		expect(text).toContain("Applies to the aggregate as a whole.");
	});

	it("InvariantPage: names both an entity and a value object target", () => {
		const text = renderRef(
			invariantRef("main_context", "rootless_aggregate", "linked_invariant")
				.$ref,
		).textContent;
		expect(text).toContain("Linking Value Object");
		expect(text).toContain("Plain Entity");
	});

	it("PolicyPage: triggered by nothing and issues nothing", () => {
		const text = renderRef(
			policyRef("main_context", "idle_policy").$ref,
		).textContent;
		expect(text).toContain("Triggered by nothing.");
		expect(text).toContain("Issues nothing.");
	});

	it("SchemaPage: nothing carries it", () => {
		const text = renderRef(
			schemaRef("main_context", "unused_schema").$ref,
		).textContent;
		expect(text).toContain("Nothing carries this schema yet.");
	});

	it("ServicePage: a service type outside the known kinds falls back to the raw value", () => {
		const text = renderRef(
			serviceRef("second_context", "odd_service").$ref,
		).textContent;
		expect(text).toContain("custom");
	});

	it("SubdomainPage: no bounded context serves it, and an unclassified type", () => {
		const text = renderRef(
			subdomainRef("domain_with_subdomains", "orphan_subdomain").$ref,
		).textContent;
		expect(text).toContain("No bounded context serves this subdomain yet.");
		expect(text).toContain("unclassified");
	});

	it("DomainPage: no subdomains yet", () => {
		const text = renderRef(domainRef("empty_domain").$ref).textContent;
		expect(text).toContain("No subdomains yet.");
	});

	it("TeamPage: owns nothing and reaches no subdomain", () => {
		const text = renderRef(teamRef("idle_team").$ref).textContent;
		expect(text).toContain("Owns no bounded context.");
		expect(text).toContain("No subdomains reached.");
	});

	it("TeamPage: copes with an owned context whose counts are missing", () => {
		const ws = new Workspace("Sizeless", {
			odsVersion: "1.0.0",
			description: "Exercises the missing-count fallback branch.",
			version: "0.0.1",
		});
		const team = ws.addTeam("Sizeless Team");
		const bc = ws.addBoundedContext("Sizeless Context", {
			description: "d",
			team,
		});
		// A minimal, deliberately malformed context: .size shadowed as missing,
		// as could happen with a partially-built or mocked context elsewhere.
		Object.defineProperty(bc.aggregates, "size", {
			value: undefined,
			configurable: true,
		});
		Object.defineProperty(bc.services, "size", {
			value: undefined,
			configurable: true,
		});
		const sizelessModel = {
			workspace: ws,
			fileLabel: "sizeless.ts",
			diagnostics: ws.validate(),
		};
		const { container } = render(Harness, {
			model: sizelessModel,
			ref: team.ref,
		});
		expect(container.querySelector("main")).toBeInTheDocument();
	});

	it("TermPage: not modelled", () => {
		const text = renderRef(termRef("main_context", "widget").$ref).textContent;
		expect(text).toContain(
			"Not modelled. Either the word is not needed, or the model is missing something.",
		);
	});

	it("TermPage: an embodied target with no name falls back to its ref", () => {
		const text = renderRef(
			termRef("main_context", "nameless").$ref,
		).textContent;
		expect(text).toContain(
			"#/boundedcontexts/main_context/aggregates/rootless_aggregate",
		);
	});

	it("TermPage: the same word used in another context", () => {
		const text = renderRef(termRef("main_context", "ticket").$ref).textContent;
		expect(text).toContain("Second Context");
		expect(text).toContain("Definition B, in the second context.");
	});

	it("ContextPage: no aggregates at all", () => {
		const text = renderRef(boundedcontextRef("thin_context").$ref).textContent;
		expect(text).toContain("No aggregates yet.");
	});

	it("ContextPage: unused schema chip, not-modelled term, and multi-role relationship", () => {
		const container = renderRef(boundedcontextRef("main_context").$ref);
		const text = container.textContent;
		expect(text).toContain("unused");
		// The strategic position table shows role abbreviations as chip text,
		// each one a hover card trigger that discloses what the keyword means.
		expect(text).toContain("OHS");
		expect(text).toContain("PL");
		expect(text).toContain("CF");
		expect(text).toContain("ACL");
		const triggers = [...container.querySelectorAll("button.chip")].map(
			(c) => c.textContent,
		);
		for (const pattern of [
			"open-host-service",
			"published-language",
			"conformist",
			"anti-corruption-layer",
		] as const)
			expect(triggers, pattern).toContain(PATTERNS[pattern].abbreviation);
	});

	it("ContextPage: copes with a context and a root entity that have no name", async () => {
		const nameless = new Workspace("Nameless", {
			odsVersion: "1.0.0",
			description:
				"Exercises the missing-name fallback for a context and a root.",
			version: "0.0.1",
		});
		const bc = nameless.addBoundedContext(
			// biome-ignore lint/suspicious/noExplicitAny: exercises the missing-name fallback branch
			undefined as any,
			{ description: "d", id: "nameless_bc" },
		);
		const aggregate = bc.addAggregate("Aggregate", { description: "d" });
		aggregate.addRootEntity(
			// biome-ignore lint/suspicious/noExplicitAny: exercises the missing-name fallback branch
			undefined as any,
			{ description: "d", id: "nameless_root" },
		);
		// A consumer/provider pair so the consumable map has a node too, and its
		// caption (also interpolating the nameless context's name) renders.
		const consumer = bc.addAggregate("Consumer", { description: "d" });
		const op = aggregate.provides("Op", {
			type: "operation",
			description: "d",
		});
		consumer.consumes(op, {});
		const namelessModel = {
			workspace: nameless,
			fileLabel: "nameless.ts",
			diagnostics: nameless.validate(),
		};
		const { container } = render(Harness, {
			model: namelessModel,
			ref: bc.ref,
		});
		expect(container.querySelector("main")).toBeInTheDocument();
		// Wait for both diagrams to finish rendering, so their captions (which
		// interpolate the nameless context's name) actually run.
		await waitFor(() => {
			expect(container.querySelectorAll("figcaption")).toHaveLength(2);
		});
	});

	it("figure captions cope with a nameless domain, subdomain, aggregate and service", () => {
		const ws = new Workspace("Nameless Captions", {
			odsVersion: "1.0.0",
			description: "Exercises the missing-name fallback in figure captions.",
			version: "0.0.1",
		});
		// biome-ignore lint/suspicious/noExplicitAny: exercises the missing-name fallback branch
		const noName = undefined as any;
		const domain = ws.addDomain(noName, {
			description: "d",
			id: "nameless_domain",
		});
		const subdomain = domain.addSubdomain(noName, {
			description: "d",
			id: "nameless_subdomain",
			type: "core",
		});
		const bc = ws.addBoundedContext("Context", { description: "d" });
		bc.serves(subdomain);
		const aggregate = bc.addAggregate(noName, {
			description: "d",
			id: "nameless_aggregate",
		});
		const root = aggregate.addRootEntity("Root", { description: "d" });
		const line = aggregate.addValueObject("Line", { description: "d" });
		root.includes(line, "lines");
		const service = bc.addService(noName, {
			description: "d",
			id: "nameless_service",
			type: "application",
		});
		const op = aggregate.provides("Op", {
			type: "operation",
			description: "d",
		});
		service.consumes(op, {});
		const namelessModel = {
			workspace: ws,
			fileLabel: "nameless-captions.ts",
			diagnostics: ws.validate(),
		};
		for (const [ref, caption] of [
			[domain.ref, "context map"],
			[subdomain.ref, "context map"],
			[aggregate.ref, "relation map"],
			[service.ref, "consumable map"],
		]) {
			const { container } = render(Harness, { model: namelessModel, ref });
			const captions = [...container.querySelectorAll("figcaption")].map(
				(c) => c.textContent,
			);
			expect(captions.join("|")).toContain(caption);
		}
	});
});
