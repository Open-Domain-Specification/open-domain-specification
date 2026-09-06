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
 * RiverMart as a model. It is the reference organisation whose order payloads
 * nest a shape of their own, so it is what a story showing composed schemas
 * draws.
 */
export function rivermartModel(): Model {
	const workspace = Workspace.fromSchema(
		rivermart as Parameters<typeof Workspace.fromSchema>[0],
	);
	return {
		workspace,
		fileLabel: "rivermart.json",
		diagnostics: workspace.validate(),
	};
}

/**
 * StreamLine as a model. Its catalogue is the reference model with kinds — a
 * title is a film or a series (decision 22) — so it is what a test or a story
 * about specialisation draws.
 */
export function streamlineModel(): Model {
	const workspace = Workspace.fromSchema(
		streamline as Parameters<typeof Workspace.fromSchema>[0],
	);
	return {
		workspace,
		fileLabel: "streamline.json",
		diagnostics: workspace.validate(),
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
	// The branch the petstore no longer reaches: every entity there carries
	// attributes now, and one of them is marked as the identity.
	aggNoRoot.addEntity("Bare Entity", {
		description: "Has no attributes at all, so nothing identifies it.",
	});
	bcMain.addValueObject("Unused Value Object", {
		description: "Never used as an attribute type, and has no relations.",
	});
	const voLinker = bcMain.addValueObject("Linking Value Object", {
		description: "Points at the plain entity.",
	});
	voLinker.addRelation(ePlain, { relation: "references", cardinality: "1" });
	// A rule of the value's own, which holds by construction: the third kind of
	// invariant, and the one no operation guards (decision 27).
	const voRuled = bcMain.addValueObject("Ruled Value Object", {
		description: "Keeps a rule of its own.",
	});
	const voRuledField = voRuled.addAttribute("Field", { type: "string" });
	voRuled
		.addInvariant("Value Invariant", {
			description: "Holds of every instance of this value.",
		})
		.constrains(voRuledField);
	voRuled.addInvariant("Whole-Value Invariant", {
		description: "Constrains nothing named in particular.",
	});
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
	const schemaAnswerResult = schemaAnswer.addAttribute("Result", {
		type: "string",
	});
	const schemaRefused = bcMain.addSchema("Refusal Schema", {
		description: "Only ever refused with, never sent or returned.",
	});
	schemaRefused.addAttribute("Reason", { type: "string" });
	const schemaOverLimit = bcMain.addSchema("Over Limit Schema", {
		description: "The second of two ways the same operation says no.",
	});
	schemaOverLimit.addAttribute("Limit", { type: "int" });

	const opSilent = aggNoRoot.addConsumable("Silent Operation", {
		type: "operation",
		description: "Carries a payload with no attributes.",
		schema: schemaEmpty,
	});
	// Provided by an aggregate rather than a service, so the subsection an
	// AggregatePage draws is the surface that has to show the returned shape.
	// No reference model has one of these yet.
	const opAnswering = aggNoRoot.addConsumable("Answering Operation", {
		type: "operation",
		description: "Asked with one shape and answered with another.",
		schema: schemaEmpty,
		returns: schemaAnswer,
	});
	// An answer that is a list of a shape rather than one of it, again on an
	// aggregate: the subsection is where "Returns many" has to read, and every
	// reference model that answers with a list does it from a service.
	aggNoRoot.addConsumable("Listing Operation", {
		type: "operation",
		description: "Answered with a list of a shape rather than one of it.",
		schema: schemaEmpty,
		returns: { schema: schemaAnswer, many: true },
	});
	// Two rejections on one operation, again on an aggregate rather than a
	// service: the subsection has to name both and the consumable page has to
	// draw a table for each. No reference model refuses in two ways yet.
	aggNoRoot.addConsumable("Refusing Operation", {
		type: "operation",
		description: "Says no in two different shapes.",
		schema: schemaEmpty,
		rejects: [schemaRefused, schemaOverLimit],
	});
	const orphanEvent = aggNoRoot.addConsumable("Orphan Event", {
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

	// The context's own rules (decision 27): one that counts across instances
	// and names the operation checking it, and one that names nothing at all,
	// which is the unguarded case a reader has to be shown.
	bcMain
		.addInvariant("Cross-Instance Invariant", {
			description: "Counts the plain entities and is checked before acting.",
		})
		.constrains(ePlain, opSilent);
	bcMain.addInvariant("Unguarded Context Invariant", {
		description: "Names nothing, so nothing keeps it.",
	});
	// The third kind of rule an invariant page has to name: a guarantee about
	// what a call answers with, which is neither kept on every save nor checked
	// on the way in (decision 19, third amendment). No reference model states
	// one yet.
	bcMain
		.addInvariant("Answer Guarantee", {
			description: "Holds of every answer the answering operation gives.",
			postcondition: true,
		})
		.constrains(opAnswering, schemaAnswerResult);

	bcMain.addPolicy("Idle Policy", {
		description: "Reacts to nothing and issues nothing.",
	});
	// A reaction waiting on the bare completion of a call that answers with
	// nothing: the one trigger with no shape behind it, so the row's link goes
	// to the call and the flow map labels the edge "completes" (decision 13,
	// second amendment). No reference model waits on one yet.
	bcMain
		.addPolicy("Completion Policy", {
			description: "Waits for a call that answers with nothing to come back.",
		})
		.on(opSilent.completed());

	// The empty process: nothing begins it, nothing ends it, and it is marked
	// for refactoring with a note saying why, so every branch a process page
	// and a context row can take is drawn somewhere.
	bcMain.addProcess("Idle Process", {
		description: "Nothing starts it, it waits for nothing and it never ends.",
		comments: [{ text: "Two cron jobs and a spreadsheet, in truth." }],
		disposition: "refactor",
	});

	// A clock with an anchor: the interval counts from a trigger the process
	// names rather than from the start of the instance, which is what the
	// "after ... from ..." beside a deadline's name reads. No reference model
	// anchors one yet.
	const timedProcess = bcMain.addProcess("Timed Process", {
		description: "Gives itself two working days from the fact that starts it.",
	});
	timedProcess.starts(orphanEvent);
	// And it waits on the bare completion of a call that answers with nothing,
	// which is the trigger a process page has to name without a shape to link
	// to (decision 13, second amendment).
	timedProcess.on(opSilent.completed());
	timedProcess.ends(
		timedProcess.addDeadline("Nobody Answered", {
			description: "Two working days after the fact that started the instance.",
			after: "two working days",
			from: orphanEvent,
		}),
	);

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

	// A system the enterprise does not own: no subdomain, no team, no
	// aggregates, and the one surface every page has to draw differently.
	workspace.addBoundedContext("Outside System", {
		description: "Somebody else's machine, integrated with and not modelled.",
		external: true,
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
