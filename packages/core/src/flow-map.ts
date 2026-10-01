import { contextMemberNamespace, type ODSNamespace } from "./namespace";
import { ReactionChain, type Reactor, routesTo } from "./reaction-walk";
import { ScopeManager } from "./scope-manager";
import {
	TRIGGER_DISTINCTIONS,
	type TriggerDistinction,
	triggerReading,
} from "./trigger-readings";
import {
	Answer,
	BoundedContext,
	Deadline,
	Policy,
	Process,
	type ProcessTrigger,
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
 * An answer is drawn as one more edge into the reactor that was waiting,
 * carrying the name of the shape it came back as — or, where the operation
 * returns nothing and what was waited on is its bare completion, the word
 * "completes", which is the whole of what that call tells its caller. It gets
 * no node of its own: a returned or rejected shape is the operation coming
 * back, not something that happens on the way somewhere, and a reader
 * following the arrow wants the two things the call joined rather than a third
 * box between them.
 *
 * The edge starts at the call that asked for it: the local operation `by`
 * names, or the operation the reactor issues itself where there is no boundary
 * to cross (see `routesTo`). A reader sees the call leave on one arrow and the
 * answer arrive on the next, and two contexts calling one shared service each
 * see their own call come back rather than each other's (decision 23,
 * 2026-09-09 fourth amendment). Where the model does not say which local
 * operation calls, there is nothing to draw the answer from and the chain
 * stops there, which is the silence `consumption-by-required` warns about.
 *
 * A process's deadline is drawn the same way, as a loop from the process back
 * to the process labelled with how long the instance had and, where the
 * process anchors the clock, the trigger it counts from. It gets no node
 * either, and for a stronger reason: there is no provider it could hang under,
 * because a per-instance timer is the process's own and nobody else's fact
 * (decision 23, fourth and fifth amendments).
 *
 * That is also why a front need not restate what it calls raises: the map
 * already draws the front, the operation it calls and the event that
 * operation raises, so the fact is reached rather than declared twice
 * (`raises-restated`, card 77).
 */
export class ODSFlowMap {
	readonly nodes = new Map<string, ODSFlowMapNode>();
	readonly edges = new Map<string, ODSFlowMapEdge>();
	/** The edges between two steps that read the same, by that reading. */
	private readonly readings = new Map<string, ODSFlowMapEdge[]>();

	addNode(node: ODSFlowMapNode) {
		const existing = this.nodes.get(node.id);
		if (existing) return existing;
		this.nodes.set(node.id, node);
		return node;
	}

	/**
	 * Adds an edge unless the same step is already drawn. What an edge is, is
	 * its two ends, whether it completes the instance, and the answer or timer
	 * it carries ({@link flowEdgeId}); how it reads is a label and never
	 * decides that. Until the twenty-second review the label did, and a
	 * process waiting on one call's completion and ending on another's, both
	 * through one front, lost its ending edge: both read "completes" from the
	 * front (issue #108).
	 *
	 * Two different steps between the same two nodes can still read alike —
	 * two calls answering with one shape through one front, two limits of the
	 * same length from triggers of the same name — and a reader shown two
	 * identical arrows could not tell them apart. Those edges are told apart
	 * as far as it takes and no further (see {@link TriggerDistinction}).
	 */
	addEdge(edge: ODSFlowMapEdge) {
		const id = flowEdgeId(edge);
		const existing = this.edges.get(id);
		if (existing) return existing;
		this.edges.set(id, edge);
		const reading = keyOf([
			edge.source.id,
			edge.target.id,
			edge.kind ?? "step",
			flowEdgeLabel(edge) ?? "",
		]);
		const alike = [...(this.readings.get(reading) ?? []), edge];
		this.readings.set(reading, alike);
		if (alike.length > 1) {
			const distinguish = TRIGGER_DISTINCTIONS.find(
				(level) =>
					new Set(
						alike.map((it) => flowEdgeLabel({ ...it, distinguish: level })),
					).size === alike.length,
			);
			for (const it of alike) it.distinguish = distinguish;
		}
		return edge;
	}

