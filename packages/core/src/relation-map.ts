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
	DataSchema,
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
	protected readonly _derivedUses = new Set<Attribute>();

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
	 * The attributes in scope whose line to their value object is derived from
	 * the attribute rather than from a declaration.
	 *
	 * An attribute typed by a value object is a dependency on that value, so
	 * the map draws it either way. The model may declare a `uses` relation,
	 * which adds a label and a cardinality to the same line and is drawn as
	 * itself; the line is derived only where no relation draws this attribute
	 * (decision 16, note of 2026-09-10; see {@link Attribute.drawnBy}). A value
	 * borrowed over a shared kernel or from an upstream this context conforms
	 * to is read the same way and drawn in the lending context's cluster
	 * (decision 16, third amendment); until card 126 no relation could reach
	 * one, so a borrowed value's line was always the derived one.
	 */
	get derivedUses(): Attribute[] {
		return Array.from(this._derivedUses.values());
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
		this.collectDerivedUses(entity);
		super.visitEntity(entity);
	}

	visitValueObject(valueobject: ValueObject) {
		this.collectIdentities(valueobject);
		this.collectSpecialisation(valueobject);
		this.collectDerivedUses(valueobject);
		super.visitValueObject(valueobject);
	}

	private collectIdentities(node: Entity | ValueObject) {
		for (const attribute of node.attributes.values())
			if (attribute.identifies) this._identities.add(attribute);
	}

	private collectSpecialisation(node: Entity | ValueObject) {
		if (node.specialises) this._subtypes.add(node);
	}

	private collectDerivedUses(node: Entity | ValueObject) {
		for (const attribute of node.attributes.values()) {
			const vo = attribute.valueobject;
			if (!vo) continue;
			// A declared relation draws the line with its label and cardinality,
			// wherever the value lives: a value borrowed over a shared kernel or
			// from a conformed-to upstream may carry one now, so a derived line
			// beside it would be the same dependency drawn twice (card 126).
			if (!attribute.drawnBy) this._derivedUses.add(attribute);
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
		derivedUses: Attribute[] = [],
	) {
		for (const relation of relations) {
			const sourceNode = this.addNode(relationNode(relation.source));
			// A `uses` relation may reach a value object of another context where
			// the borrowing is allowed (`cross-context-relation`, card 126). Its
			// box stands in the lending context's cluster and says whose value it
			// is, exactly as the derived line's does.
			const targetNode = this.addNode(
				relationNode(
					relation.target,
					relation.target.boundedcontext !== relation.source.boundedcontext,
				),
			);

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
			// (decision 28). An id named by one of that system's published
			// schemas lands there too — the box a reader can follow is the
			// system's, and which kind it is of is on the attribute's own page
			// (decision 28, third amendment; card 113).
			this.addEdge({
				source: this.addNode(relationNode(owner)),
				target: this.addNode(
					relationNode(
						target instanceof DataSchema ? target.boundedcontext : target,
					),
				),
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
		// An attribute typed by a value object no relation draws is a dependency
		// line of its own, named by the attribute that holds it: the model says
		// the holder has one, which is the whole of what the line says. A value
		// borrowed from another context is always drawn this way, since a
		// relation may not cross a boundary, and its box stands in the lending
		// context's cluster, which is where the reader sees whose value it is
		// (decision 16, third amendment and the note of 2026-09-10).
		for (const attribute of derivedUses) {
			const { owner, valueobject: vo } = attribute;
			const drawable = owner instanceof Entity || owner instanceof ValueObject;
			if (!vo || !drawable) continue;
			this.addEdge({
				source: this.addNode(relationNode(owner)),
				target: this.addNode(
					relationNode(vo, vo.boundedcontext !== owner.boundedcontext),
				),
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
			graph.derivedUses,
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
