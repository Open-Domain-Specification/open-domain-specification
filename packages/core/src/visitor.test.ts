import { describe, expect, it, vi } from "vitest";
import { makeTestWs } from "./makeTestWs";
import {
	AbstractVisitor,
	type AbstractVisitorOptions,
	type Visitor,
} from "./visitor"; // your final impl path
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
	Workspace,
} from "./workspace";

class TestVisitor extends AbstractVisitor implements Visitor {
	visitedWorkspace = vi.fn();
	visitedDomain = vi.fn();
	visitedSubdomain = vi.fn();
	visitedBoundedContext = vi.fn();
	visitedService = vi.fn();
	visitedAggregate = vi.fn();
	visitedEntity = vi.fn();
	visitedValueObject = vi.fn();
	visitedRelation = vi.fn();
	visitedConsumption = vi.fn();
	visitedConsumable = vi.fn();
	visitedInvariant = vi.fn();

	constructor(props: AbstractVisitorOptions) {
		super(props);
	}

	// We only need to bump counts—default traversal comes from AbstractVisitor
	visitWorkspace(n: Workspace): void {
		this.visitedWorkspace(n);
		super.visitWorkspace(n);
	}
	visitDomain(n: Domain): void {
		this.visitedDomain(n);
		super.visitDomain(n);
	}
	visitSubdomain(n: Subdomain): void {
		this.visitedSubdomain(n);
		super.visitSubdomain(n);
	}
	visitBoundedContext(n: BoundedContext): void {
		this.visitedBoundedContext(n);
		super.visitBoundedContext(n);
	}
	visitService(n: Service): void {
		this.visitedService(n);
		super.visitService(n);
	}
	visitAggregate(n: Aggregate): void {
		this.visitedAggregate(n);
		super.visitAggregate(n);
	}
	visitEntity(node: Entity) {
		this.visitedEntity(node);
		super.visitEntity(node);
	}
	visitValueObject(node: Entity) {
		this.visitedValueObject(node);
		super.visitValueObject(node);
	}
	visitConsumable(node: Consumable) {
		this.visitedConsumable(node);
		super.visitConsumable(node);
	}
	visitEntityRelation(node: EntityRelation) {
		this.visitedRelation(node);
		super.visitEntityRelation(node);
	}
	visitConsumption(node: Consumption) {
		this.visitedConsumption(node);
		super.visitConsumption(node);
	}
	visitInvariant(node: Invariant) {
		this.visitedInvariant(node);
		super.visitInvariant(node);
	}
}

