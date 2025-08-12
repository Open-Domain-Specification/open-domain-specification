import type { EntityRelationType } from "open-domain-schema";

export class ERDEntity<ENTITY_PROPS> {
	readonly id: string;
	readonly name: string;
	readonly props: ENTITY_PROPS;

	constructor(id: string, name: string, props: ENTITY_PROPS) {
		this.id = id;
		this.name = name;
		this.props = props;
	}
}

export class ERDRelation<ENTITY_PROPS, RELATION_PROPS> {
	readonly source: ERDEntity<ENTITY_PROPS>;
	readonly target: ERDEntity<ENTITY_PROPS>;
	readonly relation: EntityRelationType;
	readonly label: string;
	readonly props: RELATION_PROPS;

	constructor(
		source: ERDEntity<ENTITY_PROPS>,
		target: ERDEntity<ENTITY_PROPS>,
		relation: EntityRelationType,
		label: string,
		props: RELATION_PROPS,
	) {
		this.source = source;
		this.target = target;
		this.relation = relation;
		this.label = label;
		this.props = props;
	}
}

export class ERD<
	ENTITY_PROPS = Record<string, unknown>,
	RELATION_PROPS = Record<string, unknown>,
> {
	readonly entities: ERDEntity<ENTITY_PROPS>[] = [];
	readonly relations: ERDRelation<ENTITY_PROPS, RELATION_PROPS>[] = [];

	addEntity(
		id: string,
		name: string,
		props: ENTITY_PROPS,
	): ERDEntity<ENTITY_PROPS> {
		const entity = new ERDEntity(id, name, props);
		this.entities.push(entity);
		return entity;
	}

	getEntity(id: string): ERDEntity<ENTITY_PROPS> {
		const entity = this.entities.find((entity) => entity.id === id);

		if (!entity) {
			console.log(this.relations);
			console.log(this.entities);
			throw new Error(`Entity ${id} not found`);
		}

		return entity;
	}

	getEntityIds(): string[] {
		return this.entities.map((entity) => entity.id);
	}

	addRelation(
		source: ERDEntity<ENTITY_PROPS>,
		target: ERDEntity<ENTITY_PROPS>,
		relation: EntityRelationType,
		label: string,
		props: RELATION_PROPS,
	): ERDRelation<ENTITY_PROPS, RELATION_PROPS> {
		const rel = new ERDRelation(source, target, relation, label, props);
		this.relations.push(rel);
		return rel;
	}
}
