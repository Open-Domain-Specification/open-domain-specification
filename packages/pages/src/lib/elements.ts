import {
	type Aggregate,
	type Attribute,
	type Consumable,
	Entity,
	type GlossaryTerm,
	type Policy,
	type Process,
	type ValueObject,
	type Workspace,
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

export function* termsOf(ws: Workspace): Iterable<GlossaryTerm> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.glossary.values();
}

/**
 * The value objects an aggregate holds: the ones typing its entities'
 * attributes or targeted by their relations. A value object belongs to the
 * context (decision 16), so this is what the aggregate uses of it.
 */
export function valueObjectsOf(aggregate: Aggregate): ValueObject[] {
	const used = new Set<ValueObject>();
	for (const e of aggregate.entities.values()) {
		for (const a of e.attributes.values())
			if (a.valueobject) used.add(a.valueobject);
		for (const r of e.relations)
			if (!(r.target instanceof Entity)) used.add(r.target);
	}
	return [...used].sort((a, b) => a.name.localeCompare(b.name));
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

export function ownerCrumbs(
	ws: Workspace,
	aggregate: Aggregate,
): [string, string][] {
	return [
		["#", ws.name],
		[aggregate.boundedcontext.ref, aggregate.boundedcontext.name],
		[aggregate.ref, aggregate.name],
	];
}

/** The owner of an attribute, as far as the page needs to link it. */
export type AttributeOwner = {
	ref: string;
	name: string;
	aggregate?: Aggregate;
	boundedcontext?: { ref: string; name: string };
};
