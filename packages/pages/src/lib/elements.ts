import type {
	Aggregate,
	Attribute,
	Consumable,
	Entity,
	EntityRelation,
	GlossaryTerm,
	Invariant,
	Policy,
	Process,
	ValueObject,
	Workspace,
} from "@open-domain-specification/core";

/**
 * The workspace lookups every layer asks for — which terms name an element,
 * which consumables carry a schema, what a page's crumbs are. It sits at the
 * lib root rather than under `templates/` because molecules, organisms,
 * templates and the package entry all read it, and a leaf module the
 * extension can import without pulling in Svelte cannot sit inside the layer
 * that draws pages.
 */

/**
 * The relationship element's own page needs a name for it, and so do the
 * hosts that list one. It lives in a leaf module because the extension reads
 * it too; this is the registration every other element already has here.
 */
export { relationshipTitle } from "@open-domain-specification/core";

/**
 * The health report's three counts. The extension's workspace tree node shows
 * them beside the file name, so like `relationshipTitle` they are registered
 * from a leaf module the extension can import without pulling in Svelte.
 */
export { type HealthCounts, healthCountsOf } from "./evidence/derive";

/* ---------- shared lookups across the workspace ---------- */

function* aggregatesOf(ws: Workspace): Iterable<Aggregate> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.aggregates.values();
}

export function* policiesOf(ws: Workspace): Iterable<Policy> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.policies.values();
}

export function* processesOf(ws: Workspace): Iterable<Process> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.processes.values();
}

export function* consumablesOf(ws: Workspace): Iterable<Consumable> {
	for (const bc of ws.boundedcontexts.values()) {
		for (const m of [...bc.aggregates.values(), ...bc.services.values()])
			yield* m.consumables.values();
	}
}

/** Direct incoming relations, including those a kind inherits from a parent. */
export type NamedRelation = {
	source: Entity | ValueObject;
	relation: EntityRelation;
};

export function relationsNaming(
	ws: Workspace,
	target: Entity | ValueObject,
): NamedRelation[] {
	const incoming: NamedRelation[] = [];
	for (const bc of ws.boundedcontexts.values()) {
		for (const aggregate of bc.aggregates.values()) {
			for (const source of aggregate.entities.values()) {
				for (const relation of source.allRelations)
					if (relation.target === target) incoming.push({ source, relation });
			}
		}
		for (const source of bc.valueobjects.values()) {
			for (const relation of source.allRelations)
				if (relation.target === target) incoming.push({ source, relation });
		}
	}
	return incoming;
}

/** Aggregate and context rules that explicitly name an element, in workspace order. */
export function invariantsNaming(
	ws: Workspace,
	target: Entity | ValueObject,
): Invariant[] {
	const named: Invariant[] = [];
	for (const bc of ws.boundedcontexts.values()) {
		for (const invariant of bc.invariants.values())
			if (invariant.targets.includes(target)) named.push(invariant);
		for (const aggregate of bc.aggregates.values()) {
			for (const invariant of aggregate.invariants.values())
				if (invariant.targets.includes(target)) named.push(invariant);
		}
	}
	return named;
}

export function* termsOf(ws: Workspace): Iterable<GlossaryTerm> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.glossary.values();
}

/** Attributes anywhere in the workspace whose type is this value object. */
export function usagesOf(ws: Workspace, vo: ValueObject): Attribute[] {
	const out: Attribute[] = [];
	for (const a of aggregatesOf(ws)) {
		for (const o of a.entities.values())
			for (const attr of o.attributes.values())
				if (attr.valueobject === vo) out.push(attr);
	}
	for (const bc of ws.boundedcontexts.values()) {
		for (const o of [...bc.valueobjects.values(), ...bc.schemas.values()])
			for (const attr of o.attributes.values())
				if (attr.valueobject === vo) out.push(attr);
	}
	return out;
}

export function termsEmbodying(
	ws: Workspace,
	target: { ref: string },
): GlossaryTerm[] {
	return [...termsOf(ws)].filter((t) => t.embodiedBy?.ref === target.ref);
}

/**
 * The crumbs above a page owned by an aggregate or by a value object: the
 * workspace, the context, then the owner. An invariant hangs under any of the
 * three kinds of owner (decision 27), and the two that are not the context
 * itself read the same way.
 */
export function ownerCrumbs(
	ws: Workspace,
	owner: Aggregate | ValueObject,
): [string, string][] {
	return [
		["#", ws.name],
		[owner.boundedcontext.ref, owner.boundedcontext.name],
		[owner.ref, owner.name],
	];
}

/** The owner of an attribute, as far as the page needs to link it. */
export type AttributeOwner = {
	ref: string;
	name: string;
	aggregate?: Aggregate;
	boundedcontext?: { ref: string; name: string };
};
