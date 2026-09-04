import {
	type BoundedContext,
	Workspace,
} from "@open-domain-specification/core";
import northbank from "../../../../models/northbank/.ods/northbank.json";
import petstore from "../../../../models/petstore/.ods/petstore.json";
import rivermart from "../../../../models/rivermart/.ods/rivermart.json";
import streamline from "../../../../models/streamline/.ods/streamline.json";
import type { Model } from "./model";

/** The petstore example as a model, for stories and component tests. */
export function petstoreModel(): Model {
	const workspace = Workspace.fromSchema(
		petstore as Parameters<typeof Workspace.fromSchema>[0],
	);
	return {
		workspace,
		fileLabel: "petstore.json",
		diagnostics: workspace.validate(),
	};
}

/**
 * The petstore seen from Sales, which every evidence surface uses: Sales is
 * the one context that touches all four others, so its strategic position
 * fills each of the three groups and shows a marked relationship, a silent
 * one and a well-evidenced one at once.
 */
export function petstoreSales(): { model: Model; context: BoundedContext } {
	const model = petstoreModel();
	return {
		model,
		context: model.workspace.boundedcontexts.get("sales_bc") as BoundedContext,
	};
}

/**
 * A hand-built workspace exercising the alternate branches the petstore
 * fixture never reaches: teams that own nothing, aggregates without a root,
 * empty schemas, orphan glossary terms, a duplicate term name across
 * contexts, and so on. Built with the `Workspace` builder API rather than a
 * raw schema so every ref is correct by construction.
 */
