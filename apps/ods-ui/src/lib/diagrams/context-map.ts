export class ContextMap {
	readonly boundedContexts: CMBoundedContext[] = [];
	readonly relationships: CMRelationship[] = [];
	readonly consumables: CMConsumable[] = [];

	addConsumable(
		id: string,
		name: string,
		pattern: string,
		namespace: string[],
		context: CMBoundedContext,
	): CMConsumable {
		const consumable = new CMConsumable(id, name, pattern, namespace, context);
		this.consumables.push(consumable);
		return consumable;
	}

	getConsumable(id: string): CMConsumable {
		const consumable = this.consumables.find((c) => c.id === id);
		if (!consumable) {
			console.log(this.consumables);
			throw new Error(`Consumable ${id} not found`);
		}
		return consumable;
	}

	addBoundedContext(
		id: string,
		name: string,
		namespace: string[],
	): CMBoundedContext {
		const context = new CMBoundedContext(id, name, namespace);
		this.boundedContexts.push(context);
		return context;
	}

	getBoundedContext(id: string): CMBoundedContext {
		const context = this.boundedContexts.find((ctx) => ctx.id === id);
		if (!context) {
			console.log(this.boundedContexts);
			throw new Error(`Bounded Context ${id} not found`);
		}
		return context;
	}

	addRelationship(
		source: CMBoundedContext,
		target: CMConsumable,
		type: string,
	): CMRelationship {
		const relationship = new CMRelationship(source, target, type);
		this.relationships.push(relationship);
		return relationship;
	}
}

export class CMBoundedContext {
	readonly id: string;
	readonly name: string;
	readonly namespace: string[];

	constructor(id: string, name: string, namespace: string[]) {
		this.id = id;
		this.name = name;
		this.namespace = namespace;
	}
}

export class CMRelationship {
	readonly source: CMBoundedContext;
	readonly target: CMConsumable;
	readonly type: string; // e.g., "Conformist", "Customer/Supplier", etc.

	constructor(source: CMBoundedContext, target: CMConsumable, type: string) {
		this.source = source;
		this.target = target;
		this.type = type;
	}
}

export class CMConsumable {
	readonly id: string;
	readonly name: string;
	readonly namespace: string[];
	readonly conext: CMBoundedContext;
	readonly pattern: string;

	constructor(
		id: string,
		name: string,
		pattern: string,
		namespace: string[],
		context: CMBoundedContext,
	) {
		this.id = id;
		this.name = name;
		this.pattern = pattern;
		this.conext = context;
		this.namespace = namespace;
	}
}
