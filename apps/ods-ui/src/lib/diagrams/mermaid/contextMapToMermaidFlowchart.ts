import type { SVGAttributes } from "react";
import type { ContextMap } from "../context-map.ts";
import { classesToMermaid } from "./classesToMermaid.ts";
import { subgraph } from "./subgraph.ts";

const classes: Record<string, SVGAttributes<any>> = {
	consumable: {
		strokeDasharray: "10",
		rx: "10",
		ry: "10",
		fontSize: "small",
	},
};

export function contextMapToMermaidFlowchart(contextMap: ContextMap): string {
	const lines: string[] = [];

	// Add the title
	lines.push("flowchart RL");

	for (const consumable of contextMap.consumables) {
		lines.push(
			subgraph(
				`${consumable.id}["${consumable.name}<br/>«<small>${consumable.pattern}</small>»"]:::consumable`,
				consumable.namespace,
			),
		);
	}

	// Add bounded contexts
	for (const context of contextMap.boundedContexts) {
		lines.push(subgraph(`${context.id}["${context.name}"]`, context.namespace));
	}

	// Add relationships
	for (const relationship of contextMap.relationships) {
		lines.push(
			`  ${relationship.source.id} -->|${relationship.type}| ${relationship.target.id}`,
		);
	}

	lines.push(...classesToMermaid(classes));

	return lines.join("\n");
}
