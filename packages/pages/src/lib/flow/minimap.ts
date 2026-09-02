import type { Node } from "@xyflow/svelte";

/** Cluster regions show as outlines in the minimap so members stay visible inside them. */
export const minimapNodeClass = (node: Pick<Node, "type">): string =>
	node.type === "cluster" ? "minimap-cluster" : "";