describe("Visitor", () => {
	it("should visit all nodes once when not visiting consumptions or relations", () => {
		const {
			ws,
			d1,
			d1Sd1,
			d1Sd1Bc1,
			d1Sd1Bc1S1,
			d1Sd1Bc1Ag1,
			d1Sd1Bc1S1Ag1E1,
			d1Sd1Bc1Ag1Vo1,
			d2,
			d2Sd1,
			d2Sd1Bc1,
			d2Sd1Bc1S1,
			d2Sd1Bc1S1Ag1,
			d2Sd1Bc1S1Ag1E1,
			d2Sd1Bc1S1Ag1Vo1,
			d1Sd1Bc1Ag1I1,
		} = makeTestWs();
		const visitor = new TestVisitor({});
		visitor.visitWorkspace(ws);
		expect(visitor.visitedWorkspace).toHaveBeenCalledWith(ws);

		expect(visitor.visitedDomain).toHaveBeenCalledWith(d1);
		expect(visitor.visitedSubdomain).toHaveBeenCalledWith(d1Sd1);
		expect(visitor.visitedBoundedContext).toHaveBeenCalledWith(d1Sd1Bc1);
		expect(visitor.visitedService).toHaveBeenCalledWith(d1Sd1Bc1S1);
		expect(visitor.visitedAggregate).toHaveBeenCalledWith(d1Sd1Bc1Ag1);
		expect(visitor.visitedEntity).toHaveBeenCalledWith(d1Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).toHaveBeenCalledWith(d1Sd1Bc1Ag1Vo1);
		expect(visitor.visitedInvariant).toHaveBeenCalledWith(d1Sd1Bc1Ag1I1);

		expect(visitor.visitedDomain).toHaveBeenCalledWith(d2);
		expect(visitor.visitedSubdomain).toHaveBeenCalledWith(d2Sd1);
		expect(visitor.visitedBoundedContext).toHaveBeenCalledWith(d2Sd1Bc1);
		expect(visitor.visitedService).toHaveBeenCalledWith(d2Sd1Bc1S1);
		expect(visitor.visitedAggregate).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1);
		expect(visitor.visitedEntity).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1Vo1);
	});

	it("should visit all child nodes when visiting a workspace and not visiting relations or consumptions", () => {
		const {
			ws,
			d1,
			d1Sd1,
			d1Sd1Bc1,
			d1Sd1Bc1S1,
			d1Sd1Bc1S1C1,
			d1Sd1Bc1Ag1,
			d1Sd1Bc1S1Ag1E1,
			d1Sd1Bc1Ag1Vo1,
			d1Sd1Bc1Ag1I1,
			d2,
			d2Sd1,
			d2Sd1Bc1,
			d2Sd1Bc1S1,
			d2Sd1Bc1S1Co1,
			d2Sd1Bc1S1Ag1,
			d2Sd1Bc1S1Ag1E1,
			d2Sd1Bc1S1Ag1Vo1,
		} = makeTestWs();
		const visitor = new TestVisitor({});
		visitor.visitDomain(d1);

		expect(visitor.visitedWorkspace).not.toHaveBeenCalledWith(ws);

		expect(visitor.visitedDomain).toHaveBeenCalledWith(d1);
		expect(visitor.visitedSubdomain).toHaveBeenCalledWith(d1Sd1);
		expect(visitor.visitedBoundedContext).toHaveBeenCalledWith(d1Sd1Bc1);
		expect(visitor.visitedService).toHaveBeenCalledWith(d1Sd1Bc1S1);
		expect(visitor.visitedConsumable).toHaveBeenCalledWith(d1Sd1Bc1S1C1);
		expect(visitor.visitedAggregate).toHaveBeenCalledWith(d1Sd1Bc1Ag1);
		expect(visitor.visitedEntity).toHaveBeenCalledWith(d1Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).toHaveBeenCalledWith(d1Sd1Bc1Ag1Vo1);
		expect(visitor.visitedInvariant).toHaveBeenCalledWith(d1Sd1Bc1Ag1I1);

		expect(visitor.visitedDomain).not.toHaveBeenCalledWith(d2);
		expect(visitor.visitedSubdomain).not.toHaveBeenCalledWith(d2Sd1);
		expect(visitor.visitedBoundedContext).not.toHaveBeenCalledWith(d2Sd1Bc1);
		expect(visitor.visitedService).not.toHaveBeenCalledWith(d2Sd1Bc1S1);
		expect(visitor.visitedConsumption).not.toHaveBeenCalledWith(d2Sd1Bc1S1Co1);
		expect(visitor.visitedAggregate).not.toHaveBeenCalledWith(d2Sd1Bc1S1Ag1);
		expect(visitor.visitedEntity).not.toHaveBeenCalledWith(d2Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).not.toHaveBeenCalledWith(
			d2Sd1Bc1S1Ag1Vo1,
		);
	});

	it("should visit all domain child nodes when visiting domain 1 and not follow consumptions or relations", () => {
		const {
			ws,
			d1,
			d1Sd1,
			d1Sd1Bc1,
			d1Sd1Bc1S1,
			d1Sd1Bc1S1C1,
			d1Sd1Bc1Ag1,
			d1Sd1Bc1S1Ag1E1,
			d1Sd1Bc1Ag1Vo1,
			d1Sd1Bc1Ag1I1,
			d2,
			d2Sd1,
			d2Sd1Bc1,
			d2Sd1Bc1S1,
			d2Sd1Bc1S1Co1,
			d2Sd1Bc1S1Ag1,
			d2Sd1Bc1S1Ag1E1,
			d2Sd1Bc1S1Ag1Vo1,
		} = makeTestWs();

		const visitor = new TestVisitor({});
		visitor.visitDomain(d1);

		expect(visitor.visitedWorkspace).not.toHaveBeenCalledWith(ws);

		expect(visitor.visitedDomain).toHaveBeenCalledWith(d1);
		expect(visitor.visitedSubdomain).toHaveBeenCalledWith(d1Sd1);
		expect(visitor.visitedBoundedContext).toHaveBeenCalledWith(d1Sd1Bc1);
		expect(visitor.visitedService).toHaveBeenCalledWith(d1Sd1Bc1S1);
		expect(visitor.visitedConsumable).toHaveBeenCalledWith(d1Sd1Bc1S1C1);
		expect(visitor.visitedAggregate).toHaveBeenCalledWith(d1Sd1Bc1Ag1);
		expect(visitor.visitedEntity).toHaveBeenCalledWith(d1Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).toHaveBeenCalledWith(d1Sd1Bc1Ag1Vo1);
		expect(visitor.visitedInvariant).toHaveBeenCalledWith(d1Sd1Bc1Ag1I1);

		expect(visitor.visitedDomain).not.toHaveBeenCalledWith(d2);
		expect(visitor.visitedSubdomain).not.toHaveBeenCalledWith(d2Sd1);
		expect(visitor.visitedBoundedContext).not.toHaveBeenCalledWith(d2Sd1Bc1);
		expect(visitor.visitedService).not.toHaveBeenCalledWith(d2Sd1Bc1S1);
		expect(visitor.visitedConsumption).not.toHaveBeenCalledWith(d2Sd1Bc1S1Co1);
		expect(visitor.visitedAggregate).not.toHaveBeenCalledWith(d2Sd1Bc1S1Ag1);
		expect(visitor.visitedEntity).not.toHaveBeenCalledWith(d2Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).not.toHaveBeenCalledWith(
			d2Sd1Bc1S1Ag1Vo1,
		);
	});

	it("should visit all domain child nodes when visiting domain 2 and not follow consumptions or relations", () => {
		const {
			ws,
			d1,
			d1Sd1,
			d1Sd1Bc1,
			d1Sd1Bc1S1,
			d1Sd1Bc1S1C1,
			d1Sd1Bc1Ag1,
			d1Sd1Bc1S1Ag1E1,
			d1Sd1Bc1Ag1Vo1,
			d1Sd1Bc1Ag1I1,
			d2,
			d2Sd1,
			d2Sd1Bc1,
			d2Sd1Bc1S1,
			d2Sd1Bc1S1Co1,
			d2Sd1Bc1S1Ag1,
			d2Sd1Bc1S1Ag1E1,
			d2Sd1Bc1S1Ag1Vo1,
		} = makeTestWs();

		const visitor = new TestVisitor({});
		visitor.visitDomain(d2);

		expect(visitor.visitedWorkspace).not.toHaveBeenCalledWith(ws);

		expect(visitor.visitedDomain).not.toHaveBeenCalledWith(d1);
		expect(visitor.visitedSubdomain).not.toHaveBeenCalledWith(d1Sd1);
		expect(visitor.visitedBoundedContext).not.toHaveBeenCalledWith(d1Sd1Bc1);
		expect(visitor.visitedService).not.toHaveBeenCalledWith(d1Sd1Bc1S1);
		expect(visitor.visitedConsumable).not.toHaveBeenCalledWith(d1Sd1Bc1S1C1);
		expect(visitor.visitedAggregate).not.toHaveBeenCalledWith(d1Sd1Bc1Ag1);
		expect(visitor.visitedEntity).not.toHaveBeenCalledWith(d1Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).not.toHaveBeenCalledWith(d1Sd1Bc1Ag1Vo1);
		expect(visitor.visitedInvariant).not.toHaveBeenCalledWith(d1Sd1Bc1Ag1I1);

		expect(visitor.visitedDomain).toHaveBeenCalledWith(d2);
		expect(visitor.visitedSubdomain).toHaveBeenCalledWith(d2Sd1);
		expect(visitor.visitedBoundedContext).toHaveBeenCalledWith(d2Sd1Bc1);
		expect(visitor.visitedService).toHaveBeenCalledWith(d2Sd1Bc1S1);
		expect(visitor.visitedConsumption).not.toHaveBeenCalledWith(d2Sd1Bc1S1Co1);
		expect(visitor.visitedAggregate).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1);
		expect(visitor.visitedEntity).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1Vo1);
	});

	it("should visit all domain child nodes when visiting domain 2 and follow consumptions", () => {
		const {
			ws,
			d1,
			d1Sd1,
			d1Sd1Bc1,
			d1Sd1Bc1S1,
			d1Sd1Bc1S1C1,
			d1Sd1Bc1Ag1,
			d1Sd1Bc1S1Ag1E1,
			d1Sd1Bc1Ag1Vo1,
			d1Sd1Bc1Ag1I1,
			d2,
			d2Sd1,
			d2Sd1Bc1,
			d2Sd1Bc1S1,
			d2Sd1Bc1S1Co1,
			d2Sd1Bc1S1Ag1,
			d2Sd1Bc1S1Ag1E1,
			d2Sd1Bc1S1Ag1Vo1,
		} = makeTestWs();

		const visitor = new TestVisitor({ followConsumptions: true });
		visitor.visitDomain(d2);

		expect(visitor.visitedWorkspace).not.toHaveBeenCalledWith(ws);

		expect(visitor.visitedDomain).not.toHaveBeenCalledWith(d1);
		expect(visitor.visitedSubdomain).not.toHaveBeenCalledWith(d1Sd1);
		expect(visitor.visitedBoundedContext).not.toHaveBeenCalledWith(d1Sd1Bc1);
		expect(visitor.visitedService).toHaveBeenCalledWith(d1Sd1Bc1S1);
		expect(visitor.visitedConsumable).toHaveBeenCalledWith(d1Sd1Bc1S1C1);
		expect(visitor.visitedAggregate).not.toHaveBeenCalledWith(d1Sd1Bc1Ag1);
		expect(visitor.visitedEntity).not.toHaveBeenCalledWith(d1Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).not.toHaveBeenCalledWith(d1Sd1Bc1Ag1Vo1);
		expect(visitor.visitedInvariant).not.toHaveBeenCalledWith(d1Sd1Bc1Ag1I1);

		expect(visitor.visitedDomain).toHaveBeenCalledWith(d2);
		expect(visitor.visitedSubdomain).toHaveBeenCalledWith(d2Sd1);
		expect(visitor.visitedBoundedContext).toHaveBeenCalledWith(d2Sd1Bc1);
		expect(visitor.visitedService).toHaveBeenCalledWith(d2Sd1Bc1S1);
		expect(visitor.visitedConsumption).toHaveBeenCalledWith(d2Sd1Bc1S1Co1);
		expect(visitor.visitedAggregate).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1);
		expect(visitor.visitedEntity).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1E1);
		expect(visitor.visitedValueObject).toHaveBeenCalledWith(d2Sd1Bc1S1Ag1Vo1);
	});
});
