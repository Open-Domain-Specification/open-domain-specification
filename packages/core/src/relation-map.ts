import objectHash from "object-hash";
import {
	aggregateNamespace,
	boundedContextNamespace,
	contextMemberNamespace,
	type ODSNamespace,
} from "./namespace";
import {
	type EntityRelationType,
	type RelationCardinality,
	RelationType,
} from "./schema";
import { AbstractVisitor } from "./visitor";
import {
	type Aggregate,
	type Attribute,
	BoundedContext,
	type Domain,
	Entity,
	type EntityRelation,
	type Subdomain,
	ValueObject,
	type Workspace,
} from "./workspace";

/** Anything the map can draw a box for. */
type RelationMapMember = Entity | ValueObject | BoundedContext;

function relationNodeType(
	node: RelationMapMember,
	borrowed: boolean,
): ODSRelationMapNode["type"] {
	if (node instanceof BoundedContext) return "external_context";
	if (!(node instanceof Entity))
		return borrowed ? "foreign_valueobject" : "valueobject";
	return node.root ? "entity_root" : "entity";
}

/**
 * The cluster a box hangs in. An external context is nobody's aggregate, so it
 * stands in a cluster of its own named after itself: that is where a reader
 * expects a system the enterprise does not own, outside every aggregate on the
 * map (decision 28).
 */
function relationNamespace(node: RelationMapMember): ODSNamespace[] {
	if (node instanceof BoundedContext)
		return [
			...boundedContextNamespace(node),
			{ id: node.ref, name: node.name },
		];
	return node instanceof Entity
		? aggregateNamespace(node.aggregate)
		: contextMemberNamespace(node);
}

/**
 * A box for one member. `borrowed` marks a value object the holder reaches over
 * a shared kernel or a conformist relationship: it draws in its own context's
 * cluster, so the box says which context the value belongs to (decision 16,
 * third amendment).
 */
function relationNode(
	node: RelationMapMember,
	borrowed = false,
): ODSRelationMapNode {
	return {
		id: node.ref,
		name: node.name,
		description: node.description,
		type: relationNodeType(node, borrowed),
		namespace: relationNamespace(node),
		// An external context has no attributes of ours to list: what is inside
		// it is not ours to state, so the box carries the name and the
		// stereotype and nothing else.
		attributes:
			node instanceof BoundedContext
				? []
				: [...node.attributes.values()].map((it) => ({
						name: it.name,
						type: it.type,
						identity: it.identity,
						optional: it.optional,
						description: it.description,
					})),
	};
}

export class ODSRelationGraph extends AbstractVisitor {
	protected readonly _relations = new Set<EntityRelation>();
	protected readonly _identities = new Set<Attribute>();
	protected readonly _subtypes = new Set<Entity | ValueObject>();
	protected readonly _borrowings = new Set<Attribute>();

	get relations(): EntityRelation[] {
		return Array.from(this._relations.values());
	}

	/**
	 * The entities and value objects in scope that are a kind of another one.
	 * The map draws each as a generalisation, pointing at what it is a kind
	 * of, which may be a value object of the kernel context it is borrowed
	 * from (decision 22).
	 */
	get subtypes(): (Entity | ValueObject)[] {
		return Array.from(this._subtypes.values());
	}

	/**
	 * The attributes in scope typed by a value object of another bounded
	 * context, borrowed over a shared kernel or from an upstream this context
	 * conforms to. No `uses` relation may say so, because a relation never
	 * crosses a boundary, so the map derives the dependency from the attribute
	 * itself and draws the value in the lending context's cluster (decision 16,
	 * third amendment).
	 */
	get borrowings(): Attribute[] {
		return Array.from(this._borrowings.values());
	}

	/**
	 * The attributes in scope that hold another entity's identity. They are the
	 * only dependency allowed to leave a bounded context, so the map would
	 * otherwise show nothing where the model says the most (decision 14).
	 */
	get identities(): Attribute[] {
		return Array.from(this._identities.values());
	}

	constructor() {
		super({ followRelations: true });
	}

	visitEntityRelation(relation: EntityRelation) {
		this._relations.add(relation);
		super.visitEntityRelation(relation);
	}

	visitEntity(entity: Entity) {
		this.collectIdentities(entity);
		this.collectSpecialisation(entity);
		this.collectBorrowings(entity);
		super.visitEntity(entity);
	}

	visitValueObject(valueobject: ValueObject) {
		this.collectIdentities(valueobject);
		this.collectSpecialisation(valueobject);
		this.collectBorrowings(valueobject);
		super.visitValueObject(valueobject);
	}

	private collectIdentities(node: Entity | ValueObject) {
		for (const attribute of node.attributes.values())
			if (attribute.identifies) this._identities.add(attribute);
	}

	private collectSpecialisation(node: Entity | ValueObject) {
		if (node.specialises) this._subtypes.add(node);
	}

