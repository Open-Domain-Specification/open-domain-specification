import type { Visitable } from "./visitable";
import type {
	Aggregate,
	BoundedContext,
	Consumable,
	Consumption,
	Domain,
	Entity,
	EntityRelation,
	Invariant,
	Service,
	Subdomain,
	ValueObject,
	Workspace,
} from "./workspace";

export interface Visitor {
	visitWorkspace(node: Workspace): void;
	visitDomain(node: Domain): void;
	visitSubdomain(node: Subdomain): void;
	visitBoundedContext(node: BoundedContext): void;
	visitService(node: Service): void;
	visitAggregate(node: Aggregate): void;
	visitConsumable(node: Consumable): void;
	visitInvariant(node: Invariant): void;
	visitEntity(node: Entity): void;
	visitValueObject(node: ValueObject): void;
	visitEntityRelation(node: EntityRelation): void;
	visitConsumption(node: Consumption): void;
}

export type AbstractVisitorOptions = {
	followRelations?: boolean;
	followConsumptions?: boolean;
};

export abstract class AbstractVisitor implements Visitor {
	protected readonly followRelations: boolean;
	protected readonly followConsumptions: boolean;

	/**
	 * Set to track seen nodes by their `ref` property.
	 * This prevents cycles in the traversal.
	 * @private
	 */
	private readonly seen = new Set<string>();

	protected constructor(opts?: AbstractVisitorOptions) {
		this.followRelations = !!opts?.followRelations;
		this.followConsumptions = !!opts?.followConsumptions;
	}

	/**
	 * Marks a node as seen to prevent cycles in the traversal.
	 * Returns true if the node was already seen, false if it was marked now.
	 * @param node - The node to mark, must have a `ref` property.
	 */
	protected mark(node: { ref?: string }): boolean {
		const key = node?.ref;
		if (!key) return false;
		if (this.seen.has(key)) return true;
		this.seen.add(key);
		return false;
	}

	/**
	 * Hook methods to be called before and after visiting a node.
	 * These can be overridden in subclasses to add custom behavior.
	 * @param _ - The node being visited, can be used for context.
	 */
	protected before(_: Visitable) {}
	protected after(_: Visitable) {}

	/**
	 * Visits a Workspace node and traverses its domains.
	 * @param node - The Workspace node to visit.
	 */
	visitWorkspace(node: Workspace): void {
		this.before(node);
		for (const domain of node.domains.values()) {
			domain.accept(this);
		}
		this.after(node);
	}

	/**
	 * Visits a Domain node and traverses its subdomains.
	 * @param node - The Domain node to visit.
	 */
	visitDomain(node: Domain): void {
		this.before(node);
		for (const subdomain of node.subdomains.values()) {
			subdomain.accept(this);
		}
		this.after(node);
	}

	/**
	 * Visits a Subdomain node and traverses its bounded contexts.
	 * @param node - The Subdomain node to visit.
	 */
	visitSubdomain(node: Subdomain): void {
		this.before(node);
		for (const bc of node.boundedcontexts.values()) {
			bc.accept(this);
		}
		this.after(node);
	}

	/**
	 * Visits a BoundedContext node and traverses its services and aggregates.
	 * @param node - The BoundedContext node to visit.
	 */
	visitBoundedContext(node: BoundedContext): void {
		this.before(node);

		for (const service of node.services.values()) {
			service.accept(this);
		}

		for (const aggregate of node.aggregates.values()) {
			aggregate.accept(this);
		}

		this.after(node);
	}

	/**
	 * Visits a Service node and traverses its consumables and consumptions.
	 * @param node - The Service node to visit.
	 */
	visitService(node: Service): void {
		this.before(node);
		for (const cons of node.consumables.values()) {
			cons.accept(this);
		}
		if (this.followConsumptions) {
			for (const cons of node.consumptions) cons.accept(this);
		}
		this.after(node);
	}

	/**
	 * Visits an Aggregate node and traverses its consumables, invariants, entities, value objects, and consumptions.
	 * @param node - The Aggregate node to visit.
	 */
	visitAggregate(node: Aggregate): void {
		this.before(node);
		for (const consumable of node.consumables.values()) {
			consumable.accept(this);
		}
		for (const invariant of node.invariants.values()) {
			invariant.accept(this);
		}
		for (const entity of node.entities.values()) {
			entity.accept(this);
		}
		for (const valueObject of node.valueobjects.values()) {
			valueObject.accept(this);
		}
		if (this.followConsumptions) {
			for (const cons of node.consumptions) cons.accept(this);
		}
		this.after(node);
	}

	/**
	 * Visits a Consumable node and optionally traverses its consumptions.
	 * @param node - The Consumable node to visit.
	 */
	visitConsumable(node: Consumable): void {
		this.before(node);
		// Staying within ownership; consumptions are cross-links handled by option
		this.after(node);
	}

	/**
	 * Visits an Invariant node.
	 * @param node - The Invariant node to visit.
	 */
	visitInvariant(node: Invariant): void {
		this.before(node);
		this.after(node);
	}

	/**
	 * Visits an Entity node and traverses its relations.
	 * @param node - The Entity node to visit.
	 */
	visitEntity(node: Entity): void {
		this.before(node);
		if (this.followRelations) {
			for (const rel of node.relations) rel.accept(this);
		}
		this.after(node);
	}

	/**
	 * Visits a ValueObject node and traverses its relations.
	 * @param node - The ValueObject node to visit.
	 */
	visitValueObject(node: ValueObject): void {
		this.before(node);
		if (this.followRelations) {
			for (const rel of node.relations) rel.accept(this);
		}
		this.after(node);
	}

	/**
	 * Visits an EntityRelation node and optionally follows the target.
	 * @param node - The EntityRelation node to visit.
	 */
	visitEntityRelation(node: EntityRelation): void {
		this.before(node);
		if (this.followRelations && !this.mark(node.target)) {
			node.target.accept(this);
		}
		this.after(node);
	}

	/**
	 * Visits a Consumption node and optionally follows the consumable and its provider.
	 * This is useful for traversing the consumption relationships in the model.
	 * @param node - The Consumption node to visit.
	 */
	visitConsumption(node: Consumption): void {
		this.before(node);
		if (this.followConsumptions && !this.mark(node.consumable)) {
			node.consumable.accept(this);
			if (!this.mark(node.consumable.provider)) {
				node.consumable.provider.accept(this);
			}
		}
		this.after(node);
	}
}
