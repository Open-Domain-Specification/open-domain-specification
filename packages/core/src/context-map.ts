import objectHash from "object-hash";
import { ODSConsumptionGraph } from "./consuption-graph";
import type { ConsumablePattern, ConsumptionPattern } from "./schema";
import type {
	BoundedContext,
	Consumption,
	Domain,
	Subdomain,
	Workspace,
} from "./workspace";

export class ODSContextMap {
	readonly nodes = new Map<string, ODSContextMapNode>();
	readonly edges = new Map<string, ODSContextMapEdge>();

	addNode(node: ODSContextMapNode) {
		const existingNode = this.nodes.get(node.id);
		if (existingNode) {
			return existingNode;
		}
		this.nodes.set(node.id, node);
		return node;
	}

	addEdge(edge: ODSContextMapEdge) {
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
			const sourceNode = this.addNode({
				id: consumption.consumable.provider.boundedcontext.ref,
				name: consumption.consumable.provider.boundedcontext.name,
				description: consumption.consumable.provider.boundedcontext.description,
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
				],
			});

			const targetNode = this.addNode({
				id: consumption.consumer.boundedcontext.ref,
				name: consumption.consumer.boundedcontext.name,
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
				],
			});

			this.addEdge({
				source: sourceNode,
				target: targetNode,
				sourcePattern: consumption.pattern,
				targetPattern: consumption.consumable.pattern,
			});
		}
	}

	static fromWorkspace(workspace: Workspace) {
		return new ODSContextMap(
			ODSConsumptionGraph.fromWorkspace(workspace).consumptions,
		);
	}

	static fromDomain(domain: Domain) {
		return new ODSContextMap(
			ODSConsumptionGraph.fromDomain(domain).consumptions,
		);
	}

	static fromSubdomain(subdomain: Subdomain) {
		return new ODSContextMap(
			ODSConsumptionGraph.fromSubdomain(subdomain).consumptions,
		);
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		return new ODSContextMap(
			ODSConsumptionGraph.fromBoundedContext(boundedcontext).consumptions,
		);
	}
}

export type ODSContextMapNamespace = {
	id: string;
	name: string;
};

export type ODSContextMapNode = {
	id: string;
	name: string;
	description?: string;
	namespace: ODSContextMapNamespace[];
};

export type ODSContextMapEdge = {
	source: ODSContextMapNode;
	sourcePattern: ConsumptionPattern;
	target: ODSContextMapNode;
	targetPattern: ConsumablePattern;
};
