import type { Component } from "svelte";
import ClusterNode from "./ClusterNode.svelte";
import ConsumableEdge from "./ConsumableEdge.svelte";
import ConsumableNode from "./ConsumableNode.svelte";
import ContextEdge from "./ContextEdge.svelte";
import ContextNode from "./ContextNode.svelte";
import RelationEdge from "./RelationEdge.svelte";
import RelationNode from "./RelationNode.svelte";

/**
 * Node and edge components the interactive diagram can draw. A graph node or
 * edge picks one by its `type`; each map's adapter registers its own here.
 */
// biome-ignore lint/suspicious/noExplicitAny: Svelte Flow's registries are untyped maps of components
export const nodeTypes: Record<string, Component<any>> = {
	context: ContextNode,
	relation: RelationNode,
	consumable: ConsumableNode,
	cluster: ClusterNode,
};
// biome-ignore lint/suspicious/noExplicitAny: same as above
export const edgeTypes: Record<string, Component<any>> = {
	context: ContextEdge,
	"relation-includes": RelationEdge,
	"relation-references": RelationEdge,
	"relation-uses": RelationEdge,
	"relation-identifies": RelationEdge,
	consumable: ConsumableEdge,
};
