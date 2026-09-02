import {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { consumableGraph, contextGraph, relationGraph } from "./graph";
import { layout } from "./layout";

const { workspace } = petstoreModel();

describe("graph adapters", () => {
	it("map every context node and edge with refs as ids", () => {
		const map = ODSContextMap.fromWorkspace(workspace);
		const g = contextGraph(map);
		expect(g.nodes.map((n) => n.id).sort()).toEqual(
			[...map.nodes.keys()].sort(),
		);
		expect(g.edges).toHaveLength(map.edges.size);
		for (const e of g.edges) {
			expect(g.nodes.some((n) => n.id === e.source)).toBe(true);
			expect(g.nodes.some((n) => n.id === e.target)).toBe(true);
		}
	});
	it("carry attributes into relation nodes and slots into consumable edge labels", () => {
		const bc = [...workspace.boundedcontexts.values()][0];
		const rel = relationGraph(
			ODSRelationMap.fromAggregate([...bc.aggregates.values()][0]),
		);
		expect(rel.nodes.some((n) => (n.attributes?.length ?? 0) > 0)).toBe(true);
		const con = consumableGraph(ODSConsumableMap.fromBoundedContext(bc));
		expect(con.edges.every((e) => e.label)).toBe(true);
	});
	it("lay out every node with a position", () => {
		const g = layout(contextGraph(ODSContextMap.fromWorkspace(workspace)));
		expect(g.positions.size).toBe(g.nodes.length);
		for (const p of g.positions.values())
			expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
	});
});
