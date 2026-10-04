import {
	type Aggregate,
	type BoundedContext,
	type Consumable,
	type Consumption,
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	type Service,
	usersOfSchema,
	usersOfValueObject,
	valueObjectsUsedBy,
} from "@open-domain-specification/core";
import { stripFiles } from "./equivalence.support.ts";

/*
 * What a reader's context page says about a context, read off the model with
 * the same core accessors the pages package reads (ContextPage.svelte,
 * ConsumesTable, ProvidesTable, the value-object and schema "Used by"
 * columns, the strategic position table and the three scoped diagrams).
 * It is plain data, so the page of the monolith and the page of the same
 * context in the set can be compared field by field and in listed order,
 * before any reader hosts a set.
 *
 * It does not touch packages/pages. A reader that renders a set will be
 * proven separately, in a host; this is the part that does not need one.
 */

export type ContextPageProjection = {
	id: string;
	name: string;
	description: string;
	posture: "external" | "big ball of mud" | "boundary only" | "owned";
	team: string | undefined;
	subdomains: string[];
	aggregates: Array<{
		name: string;
		entities: string[];
		valueObjectsUsed: string[];
		provides: Array<[string, string, string | undefined]>;
		consumes: string[];
	}>;
	services: Array<{
		name: string;
		type: string;
		provides: Array<[string, string, string | undefined]>;
		consumes: string[];
	}>;
	invariants: string[];
	valueObjects: Array<{ name: string; kinds: string[]; usedBy: string[] }>;
	schemas: Array<{ name: string; usedBy: string[] }>;
	policies: Array<{ name: string; on: string[]; issues: string[] }>;
	processes: Array<{ name: string; on: string[] }>;
	glossary: Array<[string, string | undefined]>;
	/** The context's own row in the strategic position table: who it stands beside, in listed order. */
	position: string[];
	/** The three scoped diagrams, as the sorted ids they draw (their order is the walk's). */
	diagrams: { context: string[]; consumables: string[]; flow: string[] };
};

const where = (c: { boundedcontext: BoundedContext }) => c.boundedcontext.name;

function consumption(c: Consumption): string {
	return [
		c.consumable.name,
		where(c.consumable.provider),
		c.pattern ?? "",
		c.by.map((b) => b.name).join("+"),
	].join("|");
}

function provides(holder: Aggregate | Service) {
	return [...holder.consumables.values()].map(
		(c: Consumable): [string, string, string | undefined] => [
			c.name,
			c.type,
			c.pattern,
		],
	);
}

/** The page of one context, from the workspace or set the context is in. */
export function contextPage(bc: BoundedContext): ContextPageProjection {
	const context = ODSContextMap.fromBoundedContext(bc);
	const consumables = ODSConsumableMap.fromBoundedContext(bc);
	const flow = ODSFlowMap.fromBoundedContext(bc);
	const sorted = (xs: Iterable<string>) => [...xs].map(stripFiles).sort();
	return {
		id: bc.id,
		name: bc.name,
		description: bc.description,
		posture: bc.external
			? "external"
			: bc.bigBallOfMud
				? "big ball of mud"
				: bc.boundaryOnly
					? "boundary only"
					: "owned",
		team: bc.team?.name,
		subdomains: [...bc.subdomains].map((s) => `${s.domain.name} / ${s.name}`),
		aggregates: [...bc.aggregates.values()].map((a) => ({
			name: a.name,
			entities: [...a.entities.values()].map((e) => e.name),
			valueObjectsUsed: valueObjectsUsedBy(a).map(
				(v) => `${v.boundedcontext.name} / ${v.name}`,
			),
			provides: provides(a),
			consumes: a.consumptions.map(consumption),
		})),
		services: [...bc.services.values()].map((s) => ({
			name: s.name,
			type: s.type,
			provides: provides(s),
			consumes: s.consumptions.map(consumption),
		})),
		invariants: [...bc.invariants.values()].map((i) => i.name),
		valueObjects: [...bc.valueobjects.values()].map((v) => ({
			name: v.name,
			kinds: v.kinds.map((k) => k.name),
			usedBy: usersOfValueObject(v).map(
				(u) => `${u.kind}|${u.boundedcontext.name}|${u.owner.name}`,
			),
		})),
		schemas: [...bc.schemas.values()].map((s) => ({
			name: s.name,
			usedBy: usersOfSchema(s).map(
				(u) => `${u.kind}|${u.boundedcontext.name}|${u.owner.name}`,
			),
		})),
		policies: [...bc.policies.values()].map((p) => ({
			name: p.name,
			on: p.events.map((e) => `${e.name}|${where(e as Consumable)}`),
			issues: p.commands.map((c) => c.name),
		})),
		processes: [...bc.processes.values()].map((p) => ({
			name: p.name,
			on: p.events.map((e) => e.name),
		})),
		glossary: [...bc.glossary.values()].map(
			(t): [string, string | undefined] => [
				t.name,
				t.embodiedBy && "name" in t.embodiedBy ? t.embodiedBy.name : undefined,
			],
		),
		position: [...context.edges.values()]
			.filter((e) => e.source.name === bc.name || e.target.name === bc.name)
			.map(
				(e) =>
					`${e.source.name} > ${e.target.name} (${e.type}${e.implied ? `, implied by ${e.implied}` : ""})`,
			),
		diagrams: {
			context: sorted(context.nodes.keys()),
			consumables: sorted(consumables.nodes.keys()),
			flow: sorted(flow.nodes.keys()),
		},
	};
}