	private collectBorrowings(node: Entity | ValueObject) {
		for (const attribute of node.attributes.values()) {
			const vo = attribute.valueobject;
			if (vo && vo.boundedcontext !== node.boundedcontext)
				this._borrowings.add(attribute);
		}
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

	constructor(
		relations: EntityRelation[],
		identities: Attribute[] = [],
		subtypes: (Entity | ValueObject)[] = [],
		borrowings: Attribute[] = [],
	) {
		for (const relation of relations) {
			const sourceNode = this.addNode(relationNode(relation.source));
			const targetNode = this.addNode(relationNode(relation.target));

			this.addEdge({
				source: sourceNode,
				target: targetNode,
				relation: relation.relation,
				label: relation.label || "",
				cardinality: relation.cardinality,
			});
		}
		// An identity attribute draws too: it is the dependency the model keeps
		// when a relation may not be had, and the entity it names is often in
		// another context, so the map reaches out of the cluster to show it.
		// A child entity draws as itself, inside its own aggregate's cluster:
		// that is where the reader sees the root the child is reached through.
		for (const attribute of identities) {
			const { owner, identifies: target } = attribute;
			const drawable = owner instanceof Entity || owner instanceof ValueObject;
			if (!target || !drawable) continue;
			// An id of a system nobody here models lands on that system's own box:
			// there is no entity to point at, and the dependency is the point
			// (decision 28).
			this.addEdge({
				source: this.addNode(relationNode(owner)),
				target: this.addNode(relationNode(target)),
				relation: "identifies",
				label: attribute.name,
			});
		}
		// A kind draws as a generalisation at what it is a kind of, and carries
		// no label or multiplicity: the line says the whole of it, and the
		// attributes it inherits stay in the parent's compartment rather than
		// being repeated in the kind's (decision 22).
		for (const subtype of subtypes) {
			const parent = subtype.specialises;
			if (!parent) continue;
			this.addEdge({
				source: this.addNode(relationNode(subtype)),
				target: this.addNode(relationNode(parent)),
				relation: "specialises",
				label: "",
			});
		}
		// A value object borrowed from another context draws too, reached by the
		// same dependency line as a value of this one and named by the attribute
		// that holds it. That line is never declared, since a relation may not
		// cross a boundary, so it is derived from the attribute; the box stands
		// in the lending context's cluster, which is where the reader sees whose
		// value it is (decision 16, third amendment).
		for (const attribute of borrowings) {
			const { owner, valueobject: vo } = attribute;
			const drawable = owner instanceof Entity || owner instanceof ValueObject;
			if (!vo || !drawable) continue;
			this.addEdge({
				source: this.addNode(relationNode(owner)),
				target: this.addNode(relationNode(vo, true)),
				relation: RelationType.Uses,
				label: attribute.name,
			});
		}
	}

	static fromGraph(graph: ODSRelationGraph) {
		return new ODSRelationMap(
			graph.relations,
			graph.identities,
			graph.subtypes,
			graph.borrowings,
		);
	}

	static fromWorkspace(workspace: Workspace) {
		return ODSRelationMap.fromGraph(ODSRelationGraph.fromWorkspace(workspace));
	}

	static fromDomain(domain: Domain) {
		return ODSRelationMap.fromGraph(ODSRelationGraph.fromDomain(domain));
	}

	static fromSubdomain(subdomain: Subdomain) {
		return ODSRelationMap.fromGraph(ODSRelationGraph.fromSubdomain(subdomain));
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		return ODSRelationMap.fromGraph(
			ODSRelationGraph.fromBoundedContext(boundedcontext),
		);
	}

	static fromAggregate(aggregate: Aggregate) {
		return ODSRelationMap.fromGraph(ODSRelationGraph.fromAggregate(aggregate));
	}
}

export type ODSRelationMapNamespace = ODSNamespace;

/** One row of a class diagram attribute compartment. */
export type ODSRelationMapAttribute = {
	name: string;
	type: string;
	identity: boolean;
	optional?: boolean;
	description?: string;
};

export type ODSRelationMapNode = {
	id: string;
	name: string;
	description?: string;
	namespace: ODSRelationMapNamespace[];
	type:
		| "entity_root"
		| "entity"
		| "valueobject"
		| "foreign_valueobject"
		| "external_context";
	/** Attributes drawn in the node's compartment; empty when none are declared. */
	attributes: ODSRelationMapAttribute[];
};

export type ODSRelationMapEdge = {
	source: ODSRelationMapNode;
	target: ODSRelationMapNode;
	/**
	 * The relation drawn; `identifies` for the identity an attribute holds of
	 * another entity or of an external system, the one dependency that may
	 * cross a context boundary;
	 * or `specialises` for a kind pointing at what it is a kind of.
	 */
	relation: EntityRelationType | "identifies" | "specialises";
	label: string;
	cardinality?: RelationCardinality;
};
