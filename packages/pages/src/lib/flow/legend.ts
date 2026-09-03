import {
	type Disposition,
	dispositionOf,
	PATTERNS,
	type PatternNature,
} from "@open-domain-specification/core";
import { DISPOSITION_LABELS, DISPOSITION_SUMMARIES } from "../evidence/labels";
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
export type LegendEntry = {
	mark: string;
	name: string;
	/** Longer explanation on hover, where the name alone is a bare word. */
	title?: string;
};

/**
 * The badge marks the evidence layer draws, in the order a reader meets them.
 * `by-design` is the unmarked default and so is never a legend row: a filled
 * badge is simply a badge.
 */
const MARKED: { disposition: Disposition; mark: string }[] = [
	{ disposition: "tolerated", mark: "outlined badge" },
	{ disposition: "refactor", mark: "warning badge" },
];

/** One row per disposition mark the map's edges actually carry. */
function dispositionEntries(graph: Graph): LegendEntry[] {
	const drawn = new Set(
		graph.edges.flatMap((e) => (e.intent ? [dispositionOf(e.intent)] : [])),
	);
	return MARKED.filter(({ disposition }) => drawn.has(disposition)).map(
		({ disposition, mark }) => ({
			mark,
			name: DISPOSITION_LABELS[disposition],
			title: DISPOSITION_SUMMARIES[disposition],
		}),
	);
}

/** Mark to full name for the patterns of the given categories, from core's knowledge base. */
const marksOf = (...categories: PatternNature["category"][]) =>
	new Map(
		Object.values(PATTERNS)
			.filter((p) => categories.includes(p.category))
			.map((p) => [p.abbreviation, p.name]),
	);

/** Abbreviation to full name for every role a context end can play. */
const ROLES = marksOf("upstream-role", "downstream-role");
/** Stereotype mark to full name for every relationship type. */
const STEREOTYPES = marksOf("relationship");

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
		...dispositionEntries(graph),
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
