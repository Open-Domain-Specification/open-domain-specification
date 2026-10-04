import { describe, expect, it } from "vitest";
import { ODSConsumableMap } from "./consumable-map";
import { ODSContextMap } from "./context-map";
import { ODSFlowMap } from "./flow-map";
import { linkedPair, side } from "./linked-fixture";
import { ODSRelationMap } from "./relation-map";
import { usersOfSchema } from "./schema-users";
import { usersOfValueObject } from "./value-object-users";
import { AbstractVisitor, type Visitor } from "./visitor";
import type { BoundedContext, Workspace } from "./workspace";
import { setKeyOf, WorkspaceSet } from "./workspace-set";

/** Collects what a traversal reaches, to see which of two same-ref nodes it reached. */
class Collector extends AbstractVisitor {
	readonly contexts: BoundedContext[] = [];
	readonly workspaces: Workspace[] = [];
	constructor() {
		super({ followConsumptions: true });
	}
	visitWorkspace(node: Workspace): void {
		this.workspaces.push(node);
		super.visitWorkspace(node);
	}
	visitBoundedContext(node: BoundedContext): void {
		this.contexts.push(node);
		super.visitBoundedContext(node);
	}
}

describe("a visitor over a set", () => {
	it("reaches the contexts of every file, including those that share a ref with another file's", () => {
		const { a, b, set } = linkedPair();
		const collector = new Collector();
		set.accept(collector);
		expect(collector.workspaces).toEqual([a.ws, b.ws]);
		expect(collector.contexts).toHaveLength(4);
		expect(new Set(collector.contexts).size).toBe(4);
		expect(collector.contexts).toContain(a.ledger);
		expect(collector.contexts).toContain(b.ledger);
		expect(a.ledger.ref).toBe(b.ledger.ref);
	});

	it("keeps the old order: the files in the order of the set, then each file as it always walked", () => {
		const { a, b, set } = linkedPair();
		const collector = new Collector();
		set.accept(collector);
		const alone = new Collector();
		a.ws.accept(alone);
		const aloneB = new Collector();
		b.ws.accept(aloneB);
		// Followed consumptions reach across the files, so only the order of the
		// workspaces themselves is the set's to promise.
		expect(collector.workspaces.map((it) => it.id)).toEqual([a.ws.id, b.ws.id]);
		expect(alone.workspaces).toEqual([a.ws]);
	});

	it("visits a set as each of its workspaces for a visitor that does not know sets", () => {
		const { a, b, set } = linkedPair();
		const seen: Workspace[] = [];
		const old = {
			visitWorkspace: (node: Workspace) => seen.push(node),
		} as unknown as Visitor;
		set.accept(old);
		expect(seen).toEqual([a.ws, b.ws]);
	});

	it("lets a visitor take the set whole by overriding visitWorkspaceSet", () => {
		const { set } = linkedPair();
		let taken: WorkspaceSet | undefined;
		class Whole extends Collector {
			visitWorkspaceSet(node: WorkspaceSet) {
				taken = node;
			}
		}
		const whole = new Whole();
		set.accept(whole);
		expect(taken).toBe(set);
		expect(whole.workspaces).toEqual([]);
	});
});

