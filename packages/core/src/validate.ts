import {
	type Aggregate,
	type Consumption,
	Entity,
	type EntityRelation,
	type Policy,
	type Workspace,
} from "./workspace";

export type DiagnosticSeverity = "error" | "warning";

export type Diagnostic = {
	severity: DiagnosticSeverity;
	/** A stable rule id, e.g. `aggregate-root`. */
	rule: string;
	message: string;
	/** The element the diagnostic is about. */
	ref: string;
};

type Rule = (workspace: Workspace) => Diagnostic[];

function* aggregatesOf(workspace: Workspace): Iterable<Aggregate> {
	for (const bc of workspace.boundedcontexts.values())
		yield* bc.aggregates.values();
}

function* relationsOf(workspace: Workspace): Iterable<EntityRelation> {
	for (const aggregate of aggregatesOf(workspace)) {
		for (const entity of aggregate.entities.values()) yield* entity.relations;
		for (const vo of aggregate.valueobjects.values()) yield* vo.relations;
	}
}

function* consumptionsOf(workspace: Workspace): Iterable<Consumption> {
	for (const bc of workspace.boundedcontexts.values()) {
		for (const member of [...bc.aggregates.values(), ...bc.services.values()]) {
			yield* member.consumptions;
		}
	}
}

/** Every aggregate has exactly one root entity. */
const aggregateRoot: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const aggregate of aggregatesOf(workspace)) {
		const roots = Array.from(aggregate.entities.values()).filter((e) => e.root);
		if (roots.length === 1) continue;
		diagnostics.push({
			severity: roots.length === 0 ? "warning" : "error",
			rule: "aggregate-root",
			message:
				roots.length === 0
					? `Aggregate "${aggregate.name}" has no root entity`
					: `Aggregate "${aggregate.name}" has ${roots.length} root entities; an aggregate has exactly one`,
			ref: aggregate.ref,
		});
	}
	return diagnostics;
};

/**
 * A relation into another aggregate may only reference that aggregate's root,
 * and may not include or use its members directly.
 */
const crossAggregateReference: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const relation of relationsOf(workspace)) {
		if (relation.source.aggregate === relation.target.aggregate) continue;
		const target = relation.target;
		if (relation.relation !== "references") {
			diagnostics.push({
				severity: "error",
				rule: "cross-aggregate-reference",
				message: `"${relation.source.name}" ${relation.relation} "${target.name}" in another aggregate; across aggregates only "references" is allowed`,
				ref: relation.source.ref,
			});
		} else if (!(target instanceof Entity && target.root)) {
			diagnostics.push({
				severity: "error",
				rule: "cross-aggregate-reference",
				message: `"${relation.source.name}" references "${target.name}", which is not the root of aggregate "${target.aggregate.name}"; reference other aggregates by their root's identity`,
				ref: relation.source.ref,
			});
		}
	}
	return diagnostics;
};

/** Consumables and consumptions declare roles that fit their type. */
const roleCoherence: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumable } = consumption;
		if (
			consumable.provider.boundedcontext === consumption.consumer.boundedcontext
		) {
			continue;
		}
		if (!consumable.pattern && !consumable.internal) {
			diagnostics.push({
				severity: "warning",
				rule: "role-coherence",
				message: `"${consumable.name}" is consumed from another context but declares no upstream role (open-host-service or published-language)`,
				ref: consumable.ref,
			});
		}
		if (!consumption.pattern) {
			diagnostics.push({
				severity: "warning",
				rule: "role-coherence",
				message: `"${consumption.consumer.name}" consumes "${consumable.name}" from another context without a downstream role (conformist or anti-corruption-layer)`,
				ref: consumption.consumer.ref,
			});
		}
	}
	return diagnostics;
};

/** Contexts that have declared separate ways must not exchange consumables. */
const separateWays: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const separateWaysRelationships = workspace.relationships.filter(
		(r) => r.type === "separate-ways",
	);
	for (const consumption of consumptionsOf(workspace)) {
		const providerContext = consumption.consumable.provider.boundedcontext;
		const consumerContext = consumption.consumer.boundedcontext;
		const declaredApart = separateWaysRelationships.some(
			(r) =>
				r.involves(providerContext) &&
				r.involves(consumerContext) &&
				providerContext !== consumerContext,
		);
		if (declaredApart) {
			diagnostics.push({
				severity: "error",
				rule: "separate-ways",
				message: `"${consumerContext.name}" consumes "${consumption.consumable.name}" from "${providerContext.name}" although the contexts declare separate ways`,
				ref: consumption.consumer.ref,
			});
		}
	}
	return diagnostics;
};