	constructor(chain: ReactionChain) {
		const walked = new Set<Reactor>();
		for (const policy of chain.policies) {
			// Every policy in scope is drawn whether anything reaches it or not, and
			// the walk starts at what wakes it, so the flow reads from its cause.
			this.addNode(nodeFor(policy));
			for (const trigger of policy.events)
				this.enter(policy, trigger, chain, walked);
			// A policy nothing wakes still issues what it issues.
			this.walk(policy, chain, walked);
		}
		for (const process of chain.processes) {
			const node = this.addNode(nodeFor(process));
			for (const trigger of [...process.startEvents, ...process.events])
				this.enter(process, trigger, chain, walked);
			this.walk(process, chain, walked);
			// The lifecycle reads left to right: what starts an instance comes in
			// through the walk above, and what ends one goes out here. An ending
			// fact is not a step the process causes — it is what completes it — so
			// it is drawn and never walked from the process (decision 23), which is
			// what keeps the normal shape out of `reaction-cycle`.
			for (const ending of process.endEvents) {
				if (ending instanceof Deadline) {
					// Running out of time is the process's own doing, so the
					// edge starts and finishes at the process and says how long
					// the instance had.
					this.addEdge({
						source: node,
						target: node,
						kind: "ends",
						deadline: deadlineOf(ending),
					});
					continue;
				}
				if (ending instanceof Answer) {
					// An ending answer runs the other way: the call comes back into
					// the process and that is what completes the instance, so the
					// edge starts where a waited-on answer's does, at the call that
					// asked for it.
					for (const from of routesTo(process, ending.operation)) {
						this.addEdge({
							source: this.addNode(nodeFor(from)),
							target: node,
							kind: "ends",
							answer: answerOf(ending),
						});
						this.walk(from, chain, walked);
					}
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
	 * itself; an answer has no node, so the walk starts at the calls that asked
	 * for it and the answer is drawn as one of their steps.
	 */
	private enter(
		reactor: Policy | Process,
		trigger: ProcessTrigger,
		chain: ReactionChain,
		walked: Set<Reactor>,
	) {
		// A deadline has no node and nothing before it: the process is what
		// raises it, and the walk from the process draws the loop.
		if (trigger instanceof Deadline) return;
		if (!(trigger instanceof Answer)) {
			this.walk(trigger, chain, walked);
			return;
		}
		for (const from of routesTo(reactor, trigger.operation))
			this.walk(from, chain, walked);
	}

	/** Draws one step of the chain and everything it reaches, each edge once. */
	private walk(node: Reactor, chain: ReactionChain, walked: Set<Reactor>) {
		if (walked.has(node)) return;
		walked.add(node);
		const from = this.addNode(nodeFor(node));
		for (const { to, answer, deadline } of chain.stepsFrom(node)) {
			this.addEdge({
				source: from,
				target: this.addNode(nodeFor(to)),
				...(answer && { answer: answerOf(answer) }),
				...(deadline && { deadline: deadlineOf(deadline) }),
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
	/** The answer the edge carries, where an answer is what it is. */
	answer?: ODSFlowMapAnswer;
	/** The process's own timer, on the loop it draws from the process back to itself. */
	deadline?: ODSFlowMapDeadline;
	/**
	 * Set where another edge between the same two nodes would read the same:
	 * how far the label goes to tell them apart. Absent otherwise.
	 */
	distinguish?: TriggerDistinction;
};

/**
 * An answer on an edge: which answer it is, and how it reads.
 *
 * Which answer is the operation it comes back from, whether it returned,
 * refused or completed, the full ref of the shape and the refusal's reason.
 */
export type ODSFlowMapAnswer = {
	/** The operation the answer comes back from, by ref. */
	operation: string;
	outcome: "returns" | "rejects" | "completes";
	/** The shape it came back as, by ref; absent on a completion. */
	schema?: string;
	/** The enumerated outcome of a refusal, when it is one of them. */
	reason?: string;
	/** The answer's own ref. */
	ref: string;
	/** The shape it came back as, or "completes" (decision 23). */
	name: string;
	/** The answer by its origin: "Pay rejects with Payment Declined". */
	origin: string;
	/** The origin with the operation's context and provider and the shape's context. */
	context: string;
};

/** A process's own timer on its loop: which timer, and how it reads. */
export type ODSFlowMapDeadline = {
	/** The timer, by ref; its length and anchor are part of it. */
	ref: string;
	id: string;
	name: string;
	/** How long the instance waits. */
	after: string;
	/**
	 * What the clock counts from, where it is not the start of the instance:
	 * the trigger's name, its origin, and that with its context.
	 */
	from?: { name: string; origin: string; context: string };
};

function answerOf(answer: Answer): ODSFlowMapAnswer {
	return {
		operation: answer.operation.ref,
		outcome: answer.completion
			? "completes"
			: answer.rejection
				? "rejects"
				: "returns",
		...(answer.schema && { schema: answer.schema.ref }),
		...(answer.reason && { reason: answer.reason }),
		ref: answer.ref,
		name: answer.name,
		origin: triggerReading(answer, "origin"),
		context: triggerReading(answer, "context"),
	};
}

/** What a clock counts from, read the way every reader reads a trigger. */
function anchorOf(
	trigger: ProcessTrigger,
): NonNullable<ODSFlowMapDeadline["from"]> {
	return {
		name: trigger.name,
		origin: triggerReading(trigger, "origin"),
		context: triggerReading(trigger, "context"),
	};
}

function deadlineOf(deadline: Deadline): ODSFlowMapDeadline {
	return {
		ref: deadline.ref,
		id: deadline.id,
		name: deadline.name,
		after: deadline.after,
		...(deadline.from && { from: anchorOf(deadline.from) }),
	};
}

/**
 * What an edge is, as a key no two different steps share: its two ends,
 * `ends` where it completes the instance, and the answer or timer it carries,
 * each part escaped so none can pass for a separator. A plain step is its two
 * ends alone and a plain ending adds `ends`, so their keys read as they did;
 * a carried answer or timer always names its role and kind, so the number of
 * parts says what the key is.
 */
function flowEdgeId(edge: ODSFlowMapEdge): string {
	const { answer, deadline } = edge;
	const role = edge.kind ?? "step";
	const parts = [edge.source.id, edge.target.id];
	if (answer)
		parts.push(
			role,
			"answer",
			answer.operation,
			answer.outcome,
			answer.schema ?? "",
			answer.reason ?? "",
		);
	else if (deadline) parts.push(role, "deadline", deadline.ref);
	else if (edge.kind) parts.push(edge.kind);
	return keyOf(parts);
}

/** Parts joined by `|`, each with `%` and `|` escaped so none reads as a separator. */
function keyOf(parts: string[]): string {
	return parts
		.map((part) => part.replace(/%/g, "%25").replace(/\|/g, "%7C"))
		.join("|");
}

/**
 * What an edge is labelled with, so every renderer says the same thing: an
 * answer by the shape it came back as, a deadline by how long the instance had
 * and, where the process anchors the clock, what it counts from, what
 * completes a process as `ends`, and a plain step not at all. A dash
 * alone cannot say which of the things a dashed line means across these
 * diagrams a reader is looking at, and an unlabelled arrow into a process
 * could not say the call had come back. Where another edge between the same
 * nodes would read the same, the label goes as far as `distinguish` says.
 */
export function flowEdgeLabel(edge: ODSFlowMapEdge): string | undefined {
	const named = edge.answer
		? answerLabel(edge.answer, edge.distinguish)
		: edge.deadline && deadlineLabel(edge.deadline, edge.distinguish);
	if (named) return edge.kind === "ends" ? `${named} (ends)` : named;
	return edge.kind === "ends" ? "ends" : undefined;
}

function answerLabel(answer: ODSFlowMapAnswer, level?: TriggerDistinction) {
	if (level === "ref") return answer.ref;
	if (level === "context") return answer.context;
	return level === "origin" ? answer.origin : answer.name;
}

function deadlineLabel(
	deadline: ODSFlowMapDeadline,
	level?: TriggerDistinction,
) {
	if (level === "ref") return deadline.ref;
	const from = deadline.from;
	const anchor = !from
		? ""
		: ` from ${level === "context" ? from.context : level === "origin" ? from.origin : from.name}`;
	const waited = `after ${deadline.after}${anchor}`;
	if (level === "context")
		return `${deadline.name} (${deadline.id}): ${waited}`;
	return level === "origin" ? `${deadline.name}: ${waited}` : waited;
}
