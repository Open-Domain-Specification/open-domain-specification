import { contextMemberNamespace, type ODSNamespace } from "./namespace";
import { ReactionChain, type Reactor } from "./reaction-walk";
import { ScopeManager } from "./scope-manager";
import { BoundedContext, Policy, type Workspace } from "./workspace";

/**
 * The reactive flow through a scope, walked from its policies along the
 * causal chain `ReactionChain` defines: the event consumables a policy
 * reacts to, the operation consumables it issues, the events those raise,
 * the policies those wake, and — through a consumption whose `by` names the
 * operation — the operation called on the other side of a boundary, which is
 * where the chain used to stop. Consumables reached this way are included
 * even when they live in another context; operations no policy issues, and
 * nothing a policy issues reaches, are not.
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

	constructor(chain: ReactionChain) {
		const walked = new Set<Reactor>();
		for (const policy of chain.policies) {
			// Every policy in scope is drawn whether anything reaches it or not, and
			// the walk starts at what wakes it, so the flow reads from its cause.
			this.addNode(nodeFor(policy));
			for (const event of policy.events) this.walk(event, chain, walked);
			// A policy nothing wakes still issues what it issues.
			this.walk(policy, chain, walked);
		}
	}

	/** Draws one step of the chain and everything it reaches, each edge once. */
	private walk(node: Reactor, chain: ReactionChain, walked: Set<Reactor>) {
		if (walked.has(node)) return;
		walked.add(node);
		const from = this.addNode(nodeFor(node));
		for (const next of chain.after(node)) {
			this.addEdge({ source: from, target: this.addNode(nodeFor(next)) });
			this.walk(next, chain, walked);
		}
	}

	private static fromScope(scope: ScopeManager) {
		const contexts = scope.scopes.filter(
			(it): it is BoundedContext => it instanceof BoundedContext,
		);
		return new ODSFlowMap(new ReactionChain(contexts));
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

/**
 * How one step of the chain is drawn. A policy sits directly under its
 * context; a consumable clusters under the provider that offers it, which is
 * how a step reached in another context reads as belonging over there.
 */
function nodeFor(step: Reactor): ODSFlowMapNode {
	const shared = {
		id: step.ref,
		name: step.name,
		description: step.description,
	};
	if (step instanceof Policy)
		return {
			...shared,
			type: "policy",
			namespace: contextMemberNamespace(step),
		};
	const provider = step.provider;
	return {
		...shared,
		type: step.type === "event" ? "event" : "command",
		namespace: [
			...contextMemberNamespace(provider),
			{ id: provider.ref, name: provider.name },
		],
	};
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