/** An internal consumable never leaves its context. */
const internalConsumable: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const consumption of consumptionsOf(workspace)) {
		const { consumable, consumer } = consumption;
		if (
			consumable.internal &&
			consumable.provider.boundedcontext !== consumer.boundedcontext
		) {
			diagnostics.push({
				severity: "error",
				rule: "internal-consumable",
				message: `"${consumer.name}" consumes "${consumable.name}" from "${consumable.provider.boundedcontext.name}", but it is internal to that context`,
				ref: consumer.ref,
			});
		}
	}
	for (const bc of workspace.boundedcontexts.values()) {
		for (const policy of bc.policies.values()) {
			for (const event of policy.events) {
				if (event.internal && event.provider.boundedcontext !== bc) {
					diagnostics.push({
						severity: "error",
						rule: "internal-consumable",
						message: `Policy "${policy.name}" reacts to "${event.name}", which is internal to "${event.provider.boundedcontext.name}"`,
						ref: policy.ref,
					});
				}
			}
			for (const command of policy.commands) {
				if (command.internal && command.provider.boundedcontext !== bc) {
					diagnostics.push({
						severity: "error",
						rule: "internal-consumable",
						message: `Policy "${policy.name}" issues "${command.name}", which is internal to "${command.provider.boundedcontext.name}"`,
						ref: policy.ref,
					});
				}
			}
		}
	}
	return diagnostics;
};

/** A consumable's payload is one of its own context's schemas. */
const schemaContext: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				if (c.schema && c.schema.boundedcontext !== bc) {
					diagnostics.push({
						severity: "error",
						rule: "schema-context",
						message: `"${c.name}" carries schema "${c.schema.name}" from "${c.schema.boundedcontext.name}"; a payload belongs to the context that publishes it`,
						ref: c.ref,
					});
				}
				if (c.internal && c.pattern) {
					diagnostics.push({
						severity: "warning",
						rule: "internal-consumable",
						message: `"${c.name}" is internal but declares the upstream role "${c.pattern}", which only matters to other contexts`,
						ref: c.ref,
					});
				}
			}
		}
	}
	return diagnostics;
};

/** Policies react to events and issue operations; operations raise events. */
const consumableKinds: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		for (const policy of bc.policies.values()) {
			for (const c of policy.events.filter((c) => c.type !== "event")) {
				diagnostics.push({
					severity: "error",
					rule: "consumable-kind",
					message: `Policy "${policy.name}" reacts to "${c.name}", which is an operation, not an event`,
					ref: policy.ref,
				});
			}
			for (const c of policy.commands.filter((c) => c.type !== "operation")) {
				diagnostics.push({
					severity: "error",
					rule: "consumable-kind",
					message: `Policy "${policy.name}" issues "${c.name}", which is an event, not an operation`,
					ref: policy.ref,
				});
			}
		}
		for (const p of [...bc.aggregates.values(), ...bc.services.values()]) {
			for (const c of p.consumables.values()) {
				if (c.type === "event" && c.raisedEvents.length) {
					diagnostics.push({
						severity: "error",
						rule: "consumable-kind",
						message: `"${c.name}" is an event but declares raises; only operations raise events`,
						ref: c.ref,
					});
				}
				for (const e of c.raisedEvents.filter((e) => e.type !== "event")) {
					diagnostics.push({
						severity: "error",
						rule: "consumable-kind",
						message: `"${c.name}" raises "${e.name}", which is an operation, not an event`,
						ref: c.ref,
					});
				}
			}
		}
	}
	return diagnostics;
};

/** A policy reacts to something and does something. */
const policyComplete: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	const policies: Policy[] = Array.from(
		workspace.boundedcontexts.values(),
	).flatMap((bc) => Array.from(bc.policies.values()));
	for (const policy of policies) {
		if (policy.events.length === 0 || policy.commands.length === 0) {
			diagnostics.push({
				severity: "warning",
				rule: "policy-complete",
				message: `Policy "${policy.name}" ${policy.events.length === 0 ? "reacts to no event" : "issues no command"}`,
				ref: policy.ref,
			});
		}
	}
	return diagnostics;
};

/** Every context serves at least one subdomain. */
const contextServesSubdomain: Rule = (workspace) => {
	const diagnostics: Diagnostic[] = [];
	for (const bc of workspace.boundedcontexts.values()) {
		if (bc.subdomains.size === 0) {
			diagnostics.push({
				severity: "warning",
				rule: "context-serves-subdomain",
				message: `Bounded context "${bc.name}" serves no subdomain, so it is missing from the problem-space view`,
				ref: bc.ref,
			});
		}
	}
	return diagnostics;
};

