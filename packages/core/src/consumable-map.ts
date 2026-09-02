import objectHash from "object-hash";
import { ODSConsumptionGraph } from "./consumption-graph";
import { contextMemberNamespace, type ODSNamespace } from "./namespace";
import type { DownstreamRole, UpstreamRole } from "./schema";
import {
	type Aggregate,
	type BoundedContext,
	type Consumption,
	type Domain,
	Service,
	type Subdomain,
	type Workspace,
} from "./workspace";

/** A consumer or provider node; both are services or aggregates. */
function memberNode(member: Aggregate | Service): ODSConsumptionMapNode {
	return {
		id: member.ref,
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
				id: consumption.consumable.ref,
				name: consumption.consumable.name,
				description: consumption.consumable.description,
				node: targetNode,
			});

			const sourceNode = this.addNode(memberNode(consumption.consumer));

			this.addEdge({
				source: sourceNode,
				target: targetSlot,
				sourcePattern: consumption.pattern,
				targetPattern: consumption.consumable.pattern,
			});
		}
	}

	static fromWorkspace(workspace: Workspace) {
		return new ODSConsumableMap(
			ODSConsumptionGraph.fromWorkspace(workspace).consumptions,
		);
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
	node: ODSConsumptionMapNode;
};

export type ODSConsumptionMapEdge = {
	source: ODSConsumptionMapNode;
	sourcePattern?: DownstreamRole;
	target: ODSConsumptionMapNodeSlot;
	targetPattern?: UpstreamRole;
};