export function edgeCaseModel(): Model {
	const workspace = new Workspace("Edge Cases", {
		id: "edge",
		odsVersion: "1.0.0",
		description:
			"Hand-built workspace covering branches the petstore example never hits.",
		version: "0.0.1",
	});

	const teamBusy = workspace.addTeam("Busy Team", {
		description: "Owns a bounded context.",
	});
	workspace.addTeam("Idle Team", { description: "Owns nothing." });

	const domainFull = workspace.addDomain("Domain With Subdomains", {
		description: "Has both a served and an orphan subdomain.",
	});
	const subServed = domainFull.addSubdomain("Served Subdomain", {
		description: "Served by a bounded context.",
		type: "core",
	});
	domainFull.addSubdomain("Orphan Subdomain", {
		description: "Served by nothing, and classified oddly.",
		// biome-ignore lint/suspicious/noExplicitAny: exercises the unknown-type fallback branch
		type: "unclassified" as any,
	});
	workspace.addDomain("Empty Domain", { description: "Has no subdomains." });

	const bcMain = workspace.addBoundedContext("Main Context", {
		description: "Owns the interesting edge cases.",
		subdomains: [subServed],
		team: teamBusy,
	});

	const aggNoRoot = bcMain.addAggregate("Rootless Aggregate", {
		description: "Has entities, but none of them is the root.",
	});
	const ePlain = aggNoRoot.addEntity("Plain Entity", {
		description: "Not a root.",
	});
	ePlain.addAttribute("Id A", { type: "string", identity: true });
	ePlain.addAttribute("Id B", { type: "string", identity: true });
	aggNoRoot.addValueObject("Unused Value Object", {
		description: "Never used as an attribute type, and has no relations.",
	});
	const voLinker = aggNoRoot.addValueObject("Linking Value Object", {
		description: "Points at the plain entity.",
	});
	voLinker.addRelation(ePlain, { relation: "references", cardinality: "1" });
	aggNoRoot.addInvariant("Whole-Aggregate Invariant", {
		description: "Constrains nothing named in particular.",
	});
	aggNoRoot
		.addInvariant("Linked Invariant", {
			description: "Names the plain entity and the linking value object.",
		})
		.constrains(ePlain, voLinker);

	const schemaEmpty = bcMain.addSchema("Empty Schema", {
		description: "Declares no attributes.",
	});
	const schemaUnused = bcMain.addSchema("Unused Schema", {
		description: "Nothing carries this payload.",
	});
	schemaUnused.addAttribute("Field", { type: "string" });
	const schemaEchoed = bcMain.addSchema("Echoed Schema", {
		description: "Sent and returned by the same operation.",
	});
	schemaEchoed.addAttribute("Field", { type: "string" });
	const schemaAnswer = bcMain.addSchema("Answer Schema", {
		description: "Only ever returned, never sent.",
	});
	schemaAnswer.addAttribute("Result", { type: "string" });

	aggNoRoot.addConsumable("Silent Operation", {
		type: "operation",
		description: "Carries a payload with no attributes.",
		schema: schemaEmpty,
	});
	// Provided by an aggregate rather than a service, so the subsection an
	// AggregatePage draws is the surface that has to show the returned shape.
	// No reference model has one of these yet.
	aggNoRoot.addConsumable("Answering Operation", {
		type: "operation",
		description: "Asked with one shape and answered with another.",
		schema: schemaEmpty,
		returns: schemaAnswer,
	});
	aggNoRoot.addConsumable("Orphan Event", {
		type: "event",
		description: "Never raised by any operation.",
	});
	// One shape on both ends of the same exchange: an upsert asked with the
	// record and answered with the record as stored.
	aggNoRoot.addConsumable("Echoing Operation", {
		type: "operation",
		description: "Takes and answers with the same shape.",
		schema: schemaEchoed,
		returns: schemaEchoed,
	});

	bcMain.addPolicy("Idle Policy", {
		description: "Reacts to nothing and issues nothing.",
	});

	bcMain.addTerm("Ticket", {
		definition: "Definition A, in the main context.",
	});
	bcMain.addTerm("Widget", {
		definition: "No model element captures this yet.",
	});
	bcMain.addTerm("Nameless", {
		definition:
			"Embodies a target whose name is missing; falls back to its ref.",
		embodiedBy: {
			ref: "#/boundedcontexts/main_context/aggregates/rootless_aggregate",
			// biome-ignore lint/suspicious/noExplicitAny: exercises the missing-name fallback branch
			name: undefined as any,
		},
	});

	bcMain.addAggregate("Empty Aggregate", {
		description: "Has no entities at all.",
	});

	const bcSecond = workspace.addBoundedContext("Second Context", {
		description: "Downstream of the main context; thin on its own.",
	});
	bcSecond.addService("Odd Service", {
		description: "Declared with a service type outside the known kinds.",
		// biome-ignore lint/suspicious/noExplicitAny: exercises the unknown-type fallback branch
		type: "custom" as any,
	});
	bcSecond.addTerm("Ticket", {
		definition: "Definition B, in the second context.",
	});

	workspace.addBoundedContext("Thin Context", {
		description: "Has no aggregates and no services.",
	});

	bcMain.upstreamOf(bcSecond, {
		type: "customer-supplier",
		upstreamRoles: ["open-host-service", "published-language"],
		downstreamRoles: ["conformist", "anti-corruption-layer"],
	});

	return {
		workspace,
		fileLabel: "edge-cases.ts",
		diagnostics: workspace.validate(),
	};
}

/**
 * A workspace with nothing in it: no domains, contexts or teams, and so no
 * diagnostics either. Its version is deliberately missing too, exercising the
 * page header's fallback for a workspace with no declared version.
 */
export function emptyWorkspaceModel(): Model {
	const workspace = new Workspace("Empty Workspace", {
		id: "empty",
		odsVersion: "1.0.0",
		description: "Nothing has been modelled yet.",
		// biome-ignore lint/suspicious/noExplicitAny: exercises the missing-version fallback branch
		version: undefined as any,
	});
	return {
		workspace,
		fileLabel: "empty.ts",
		diagnostics: workspace.validate(),
	};
}

/** The larger fictional-organisation workspaces, for stress tests over every page. */
export function referenceModels(): Model[] {
	return [rivermart, streamline, northbank].map((schema) => {
		const workspace = Workspace.fromSchema(
			schema as Parameters<typeof Workspace.fromSchema>[0],
		);
		return {
			workspace,
			fileLabel: `${workspace.id}.json`,
			diagnostics: workspace.validate(),
		};
	});
}