/** What a validation rule checks, in words a reader new to DDD can follow. */
export type RuleDescription = {
	/** The stable id carried by every diagnostic the rule emits. */
	rule: string;
	/** The severities the rule can emit. */
	severities: DiagnosticSeverity[];
	/** One sentence saying what the rule requires. */
	summary: string;
	/** Why the model is better for it, in plain language. */
	why: string;
	/** The edit that usually resolves the diagnostic. */
	fix: string;
};

type CataloguedRule = RuleDescription & { check: Rule };

const RULES: CataloguedRule[] = [
	{
		rule: "aggregate-root",
		severities: ["warning", "error"],
		summary: "Every aggregate has exactly one root entity.",
		why: "The root is the one thing you name the cluster after and reach it through; without it nobody knows where the rules are enforced, and with two the boundary is really two aggregates.",
		fix: "Mark the entity the aggregate is named after with root: true, or split the aggregate if two entities genuinely lead their own clusters.",
		check: aggregateRoot,
	},
	{
		rule: "cross-aggregate-reference",
		severities: ["error"],
		summary:
			"A relation into another aggregate uses references and targets that aggregate's root.",
		why: "Aggregates are consistency boundaries; reaching inside another one couples the two so they can no longer change or be stored independently.",
		fix: 'Change the relation to "references" and point it at the other aggregate\'s root entity, holding only its identity.',
		check: crossAggregateReference,
	},
	{
		rule: "role-coherence",
		severities: ["warning"],
		summary:
			"A consumable used from another context declares an upstream role, and the consumption declares a downstream role.",
		why: "Crossing a context boundary is an integration decision: how the provider offers it (a documented API or a published format) and how the consumer takes it (as-is or translated) should be explicit.",
		fix: "Set pattern on the consumable to open-host-service or published-language, and pattern on the consumption to conformist or anti-corruption-layer.",
		check: roleCoherence,
	},
	{
		rule: "separate-ways",
		severities: ["error"],
		summary: "Contexts that declare separate ways exchange no consumables.",
		why: "Separate ways is a deliberate decision not to integrate; a consumption between the two contradicts it.",
		fix: "Remove the consumption, or remove the separate-ways relationship and declare the real one.",
		check: separateWays,
	},
	{
		rule: "internal-consumable",
		severities: ["error", "warning"],
		summary:
			"An internal consumable is never consumed, reacted to or issued from another context, and declares no upstream role.",
		why: "internal means the consumable stays inside its context; anything outside depending on it makes that promise false.",
		fix: "Drop internal and give the consumable an upstream role, or stop the other context from using it.",
		check: internalConsumable,
	},
	{
		rule: "schema-context",
		severities: ["error"],
		summary:
			"A consumable's payload schema belongs to the consumable's own context.",
		why: "The context that publishes a message owns its shape; borrowing another context's schema ties the two together.",
		fix: "Move or copy the schema into the publishing context and point the consumable at that one.",
		check: schemaContext,
	},
	{
		rule: "consumable-kind",
		severities: ["error"],
		summary:
			"Policies react to events and issue operations; only operations raise events, and they raise only events.",
		why: "An event is a fact that happened, an operation is a request to do something; mixing them up makes flows unreadable.",
		fix: "Check the type of each consumable a policy or raises list points at and swap it for the right kind.",
		check: consumableKinds,
	},
	{
		rule: "policy-complete",
		severities: ["warning"],
		summary:
			"A policy reacts to at least one event and issues at least one operation.",
		why: "A policy is a rule of the form when this happens, do that; either half missing leaves nothing to enact.",
		fix: "Add the missing event to on or the missing operation to then.",
		check: policyComplete,
	},
	{
		rule: "context-serves-subdomain",
		severities: ["warning"],
		summary: "Every bounded context serves at least one subdomain.",
		why: "A context that serves no subdomain has no place in the problem-space view, so nobody can see which part of the business it exists for.",
		fix: "Add the subdomain the context serves to its subdomains list.",
		check: contextServesSubdomain,
	},
];

/** The rules `validateWorkspace` applies, described for readers and tooling. */
export const RULE_CATALOG: ReadonlyArray<RuleDescription> = RULES.map(
	({ check: _check, ...description }) => description,
);

/** Checks a workspace against the DDD rules ODS can verify structurally. */
export function validateWorkspace(workspace: Workspace): Diagnostic[] {
	return RULES.flatMap((rule) => rule.check(workspace));
}
