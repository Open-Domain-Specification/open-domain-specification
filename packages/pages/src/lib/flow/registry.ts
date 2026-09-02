import type { Component } from "svelte";
import FloatingEdge from "./FloatingEdge.svelte";
import OdsNode from "./OdsNode.svelte";

/**
 * Node and edge components the interactive diagram can draw. A graph node or
 * edge picks one by its `type`; anything unset falls back to the generic card
 * node and the option-driven edge. Each map's adapter registers its own here.
 */
// biome-ignore lint/suspicious/noExplicitAny: Svelte Flow's registries are untyped maps of components
export const nodeTypes: Record<string, Component<any>> = { ods: OdsNode };
// biome-ignore lint/suspicious/noExplicitAny: same as above
export const edgeTypes: Record<string, Component<any>> = {
	floating: FloatingEdge,
};
