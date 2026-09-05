import type {
	ODSFlowMap,
	ODSFlowMapNode,
} from "@open-domain-specification/core";
import { ICONS } from "../icons";
import {
	deepestGroup,
	type Graph,
	type GraphNode,
	groupPathOf,
	namespaceGroups,
} from "./graph";

/** Which of the four steps a node stands for; the shape follows it. */
export type FlowStep = ODSFlowMapNode["type"];

export type FlowNodeData = GraphNode & {
	description?: string;
	/** Event, operation, policy or process: what the node's shape says. */
	step: FlowStep;
	/** The policy or process the page is about, marked so the reader finds it. */
	focus?: boolean;
};

/**
 * What the three pages that embed the map call it, and what they say when it
 * is empty. One wording, because the context page, the policy page and the
 * process page all draw the same context's chain.
 */
export const flowMapCaption = (contextName: string) =>
	`${contextName} flow map`;
export const FLOW_MAP_EMPTY = "Nothing reacts to anything here yet.";

/** The label an `ends` edge carries, so the dash is never read as a step. */
export const ENDS_LABEL = "ends";

/** Codicon per step, the same glyph the tree, the tables and the docs use. */
export const stepIcon = (step: FlowStep): string =>
	step === "event"
		? ICONS.event
		: step === "command"
			? ICONS.command
			: step === "policy"
				? ICONS.policy
				: ICONS.process;

/**
 * The reactions of a scope as a graph: one node per step of the causal chain
 * — an event, an operation, a policy or a process — and one edge per step the
 * chain takes, plus the dashed `ends` edge from a process to the fact that
 * completes an instance, which is not a step at all (decision 23).
 *
 * Every namespace level is a group, as the consumable map nests its clusters:
 * a policy or a process sits under its context, a consumable under the
 * provider that offers it, so a step reached in another context reads as
 * belonging over there.
 *
 * `focus` is the ref of the policy or process whose page this is; its node is
 * marked so the reader finds themselves in a map of the whole context.
 */
export function flowGraph(map: ODSFlowMap, focus?: string): Graph {
	const nodes: FlowNodeData[] = [...map.nodes.values()].map((n) => ({
		id: n.id,
		type: "flow",
		label: n.name,
		description: n.description,
		icon: stepIcon(n.type),
		step: n.type,
		groupPath: groupPathOf(n.namespace),
		groupId: deepestGroup(n.namespace),
		...(n.id === focus && { focus: true }),
	}));
	return {
		nodes,
		groups: namespaceGroups([...map.nodes.values()]),
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			type: "flow",
			source: e.source.id,
			target: e.target.id,
			directed: true,
			...(e.kind === "ends" && { dashed: true, label: ENDS_LABEL }),
		})),
	};
}
