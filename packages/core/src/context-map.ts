import objectHash from "object-hash";
import { ODSConsumptionGraph } from "./consumption-graph";
import { boundedContextNamespace, type ODSNamespace } from "./namespace";
import type { ConsumablePattern, ConsumptionPattern } from "./schema";
import type {
	BoundedContext,
	Consumption,
	Domain,
	Subdomain,
	Workspace,
} from "./workspace";

function contextNode(bc: BoundedContext): ODSContextMapNode {
	return {
		id: bc.ref,
		name: bc.name,
		description: bc.description,
		namespace: boundedContextNamespace(bc),
	};
}

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
			const sourceNode = this.addNode(
				contextNode(consumption.consumable.provider.boundedcontext),
			);
			const targetNode = this.addNode(
				contextNode(consumption.consumer.boundedcontext),
			);

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

export type ODSContextMapNamespace = ODSNamespace;

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
