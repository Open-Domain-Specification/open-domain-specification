import objectHash from "object-hash";
import { ODSConsumptionGraph } from "./consuption-graph";
import type { ConsumablePattern, ConsumptionPattern } from "./schema";
import type {
	Aggregate,
	BoundedContext,
	Consumption,
	Domain,
	Service,
	Subdomain,
	Workspace,
} from "./workspace";

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
			const targetNode: ODSConsumptionMapNode = this.addNode({
				id: consumption.consumable.provider.ref,
				name: consumption.consumable.provider.name,
				description: consumption.consumable.provider.description,
				namespace: [
					{
						id: consumption.consumer.boundedcontext.subdomain.domain.workspace
							.id,
						name: consumption.consumer.boundedcontext.subdomain.domain.workspace
							.name,
					},
					{
						id: consumption.consumable.provider.boundedcontext.subdomain.domain
							.ref,
						name: consumption.consumable.provider.boundedcontext.subdomain
							.domain.name,
					},
					{
						id: consumption.consumable.provider.boundedcontext.subdomain.ref,
						name: consumption.consumable.provider.boundedcontext.subdomain.name,
					},
					{
						id: consumption.consumable.provider.boundedcontext.ref,
						name: consumption.consumable.provider.boundedcontext.name,
					},
				],
			});

			const targetSlot: ODSConsumptionMapNodeSlot = this.addNodeSlot({
				id: consumption.consumable.ref,
				name: consumption.consumable.name,
				description: consumption.consumable.description,
				node: targetNode,
			});

			const sourceNode = this.addNode({
				id: consumption.consumer.ref,
				name: consumption.consumer.name,
				description: consumption.consumer.boundedcontext.description,
				namespace: [
					{
						id: consumption.consumer.boundedcontext.subdomain.domain.workspace
							.id,
						name: consumption.consumer.boundedcontext.subdomain.domain.workspace
							.name,
					},
					{
						id: consumption.consumer.boundedcontext.subdomain.domain.ref,
						name: consumption.consumer.boundedcontext.subdomain.domain.name,
					},
					{
						id: consumption.consumer.boundedcontext.subdomain.ref,
						name: consumption.consumer.boundedcontext.subdomain.name,
					},
					{
						id: consumption.consumer.boundedcontext.ref,
						name: consumption.consumer.boundedcontext.name,
					},
				],
			});

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

export type ODSCosumptionMapNamespace = {
	id: string;
	name: string;
};

export type ODSConsumptionMapNode = {
	id: string;
	name: string;
	description?: string;
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
	sourcePattern: ConsumptionPattern;
	target: ODSConsumptionMapNodeSlot;
	targetPattern: ConsumablePattern;
};
