import {
	ODSConsumableMap,
	ODSContextMap,
	ODSFlowMap,
	ODSRelationMap,
	setKeyOf,
	Workspace,
	WorkspaceSet,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { consumableMapToDigraph } from "./consumable-map";
import { contextMapToDigraph } from "./context-map";
import { flowMapToDigraph } from "./flow-map";
import { relationMapToDigraph } from "./relation-map";
import { collidingSet } from "./set.support";

const A = "a.json";
const B = "team%20b/%C3%BC.json";

/** How many nodes and edges an SVG drew, and the titles of its nodes. */
function drawn(svg: string) {
	const titles = (kind: string) =>
		[
			...svg.matchAll(
				new RegExp(
					`<g id="${kind}\\d+" class="${kind}">\\s*<title>([^<]*)</title>`,
					"g",
				),
			),
		].map((it) => it[1]);
	return { nodes: titles("node"), edges: titles("edge") };
}

describe("diagrams of a set", () => {
	it("keeps each of two same-id contexts a node of its own, and each file a cluster", async () => {
		const { a, b, set } = collidingSet();
		const map = ODSContextMap.fromSet(set);
		// The ids the map draws are the set keys, so nothing is merged by id.
		expect([...map.nodes.keys()].sort()).toEqual(
			[a.ledger, a.risk, b.ledger, b.risk].map((it) => setKeyOf(it)).sort(),
		);
		expect(setKeyOf(a.ledger)).toBe(`${A}#/boundedcontexts/ledger`);
		expect(setKeyOf(b.ledger)).toBe(`${B}#/boundedcontexts/ledger`);

		const drawing = contextMapToDigraph(map);
		const dot = drawing.toDot();
		// One workspace cluster for each file, each holding its own contexts.
		expect(dot).toContain('label = "Team A"');
		expect(dot).toContain('label = "Team B"');
		expect(dot.indexOf('subgraph "team_a"')).toBeLessThan(
			dot.indexOf(`"${A}#/boundedcontexts/ledger" [`),
		);
		expect(dot.indexOf(`"${B}#/boundedcontexts/ledger" [`)).toBeGreaterThan(
			dot.indexOf('subgraph "team_b"'),
		);
		// The declaration is B's Ledger upstream of A's, and only that edge.
		expect(dot).toContain(
			`"${B}#/boundedcontexts/ledger" -> "${A}#/boundedcontexts/ledger"`,
		);
		const svg = drawn(await drawing.toSVG());
		expect(svg.nodes).toHaveLength(4);
		expect(new Set(svg.nodes).size).toBe(4);
		expect(svg.edges).toEqual([
			`${B}#/boundedcontexts/ledger&#45;&gt;${A}#/boundedcontexts/ledger`,
		]);
	});

	it("draws a reaction of one file to an event of another between two distinct nodes", async () => {
		const { a, b, set } = collidingSet();
		const flow = ODSFlowMap.fromSet(set);
		const dot = flowMapToDigraph(flow).toDot();
		const event = setKeyOf(b.posted) as string;
		const policy = setKeyOf(a.react) as string;
		expect(dot).toContain(`"${event}" -> "${policy}"`);
		// B's own React is a node of its own too, though nothing draws to it.
		expect([...flow.nodes.keys()].sort()).toEqual(
			[event, policy, setKeyOf(b.react) as string].sort(),
		);
		expect(setKeyOf(b.react)).not.toBe(policy);
		// Each node says which file it is in, since two files may both have a
		// Posted of a Payments or a React.
		expect(dot).toContain("Posted\\n(Payments)\\nin Team B");
		expect(dot).toContain('label = "React\\nin Team A"');
		const svg = drawn(await flowMapToDigraph(flow).toSVG());
		expect(svg.nodes).toHaveLength(3);
		expect(svg.edges).toHaveLength(1);
	});

	it("leaves the labels of a map inside one file as they have always been", () => {
		const { b } = collidingSet();
		const dot = flowMapToDigraph(ODSFlowMap.fromBoundedContext(b.risk)).toDot();
		expect(dot).toContain('label = "React"');
		expect(dot).not.toContain("in Team");
		const relation = relationMapToDigraph(
			ODSRelationMap.fromAggregate(b.account),
		).toDot();
		expect(relation).toContain('label = "Bank / Core / Ledger / Account"');
		expect(relation).not.toContain("Team B /");
	});

	it("draws a consumption across files from the consumer to the provider that is there", async () => {
		const { a, b, set } = collidingSet();
		const map = ODSConsumableMap.fromSet(set);
		const consumer = setKeyOf(a.account) as string;
		const provider = setKeyOf(b.payments) as string;
		const drawing = consumableMapToDigraph(map);
		expect(drawing.toDot()).toContain(`"${consumer}" -> "${provider}"`);
		const svg = drawn(await drawing.toSVG());
		expect(svg.nodes.sort()).toEqual([consumer, provider].sort());
		expect(svg.edges).toHaveLength(1);
	});

	it("tells two aggregates of one name apart by the file their cluster is in", async () => {
		const { a, b, set } = collidingSet();
		const map = ODSRelationMap.fromSet(set);
		const drawing = relationMapToDigraph(map);
		const dot = drawing.toDot();
		expect(dot).toContain('label = "Team A / Bank / Core / Ledger / Account"');
		expect(dot).toContain('label = "Team B / Bank / Core / Ledger / Account"');
		// A's Line relates to B's root, B's Line to B's own root: three
		// entities of distinct identity and the two edges between them.
		const line = (set: typeof a) => setKeyOf(set.line) as string;
		const root = setKeyOf(b.root) as string;
		expect(dot).toContain(`"${line(a)}" -> "${root}"`);
		expect(dot).toContain(`"${line(b)}" -> "${root}"`);
		expect(line(a)).not.toBe(line(b));
		const uml = drawing.toPlantUML();
		expect(uml.match(/^package "/gm)).toHaveLength(2);
		const svg = drawn(await drawing.toSVG());
		expect(new Set(svg.nodes).size).toBe(3);
		expect(svg.edges).toHaveLength(2);
	});

	it("keeps two same-id files' contexts apart but draws one workspace cluster, the cost of the error workspace-id-unique reports", () => {
		const alike = () => {
			const workspace = new Workspace("Same", {
				description: "",
				version: "1",
			});
			workspace.addBoundedContext("Ledger", { description: "" });
			return workspace;
		};
		const set = WorkspaceSet.fromWorkspaces([
			["a.json", alike()],
			["b.json", alike()],
		]);
		const dot = contextMapToDigraph(ODSContextMap.fromSet(set)).toDot();
		expect(dot).toContain('"a.json#/boundedcontexts/ledger" [');
		expect(dot).toContain('"b.json#/boundedcontexts/ledger" [');
		expect(dot.match(/class = "namespace"/g)).toHaveLength(1);
		expect(set.validate().map((it) => it.rule)).toContain(
			"workspace-id-unique",
		);
	});
});
