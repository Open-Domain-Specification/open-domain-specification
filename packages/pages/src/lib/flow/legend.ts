import {
	DOWNSTREAM_ROLE_LABELS,
	RELATIONSHIP_LABELS,
	UPSTREAM_ROLE_LABELS,
} from "@open-domain-specification/graphviz";
import type { ConsumableNodeData } from "./consumable-graph";
import type { ContextNodeData } from "./context-graph";
import type { Graph } from "./graph";
import type { DiagramKind } from "./kind";
import { roleLabel } from "./roles";

/**
 * The index of terms a diagram shows: an abbreviation, a line style or a
 * node mark, with the full name. Derived from the graph, so the legend
 * lists only what the current map actually draws.
 */
export type LegendEntry = { mark: string; name: string };

/** Full names behind the abbreviations the label tables produce. */
const ROLE_NAMES: Record<string, string> = {
	"open-host-service": "Open host service",
	"published-language": "Published language",
	conformist: "Conformist",
	"anti-corruption-layer": "Anti-corruption layer",
};
const STEREOTYPE_NAMES: Record<string, string> = {
	"upstream-downstream": "Upstream/downstream",
	"customer-supplier": "Customer/supplier",
	partnership: "Partnership",
	"shared-kernel": "Shared kernel",
	"separate-ways": "Separate ways",
};

/** Abbreviation to full name for every role, from the graphviz label tables. */
const ROLES = new Map(
	Object.entries({ ...UPSTREAM_ROLE_LABELS, ...DOWNSTREAM_ROLE_LABELS }).map(
		([role, label]) => [label, ROLE_NAMES[role]],
	),
);
/** Stereotype label to full name, from the graphviz label table. */
const STEREOTYPES = new Map(
	Object.entries(RELATIONSHIP_LABELS).map(([type, label]) => [
		label,
		STEREOTYPE_NAMES[type],
	]),
);

/** Every "+"-joined end label of the edges, split into single abbreviations, in first-seen order. */
function endLabels(graph: Graph): string[] {
	const seen = new Set<string>();
	for (const e of graph.edges)
		for (const label of [e.sourceLabel, e.targetLabel])
			for (const part of label?.split("+") ?? []) seen.add(part);
	return [...seen];
}

const roleEntries = (labels: string[]): LegendEntry[] =>
	labels
		.map((label) => ({ label, name: ROLES.get(label) }))
		.filter((r): r is { label: string; name: string } => !!r.name)
		.map(({ label, name }) => ({ mark: label, name }));

function contextLegend(graph: Graph): LegendEntry[] {
	const nodes = graph.nodes as ContextNodeData[];
	const stereotypes = new Set(graph.edges.map((e) => e.label));
	return [
		...[...STEREOTYPES]
			.filter(([label]) => stereotypes.has(label))
			.map(([mark, name]) => ({ mark, name })),
		...roleEntries(endLabels(graph)),
		...(graph.edges.some((e) => e.dashed)
			? [{ mark: "dashed", name: "Implied relationship" }]
			: []),
		...(nodes.some((n) => n.bigBallOfMud)
			? [{ mark: "dashed octagon", name: "Big ball of mud" }]
			: []),
		...(nodes.some((n) => n.cluster)
			? [{ mark: "band", name: "Domain colour" }]
			: []),
	];
}

function consumableLegend(graph: Graph): LegendEntry[] {
	const nodes = graph.nodes as ConsumableNodeData[];
	const patterns = new Set<string>();
	for (const n of nodes) {
		for (const s of n.slots) if (s.pattern) patterns.add(s.pattern);
		for (const r of n.requires) if (r.pattern) patterns.add(r.pattern);
	}
	for (const e of graph.edges)
		for (const p of [e.sourceLabel, e.targetLabel]) if (p) patterns.add(p);
	const labels = [...patterns].map((p) => roleLabel(p) as string);
	return [
		...(nodes.some((n) => n.slots.length)
			? [{ mark: "lollipop", name: "Provided interface" }]
			: []),
		...(nodes.some((n) => n.requires.length)
			? [{ mark: "socket", name: "Required interface" }]
			: []),
		...(graph.edges.length
			? [{ mark: "line", name: "Assembly connector" }]
			: []),
		...roleEntries(labels),
	];
}

function relationLegend(graph: Graph): LegendEntry[] {
	const types = new Set(graph.edges.map((e) => e.type));
	return [
		...(types.has("relation-includes")
			? [{ mark: "filled diamond", name: "Composition (includes)" }]
			: []),
		...(types.has("relation-references")
			? [{ mark: "open arrow", name: "Navigable association (references)" }]
			: []),
		...(types.has("relation-uses")
			? [{ mark: "dashed", name: "Dependency (uses)" }]
			: []),
		...(graph.edges.some((e) => e.sourceLabel || e.targetLabel)
			? [{ mark: "1, *, 0..1", name: "Multiplicity" }]
			: []),
	];
}

/** The legend for a graph of the given kind; empty when it shows nothing worth naming. */
export function legendEntries(graph: Graph, kind: DiagramKind): LegendEntry[] {
	switch (kind) {
		case "consumable":
			return consumableLegend(graph);
		case "relation":
			return relationLegend(graph);
		default:
			return contextLegend(graph);
	}
}
