import type {
	ODSConsumableMap,
	ODSConsumptionMapEdge,
	ODSConsumptionMapNode,
	ODSConsumptionMapNodeSlot,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { ICONS } from "../icons";
import {
	type ConsumableNodeData,
	consumableGraph,
	slotIcon,
} from "./consumable-graph";

const provider: ODSConsumptionMapNode = {
	id: "#/boundedcontexts/catalog/aggregates/pet",
	name: "Pet",
	description: "A pet for sale",
	type: "aggregate",
	namespace: [
		{ id: "ws", name: "Petstore" },
		{ id: "commerce", name: "Commerce" },
		{ id: "catalog", name: "Catalog" },
	],
};
const consumer: ODSConsumptionMapNode = {
	id: "#/boundedcontexts/sales/services/checkout",
	name: "Checkout",
	type: "service",
	namespace: [{ id: "ws", name: "Petstore" }],
};
const reserve: ODSConsumptionMapNodeSlot = {
	id: `${provider.id}/provides/reserve_pet`,
	name: "Reserve Pet",
	description: "Holds a pet",
	type: "operation",
	node: provider,
};
const changed: ODSConsumptionMapNodeSlot = {
	id: `${provider.id}/provides/pet_status_changed`,
	name: "Pet Status Changed",
	type: "event",
	node: provider,
};
const edges: [string, ODSConsumptionMapEdge][] = [
	[
		"e1",
		{
			source: consumer,
			target: reserve,
			sourcePattern: "anti-corruption-layer",
			targetPattern: "open-host-service",
		},
	],
	["e2", { source: consumer, target: changed }],
	["e3", { source: provider, target: changed, sourcePattern: "conformist" }],
];
const map = {
	nodes: new Map([
		[provider.id, provider],
		[consumer.id, consumer],
	]),
	slots: new Map([
		[reserve.id, reserve],
		[changed.id, changed],
	]),
	edges: new Map(edges),
} as unknown as ODSConsumableMap;

describe("consumableGraph", () => {
	it("types nodes and edges as consumable and lists a provider's consumables as slots", () => {
		const g = consumableGraph(map);
		const [pet, checkout] = g.nodes as ConsumableNodeData[];
		expect(pet.type).toBe("consumable");
		expect(pet.icon).toBe(ICONS.aggregate);
		expect(pet.description).toBe("A pet for sale");
		expect(pet.groupPath).toBe("Commerce / Catalog");
		expect(pet.slots).toEqual([
			{
				id: reserve.id,
				name: "Reserve Pet",
				description: "Holds a pet",
				kind: "operation",
				pattern: "open-host-service",
			},
			{
				id: changed.id,
				name: "Pet Status Changed",
				description: undefined,
				kind: "event",
				pattern: undefined,
			},
		]);
		// The provider also consumes its own event: one socket, once.
		expect(pet.requires).toEqual([
			{ id: changed.id, name: "Pet Status Changed", pattern: "conformist" },
		]);
		// The layout sizes by attribute rows, so each slot and socket mirrors into one.
		expect(pet.attributes).toEqual([
			{ name: "Reserve Pet", type: "operation", identity: false },
			{ name: "Pet Status Changed", type: "event", identity: false },
			{ name: "Pet Status Changed", type: "requires", identity: false },
		]);
		expect(checkout.icon).toBe(ICONS.service);
		expect(checkout.groupPath).toBeUndefined();
		expect(checkout.slots).toEqual([]);
		expect(checkout.requires).toEqual([
			{ id: reserve.id, name: "Reserve Pet", pattern: "anti-corruption-layer" },
			{ id: changed.id, name: "Pet Status Changed", pattern: undefined },
		]);
		// Clusters nest per namespace level, workspace included, as the image draws them.
		expect(pet.groupId).toBe("cluster:catalog");
		expect(checkout.groupId).toBe("cluster:ws");
		expect(g.groups).toEqual([
			{ id: "cluster:ws", label: "Petstore", parent: undefined },
			{ id: "cluster:commerce", label: "Commerce", parent: "cluster:ws" },
			{ id: "cluster:catalog", label: "Catalog", parent: "cluster:commerce" },
		]);
		expect(g.edges).toEqual([
			{
				id: "e1",
				type: "consumable",
				source: consumer.id,
				target: provider.id,
				sourceHandle: reserve.id,
				targetHandle: reserve.id,
				label: "Reserve Pet",
				directed: false,
				sourceLabel: "anti-corruption-layer",
				targetLabel: "open-host-service",
			},
			{
				id: "e2",
				type: "consumable",
				source: consumer.id,
				target: provider.id,
				sourceHandle: changed.id,
				targetHandle: changed.id,
				label: "Pet Status Changed",
				directed: false,
				sourceLabel: undefined,
				targetLabel: undefined,
			},
			{
				id: "e3",
				type: "consumable",
				source: provider.id,
				target: provider.id,
				sourceHandle: changed.id,
				targetHandle: changed.id,
				label: "Pet Status Changed",
				directed: false,
				sourceLabel: "conformist",
				targetLabel: undefined,
			},
		]);
	});
	it("has no group for a node with an empty namespace", () => {
		const lone = { ...consumer, id: "#/lone", namespace: [] };
		const g = consumableGraph({
			nodes: new Map([[lone.id, lone]]),
			slots: new Map(),
			edges: new Map(),
		} as unknown as ODSConsumableMap);
		expect(g.nodes[0].groupId).toBeUndefined();
		expect(g.groups).toEqual([]);
	});
	it("picks icons per kind", () => {
		expect(slotIcon("event")).toBe(ICONS.event);
		expect(slotIcon("operation")).toBe(ICONS.command);
		expect(slotIcon(undefined)).toBe(ICONS.consumable);
	});
});
