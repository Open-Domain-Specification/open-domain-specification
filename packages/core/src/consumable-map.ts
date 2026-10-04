import objectHash from "object-hash";
import { ODSConsumptionGraph } from "./consumption-graph";
import { contextMemberNamespace, type ODSNamespace } from "./namespace";
import type { ConsumableType, DownstreamRole, UpstreamRole } from "./schema";
import {
	type Aggregate,
	type BoundedContext,
	type Consumption,
	type Domain,
	Service,
	type Subdomain,
	type Workspace,
} from "./workspace";
import type { WorkspaceSet } from "./workspace-set";
import { identityKeyOf } from "./workspace-set";

/** A consumer or provider node; both are services or aggregates. */
function memberNode(member: Aggregate | Service): ODSConsumptionMapNode {
	return {
		id: identityKeyOf(member),
		name: member.name,
		description: member.description,
		type: member instanceof Service ? "service" : "aggregate",
		namespace: contextMemberNamespace(member),
	};
}

export class ODSConsumableMap {
	readonly slots = new Map<string, ODSConsumptionMapNodeSlot>();
	readonly nodes = new Map<string, ODSConsumptionMapNode>();
	readonly edges = new Map<string, ODSConsumptionMapEdge>();

	addNode(node: ODSConsumptionMapNode) {
		const existingNode = this.nodes.get(node.id);
		if (existingNode) {
			return existingNode;
		}
		this.nodes.set(node.id, node);
		return node;
	}

	addNodeSlot(slot: ODSConsumptionMapNodeSlot) {
		const existingSlot = this.slots.get(slot.id);
		if (existingSlot) {
			return existingSlot;
		}

		this.slots.set(slot.id, slot);
		return slot;
	}

	addEdge(edge: ODSConsumptionMapEdge) {
		const id = objectHash(edge);

		const existingEdge = this.edges.get(id);

		if (existingEdge) {
			return existingEdge;
		}

		this.edges.set(id, edge);

		return edge;
	}

	constructor(consumptions: Consumption[]) {
		for (const consumption of consumptions) {
			const targetNode = this.addNode(
				memberNode(consumption.consumable.provider),
			);

			const targetSlot: ODSConsumptionMapNodeSlot = this.addNodeSlot({
				id: identityKeyOf(consumption.consumable),
				name: consumption.consumable.name,
				description: consumption.consumable.description,
				type: consumption.consumable.type,
				node: targetNode,
			});

			const sourceNode = this.addNode(memberNode(consumption.consumer));

			const relationship = consumption.relationship;
			this.addEdge({
				source: sourceNode,
				target: targetSlot,
				sourcePattern: consumption.pattern,
				targetPattern: consumption.consumable.pattern,
				by: consumption.by.map((it) => it.name),
				...(relationship && {
					agreement: {
						name: relationship.name,
						type: relationship.type,
						ref: identityKeyOf(relationship),
					},
				}),
			});
		}
	}

	static fromWorkspace(workspace: Workspace) {
		return new ODSConsumableMap(
			ODSConsumptionGraph.fromWorkspace(workspace).consumptions,
		);
	}

	/** Every consumption across the files of a set. */
	static fromSet(set: WorkspaceSet) {
		return new ODSConsumableMap(ODSConsumptionGraph.fromSet(set).consumptions);
	}

	static fromDomain(domain: Domain) {
		return new ODSConsumableMap(
			ODSConsumptionGraph.fromDomain(domain).consumptions,
		);
	}

	static fromSubdomain(subdomain: Subdomain) {
		return new ODSConsumableMap(
			ODSConsumptionGraph.fromSubdomain(subdomain).consumptions,
		);
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		return new ODSConsumableMap(
			ODSConsumptionGraph.fromBoundedContext(boundedcontext).consumptions,
		);
	}

	static fromAggregate(aggregate: Aggregate) {
		return new ODSConsumableMap(
			ODSConsumptionGraph.fromAggregate(aggregate).consumptions,
		);
	}

	static fromService(service: Service) {
		return new ODSConsumableMap(
			ODSConsumptionGraph.fromService(service).consumptions,
		);
	}
}

export type ODSCosumptionMapNamespace = ODSNamespace;

export type ODSConsumptionMapNode = {
	id: string;
	name: string;
	description?: string;
	type: "aggregate" | "service";
	namespace: ODSCosumptionMapNamespace[];
};

export type ODSConsumptionMapNodeSlot = {
	id: string;
	name: string;
	description?: string;
	/** Whether the consumable is an event or an operation. */
	type: ConsumableType;
	node: ODSConsumptionMapNode;
};

export type ODSConsumptionMapEdge = {
	source: ODSConsumptionMapNode;
	sourcePattern?: DownstreamRole;
	target: ODSConsumptionMapNodeSlot;
	targetPattern?: UpstreamRole;
	/**
	 * The consumer's own operations or policies that make this exchange, by
	 * name. Empty means the whole consumer, which is the common case.
	 */
	by: string[];
	/**
	 * The agreement between the two contexts this exchange runs under, where the
	 * consumption names one. Absent means the pair's only agreement, which is
	 * the common case; `name` is absent where that agreement is unnamed.
	 * `ref` is the relationship's page.
	 */
	agreement?: { name?: string; type: string; ref: string };
};
