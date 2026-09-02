import objectHash from "object-hash";
import { aggregateNamespace, type ODSNamespace } from "./namespace";
import type { EntityRelationType } from "./schema";
import { AbstractVisitor } from "./visitor";
import {
	type Aggregate,
	type BoundedContext,
	type Domain,
	Entity,
	type EntityRelation,
	type Subdomain,
	type ValueObject,
	type Workspace,
} from "./workspace";

function relationNodeType(
	node: Entity | ValueObject,
): ODSRelationMapNode["type"] {
	if (!(node instanceof Entity)) return "valueobject";
	return node.root ? "entity_root" : "entity";
}

function relationNode(node: Entity | ValueObject): ODSRelationMapNode {
	return {
		id: node.ref,
		name: node.name,
		description: node.description,
		type: relationNodeType(node),
		namespace: aggregateNamespace(node.aggregate),
	};
}

export class ODSRelationGraph extends AbstractVisitor {
	protected readonly _relations = new Set<EntityRelation>();

	get relations(): EntityRelation[] {
		return Array.from(this._relations.values());
	}

	constructor() {
		super({ followRelations: true });
	}

	visitEntityRelation(relation: EntityRelation) {
		this._relations.add(relation);
		super.visitEntityRelation(relation);
	}

	static fromWorkspace(workspace: Workspace) {
		const odsConsumptionGraph = new ODSRelationGraph();
		odsConsumptionGraph.visitWorkspace(workspace);
		return odsConsumptionGraph;
	}

	static fromDomain(domain: Domain) {
		const odsConsumptionGraph = new ODSRelationGraph();
		odsConsumptionGraph.visitDomain(domain);
		return odsConsumptionGraph;
	}

	static fromSubdomain(subdomain: Subdomain) {
		const odsConsumptionGraph = new ODSRelationGraph();
		odsConsumptionGraph.visitSubdomain(subdomain);
		return odsConsumptionGraph;
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		const odsConsumptionGraph = new ODSRelationGraph();
		odsConsumptionGraph.visitBoundedContext(boundedcontext);
		return odsConsumptionGraph;
	}

	static fromAggregate(aggregate: Aggregate) {
		const odsConsumptionGraph = new ODSRelationGraph();
		odsConsumptionGraph.visitBoundedContext(aggregate.boundedcontext);
		return odsConsumptionGraph;
	}
}

export class ODSRelationMap {
	readonly nodes = new Map<string, ODSRelationMapNode>();
	readonly edges = new Map<string, ODSRelationMapEdge>();

	addNode(node: ODSRelationMapNode) {
		const existingNode = this.nodes.get(node.id);
		if (existingNode) {
			return existingNode;
		}
		this.nodes.set(node.id, node);
		return node;
	}

	addEdge(edge: ODSRelationMapEdge) {
		const id = objectHash(edge);

		const existingEdge = this.edges.get(id);

		if (existingEdge) {
			return existingEdge;
		}

		this.edges.set(id, edge);

		return edge;
	}

	constructor(relations: EntityRelation[]) {
		for (const relation of relations) {
			const sourceNode = this.addNode(relationNode(relation.source));
			const targetNode = this.addNode(relationNode(relation.target));

			this.addEdge({
				source: sourceNode,
				target: targetNode,
				relation: relation.relation,
				label: relation.label || "",
			});
		}
	}

	static fromWorkspace(workspace: Workspace) {
		return new ODSRelationMap(
			ODSRelationGraph.fromWorkspace(workspace).relations,
		);
	}

	static fromDomain(domain: Domain) {
		return new ODSRelationMap(ODSRelationGraph.fromDomain(domain).relations);
	}

	static fromSubdomain(subdomain: Subdomain) {
		return new ODSRelationMap(
			ODSRelationGraph.fromSubdomain(subdomain).relations,
		);
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		return new ODSRelationMap(
			ODSRelationGraph.fromBoundedContext(boundedcontext).relations,
		);
	}

	static fromAggregate(aggregate: Aggregate) {
		return new ODSRelationMap(
			ODSRelationGraph.fromAggregate(aggregate).relations,
		);
	}
}

export type ODSRelationMapNamespace = ODSNamespace;

export type ODSRelationMapNode = {
	id: string;
	name: string;
	description?: string;
	namespace: ODSRelationMapNamespace[];
	type: "entity_root" | "entity" | "valueobject";
};

export type ODSRelationMapEdge = {
	source: ODSRelationMapNode;
	target: ODSRelationMapNode;
	relation: EntityRelationType;
	label: string;
};
