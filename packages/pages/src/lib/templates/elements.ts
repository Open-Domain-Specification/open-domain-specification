import type {
	Aggregate,
	Attribute,
	Consumable,
	GlossaryTerm,
	Policy,
	ValueObject,
	Workspace,
} from "@open-domain-specification/core";

/* ---------- shared lookups across the workspace ---------- */

export function* aggregatesOf(ws: Workspace): Iterable<Aggregate> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.aggregates.values();
}

export function* policiesOf(ws: Workspace): Iterable<Policy> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.policies.values();
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

/** Attributes anywhere in the workspace whose type is this value object. */
export function usagesOf(ws: Workspace, vo: ValueObject): Attribute[] {
	const out: Attribute[] = [];
	for (const a of aggregatesOf(ws)) {
		for (const o of [...a.entities.values(), ...a.valueobjects.values()])
			for (const attr of o.attributes.values())
				if (attr.valueobject === vo) out.push(attr);
	}
	for (const bc of ws.boundedcontexts.values())
		for (const s of bc.schemas.values())
			for (const attr of s.attributes.values())
				if (attr.valueobject === vo) out.push(attr);
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
