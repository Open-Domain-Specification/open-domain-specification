import { AbstractVisitor } from "./visitor";
import type {
	Aggregate,
	BoundedContext,
	Domain,
	Service,
	Subdomain,
	Workspace,
} from "./workspace";

export type Scope =
	| Workspace
	| Domain
	| Subdomain
	| BoundedContext
	| Service
	| Aggregate;

export class ScopeManager extends AbstractVisitor {
	scopes: Scope[] = [];

	isInScope(scope: Scope): boolean {
		return this.scopes.includes(scope);
	}

	visitWorkspace(workspace: Workspace) {
		this.scopes.push(workspace);
		super.visitWorkspace(workspace);
	}

	visitDomain(domain: Domain) {
		this.scopes.push(domain);
		super.visitDomain(domain);
	}

	visitSubdomain(subdomain: Subdomain) {
		this.scopes.push(subdomain);
		super.visitSubdomain(subdomain);
	}

	visitBoundedContext(boundedcontext: BoundedContext) {
		this.scopes.push(boundedcontext);
		super.visitBoundedContext(boundedcontext);
	}

	visitService(service: Service) {
		this.scopes.push(service);
		super.visitService(service);
	}

	visitAggregate(aggregate: Aggregate) {
		this.scopes.push(aggregate);
		super.visitAggregate(aggregate);
	}

	static fromWorkspace(workspace: Workspace) {
		const collector = new ScopeManager();
		collector.visitWorkspace(workspace);
		return collector;
	}

	static fromDomain(domain: Domain) {
		const collector = new ScopeManager();
		collector.visitDomain(domain);
		return collector;
	}

	static fromSubdomain(subdomain: Subdomain) {
		const collector = new ScopeManager();
		collector.visitSubdomain(subdomain);
		return collector;
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		const collector = new ScopeManager();
		collector.visitBoundedContext(boundedcontext);
		return collector;
	}

	static fromService(service: Service) {
		const collector = new ScopeManager();
		collector.visitService(service);
		return collector;
	}

	static fromAggregate(aggregate: Aggregate) {
		const collector = new ScopeManager();
		collector.visitAggregate(aggregate);
		return collector;
	}
}
