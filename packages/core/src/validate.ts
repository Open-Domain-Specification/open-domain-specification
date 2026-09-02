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
		if (!consumable.pattern) {
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

const RULES: Rule[] = [
	aggregateRoot,
	crossAggregateReference,
	roleCoherence,
	separateWays,
	policyComplete,
	contextServesSubdomain,
];

/** Checks a workspace against the DDD rules ODS can verify structurally. */
export function validateWorkspace(workspace: Workspace): Diagnostic[] {
	return RULES.flatMap((rule) => rule(workspace));
}
