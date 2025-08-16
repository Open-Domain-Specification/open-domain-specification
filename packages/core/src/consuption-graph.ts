import { ScopeManager } from "./scope-manager";
import { AbstractVisitor } from "./visitor";
import type {
	Aggregate,
	BoundedContext,
	Consumable,
	Consumption,
	Domain,
	Service,
	Subdomain,
	Workspace,
} from "./workspace";

export class ODSConsumptionGraph extends AbstractVisitor {
	protected readonly _consumptions = new Set<Consumption>();

	protected readonly scopeManager: ScopeManager;

	get consumptions(): Consumption[] {
		return Array.from(this._consumptions.values());
	}

	constructor(scopeManager: ScopeManager) {
		super({ followConsumptions: true });
		this.scopeManager = scopeManager;
	}

	visitConsumption(consumption: Consumption) {
		this._consumptions.add(consumption);
		super.visitConsumption(consumption);
	}

	visitConsumable(node: Consumable) {
		for (const consumption of node.consumptions) {
			if (!this.scopeManager.isInScope(consumption.consumable.provider)) {
				continue;
			}
			this.visitConsumption(consumption);
		}
		super.visitConsumable(node);
	}

	static fromWorkspace(workspace: Workspace) {
		const odsConsumptionGraph = new ODSConsumptionGraph(
			ScopeManager.fromWorkspace(workspace),
		);
		odsConsumptionGraph.visitWorkspace(workspace);
		return odsConsumptionGraph;
	}

	static fromDomain(domain: Domain) {
		const odsConsumptionGraph = new ODSConsumptionGraph(
			ScopeManager.fromDomain(domain),
		);
		odsConsumptionGraph.visitDomain(domain);
		return odsConsumptionGraph;
	}

	static fromSubdomain(subdomain: Subdomain) {
		const odsConsumptionGraph = new ODSConsumptionGraph(
			ScopeManager.fromSubdomain(subdomain),
		);
		odsConsumptionGraph.visitSubdomain(subdomain);
		return odsConsumptionGraph;
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		const odsConsumptionGraph = new ODSConsumptionGraph(
			ScopeManager.fromBoundedContext(boundedcontext),
		);
		odsConsumptionGraph.visitBoundedContext(boundedcontext);
		return odsConsumptionGraph;
	}

	static fromAggregate(aggregate: Aggregate) {
		const odsConsumptionGraph = new ODSConsumptionGraph(
			ScopeManager.fromAggregate(aggregate),
		);
		odsConsumptionGraph.visitAggregate(aggregate);
		return odsConsumptionGraph;
	}

	static fromService(service: Service) {
		const odsConsumptionGraph = new ODSConsumptionGraph(
			ScopeManager.fromService(service),
		);
		odsConsumptionGraph.visitService(service);
		return odsConsumptionGraph;
	}
}
