import {
	aggregateNamespace,
	contextMemberNamespace,
	type ODSNamespace,
} from "./namespace";
import { ScopeManager } from "./scope-manager";
import {
	BoundedContext,
	type Command,
	type DomainEvent,
	type Policy,
	type Workspace,
} from "./workspace";

/**
 * The reactive flow through a scope, walked from its policies: the events a
 * policy reacts to, the commands it issues, and the events those commands
 * raise. Elements reached this way are included even when they live in
 * another context; commands no policy issues are not.
 */
export class ODSFlowMap {
	readonly nodes = new Map<string, ODSFlowMapNode>();
	readonly edges = new Map<string, ODSFlowMapEdge>();

	addNode(node: ODSFlowMapNode) {
		const existing = this.nodes.get(node.id);
		if (existing) return existing;
		this.nodes.set(node.id, node);
		return node;
	}

	addEdge(edge: ODSFlowMapEdge) {
		const id = `${edge.source.id}|${edge.target.id}`;
		const existing = this.edges.get(id);
		if (existing) return existing;
		this.edges.set(id, edge);
		return edge;
	}

	constructor(policies: Policy[]) {
		for (const policy of policies) {
			const policyNode = this.addNode({
				id: policy.ref,
				name: policy.name,
				description: policy.description,
				type: "policy",
				namespace: contextMemberNamespace(policy),
			});
			for (const event of policy.events) {
				this.addEdge({ source: this.addEvent(event), target: policyNode });
			}
			for (const command of policy.commands) {
				this.addEdge({ source: policyNode, target: this.addCommand(command) });
			}
		}
	}

	private addEvent(event: DomainEvent): ODSFlowMapNode {
		return this.addNode({
			id: event.ref,
			name: event.name,
			description: event.description,
			type: "event",
			namespace: aggregateNamespace(event.aggregate),
		});
	}

	private addCommand(command: Command): ODSFlowMapNode {
		const node = this.addNode({
			id: command.ref,
			name: command.name,
			description: command.description,
			type: "command",
			namespace: aggregateNamespace(command.aggregate),
		});
		for (const event of command.raisedEvents) {
			this.addEdge({ source: node, target: this.addEvent(event) });
		}
		return node;
	}

	private static fromScope(scope: ScopeManager) {
		const contexts = scope.scopes.filter(
			(it): it is BoundedContext => it instanceof BoundedContext,
		);
		const policies = contexts.flatMap((bc) => Array.from(bc.policies.values()));
		return new ODSFlowMap(policies);
	}

	static fromWorkspace(workspace: Workspace) {
		return ODSFlowMap.fromScope(ScopeManager.fromWorkspace(workspace));
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		return ODSFlowMap.fromScope(
			ScopeManager.fromBoundedContext(boundedcontext),
		);
	}
}

export type ODSFlowMapNode = {
	id: string;
	name: string;
	description?: string;
	type: "event" | "command" | "policy";
	namespace: ODSNamespace[];
};

export type ODSFlowMapEdge = {
	source: ODSFlowMapNode;
	target: ODSFlowMapNode;
};