describe("the derived maps over a set keep two files' same-id elements apart", () => {
	it("context map: four contexts, four nodes, each keyed by its file", () => {
		const { a, b, set } = linkedPair();
		const map = ODSContextMap.fromSet(set);
		expect([...map.nodes.keys()].sort()).toEqual(
			[a.ledger, a.risk, b.ledger, b.risk].map((it) => setKeyOf(it)).sort(),
		);
		expect(map.nodes.get(setKeyOf(a.ledger) as string)?.namespace[0]).toEqual({
			id: a.ws.id,
			name: a.ws.name,
		});
		expect(map.nodes.get(setKeyOf(b.ledger) as string)?.namespace[0]).toEqual({
			id: b.ws.id,
			name: b.ws.name,
		});
		// A team and a subdomain declared in one file and used from another are
		// keyed the same way.
		expect(map.nodes.get(setKeyOf(a.risk) as string)?.team?.id).toBe(
			setKeyOf(b.team),
		);
	});

	it("context map: every declared relationship is its own edge, between the contexts it names", () => {
		const { a, b, set } = linkedPair();
		const map = ODSContextMap.fromSet(set);
		const edges = [...map.edges.values()].filter((it) => !it.implied);
		const declared = [...a.ws.relationships, ...b.ws.relationships];
		expect(edges).toHaveLength(declared.length);
		for (const relationship of declared) {
			expect(
				edges.some(
					(it) =>
						it.source.id === setKeyOf(relationship.source) &&
						it.target.id === setKeyOf(relationship.target) &&
						it.type === relationship.type,
				),
			).toBe(true);
		}
	});

	it("context map from one file of a set: another file's relationship that involves it is drawn", () => {
		const a = side("Team A");
		const b = side("Team B");
		// The relationship is declared in B, between B's context and A's.
		b.ws.addRelationship({
			type: "upstream-downstream",
			upstream: b.ledger,
			downstream: a.risk,
			upstreamRoles: [],
			downstreamRoles: [],
			description: "",
		});
		const set = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		const map = ODSContextMap.fromWorkspace(a.ws);
		const edge = [...map.edges.values()].find(
			(it) => it.source.id === setKeyOf(b.ledger),
		);
		expect(edge?.target.id).toBe(setKeyOf(a.risk));
		expect(set.workspaces).toHaveLength(2);
	});

	it("a workspace outside any set maps as it always did, by local ref", () => {
		const alone = side("Alone");
		const map = ODSContextMap.fromWorkspace(alone.ws);
		expect([...map.nodes.keys()]).toEqual(
			expect.arrayContaining([alone.ledger.ref, alone.risk.ref]),
		);
		expect(setKeyOf(alone.ledger)).toBeUndefined();
	});

	it("consumable map: A's post and B's post are two slots, each under its own provider node", () => {
		const { a, b, set } = linkedPair();
		const map = ODSConsumableMap.fromSet(set);
		const slots = [...map.slots.values()].filter((it) => it.name === "Post");
		expect(slots.map((it) => it.id)).toEqual([setKeyOf(b.post)]);
		expect(slots[0].node.id).toBe(setKeyOf(b.payments));
		const consumer = [...map.nodes.values()].find(
			(it) => it.id === setKeyOf(a.account),
		);
		expect(consumer?.name).toBe("Account");
		const edge = [...map.edges.values()][0];
		expect(edge.agreement?.ref).toBe(setKeyOf(b.agreement));
	});

	it("flow map: the steps of two files with the same ref are different nodes", () => {
		const { a, b, set } = linkedPair();
		const map = ODSFlowMap.fromSet(set);
		const ids = [...map.nodes.keys()];
		expect(ids).toContain(setKeyOf(a.posted));
		expect(ids).toContain(setKeyOf(b.posted));
		expect(a.posted.ref).toBe(b.posted.ref);
		expect(new Set(ids).size).toBe(ids.length);
		// The two reactors with one name stay two nodes.
		expect(ids).toContain(setKeyOf(a.react));
		expect(ids).toContain(setKeyOf(b.react));
	});

	it("relation map: A's line and kind point at B's root, and a root that nothing relates is not drawn as it", () => {
		const { a, b, links, set } = linkedPair();
		const map = ODSRelationMap.fromSet(set);
		const ids = [...map.nodes.keys()];
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toContain(setKeyOf(a.line));
		expect(ids).toContain(setKeyOf(b.root));
		// A's root has the same ref as B's; it is not drawn as B's.
		expect(a.root.ref).toBe(b.root.ref);
		expect(ids).not.toContain(setKeyOf(a.root));
		const lineEdge = [...map.edges.values()].find(
			(it) => it.source.id === setKeyOf(a.line) && it.relation === "references",
		);
		expect(lineEdge?.target.id).toBe(setKeyOf(b.root));
		const kindEdge = [...map.edges.values()].find(
			(it) =>
				it.relation === "specialises" && it.source.id === setKeyOf(links.kind),
		);
		expect(kindEdge?.target.id).toBe(setKeyOf(b.root));
	});
});

describe("derived lookups over a set", () => {
	it("a value object's users include another file's holder and kind", () => {
		const { a, b } = linkedPair();
		const users = usersOfValueObject(b.money);
		expect(users.map((it) => it.owner)).toEqual(
			expect.arrayContaining([
				a.line.aggregate ? a.account : a.account,
				a.ledger.valueobjects.get("fiat"),
			]),
		);
		expect(b.money.kinds).toEqual([a.ledger.valueobjects.get("fiat")]);
	});

	it("a schema's consumables include another file's operation", () => {
		const { a, b } = linkedPair();
		const fx = a.payments.consumables.get("fx");
		expect(b.receipt.consumables).toEqual(expect.arrayContaining([fx, b.post]));
		const users = usersOfSchema(b.receipt);
		expect(
			users.some((it) => it.kind === "consumable" && it.owner === fx),
		).toBe(true);
	});

	it("a subdomain and a team list the contexts of the files that name them", () => {
		const { a, b } = linkedPair();
		expect(b.team.boundedcontexts).toEqual([a.risk]);
		expect([...b.sub.boundedcontexts.values()]).toEqual([
			a.risk,
			b.ledger,
			b.risk,
		]);
		expect([...b.sub.boundedcontexts.keys()]).toEqual([
			setKeyOf(a.risk),
			setKeyOf(b.ledger),
			setKeyOf(b.risk),
		]);
	});
});
