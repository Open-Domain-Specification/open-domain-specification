import { contextMemberNamespace, type ODSNamespace } from "./namespace";
import { ReactionChain, type Reactor } from "./reaction-walk";
import { ScopeManager } from "./scope-manager";
import {
	Answer,
	BoundedContext,
	Policy,
	Process,
	type ReactionTrigger,
	type Workspace,
} from "./workspace";

/**
 * The reactive flow through a scope, walked from its policies and processes
 * along the causal chain `ReactionChain` defines: the event consumables a policy
 * reacts to, the operation consumables it issues, the events those raise,
 * the policies those wake, and — through a consumption whose `by` names the
 * operation — the operation called on the other side of a boundary, which is
 * where the chain used to stop. Consumables reached this way are included
 * even when they live in another context; operations no policy issues, and
 * nothing a policy issues reaches, are not.
 *
 * An answer is drawn as one more edge from the operation it names, carrying
 * the name of the shape it came back as. It gets no node of its own: a returned
 * or rejected shape is the operation coming back, not something that happens
 * on the way somewhere, and a reader following the arrow wants the two things
 * the call joined rather than a third box between them. The edge starts at
 * exactly the operation the reactor named, so two operations refusing with one
 * shared shape draw two edges and neither claims the other's caller
 * (decision 23).
 *
 * That is also why a front need not restate what it calls raises: the map
 * already draws the front, the operation it calls and the event that
 * operation raises, so the fact is reached rather than declared twice
 * (`raises-restated`, card 77).
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

	/**
	 * Adds an edge, keeping the first drawn between one pair. An answer is
	 * keyed by its shape as well as by its ends: a call answering the same
	 * reactor it already reached some other way is a second edge, and the
	 * reader is told which is which by the name on it.
	 */
	addEdge(edge: ODSFlowMapEdge) {
		const id = `${edge.source.id}|${edge.target.id}${edge.answer ? `|${edge.answer}` : ""}`;
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
			for (const trigger of policy.events) this.enter(trigger, chain, walked);
			// A policy nothing wakes still issues what it issues.
			this.walk(policy, chain, walked);
		}
		for (const process of chain.processes) {
			const node = this.addNode(nodeFor(process));
			for (const trigger of [...process.startEvents, ...process.events])
				this.enter(trigger, chain, walked);
			this.walk(process, chain, walked);
			// The lifecycle reads left to right: what starts an instance comes in
			// through the walk above, and what ends one goes out here. An ending
			// fact is not a step the process causes — it is what completes it — so
			// it is drawn and never walked from the process (decision 23), which is
			// what keeps the normal shape out of `reaction-cycle`.
			for (const ending of process.endEvents) {
				if (ending instanceof Answer) {
					// An ending answer runs the other way: the call comes back into
					// the process and that is what completes the instance, so the
					// edge starts at the operation the answer names.
					this.addEdge({
						source: this.addNode(nodeFor(ending.operation)),
						target: node,
						kind: "ends",
						answer: ending.name,
					});
					this.walk(ending.operation, chain, walked);
					continue;
				}
				this.addEdge({
					source: node,
					target: this.addNode(nodeFor(ending)),
					kind: "ends",
				});
				this.walk(ending, chain, walked);
			}
		}
	}

	/**
	 * Draws the chain from where a reaction is woken. An event is walked from
	 * itself; an answer has no node, so the walk starts at the operation the
	 * answer names and the answer is drawn as that operation's own step.
	 */
	private enter(
		trigger: ReactionTrigger,
		chain: ReactionChain,
		walked: Set<Reactor>,
	) {
		this.walk(
			trigger instanceof Answer ? trigger.operation : trigger,
			chain,
			walked,
		);
	}

	/** Draws one step of the chain and everything it reaches, each edge once. */
	private walk(node: Reactor, chain: ReactionChain, walked: Set<Reactor>) {
		if (walked.has(node)) return;
		walked.add(node);
		const from = this.addNode(nodeFor(node));
		for (const { to, answer } of chain.stepsFrom(node)) {
			this.addEdge({
				source: from,
				target: this.addNode(nodeFor(to)),
				...(answer && { answer: answer.name }),
			});
			this.walk(to, chain, walked);
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
 * How one step of the chain is drawn. A policy or a process sits directly
 * under its context; a consumable clusters under the provider that offers it,
 * which is how a step reached in another context reads as belonging over
 * there.
 */
function nodeFor(step: Reactor): ODSFlowMapNode {
	const shared = {
		id: step.ref,
		name: step.name,
		description: step.description,
	};
	if (step instanceof Policy || step instanceof Process)
		return {
			...shared,
			type: step instanceof Process ? "process" : "policy",
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
	type: "event" | "command" | "policy" | "process";
	namespace: ODSNamespace[];
};

export type ODSFlowMapEdge = {
	source: ODSFlowMapNode;
	target: ODSFlowMapNode;
	/**
	 * `ends` marks the edge that is not a step: it joins a process and the fact
	 * that completes an instance, which the process does not cause (decision
	 * 23). It runs from the process to that fact, or — where what completes it
	 * is an answer — from the operation that answers into the process, because
	 * that is the way the answer travels. Absent on every causal edge.
	 */
	kind?: "ends";
	/**
	 * The name of the shape an answer came back as, on an edge an answer
	 * carries: the operation returned or rejected with it and whoever was
	 * waiting woke. Absent on every other edge.
	 */
	answer?: string;
};

/**
 * What an edge is labelled with, so the three renderers say the same thing: an
 * answer by the shape it came back as, what completes a process as `ends`, and
 * a plain step not at all. A dash alone cannot say which of the things a
 * dashed line means across these diagrams a reader is looking at, and an
 * unlabelled arrow into a process could not say the call had come back.
 */
export function flowEdgeLabel(edge: ODSFlowMapEdge): string | undefined {
	if (edge.answer)
		return edge.kind === "ends" ? `${edge.answer} (ends)` : edge.answer;
	return edge.kind === "ends" ? "ends" : undefined;
}
