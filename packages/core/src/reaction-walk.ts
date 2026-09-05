import {
	type BoundedContext,
	type Consumable,
	type DataSchema,
	Policy,
	Process,
	type ReactionTrigger,
} from "./workspace";

/** A step in a reaction chain: an operation, an event, a policy or a process. */
export type Reactor = Consumable | Policy | Process;

/**
 * One step of the chain: what happens next, and — when what carried it was an
 * operation answering its caller — the schema that answer is named by.
 *
 * The answer is not a step of its own. A returned or rejected shape is not
 * something that happens on its way somewhere: it is the operation coming
 * back, so the step runs from the operation to whoever was waiting, and the
 * schema is what that step is called (decision 23, second amendment).
 */
export type ReactionStep = {
	/** The next step of the chain. */
	to: Reactor;
	/** The shape the answer came back as, on a step an answer carries. */
	answer?: DataSchema;
};

/**
 * The causal chain the model can follow, one step at a time.
 *
 * A policy issues its operations, an operation raises its events, and an
 * event wakes the policies listening for it. A process is walked the same
 * way: what wakes it is what starts an instance and what it waits for while
 * alive, and what it does is what it issues. What ends it takes no step —
 * an ending fact completes the instance rather than waking it again, which
 * is why a process that ends on an event its own operations raise is the
 * normal shape and no ring at all (decision 23). Those steps stay inside a
 * context, and on their own the chain dead-ends the moment a context acts on
 * another: under decision 17 a policy issues an operation of its own context,
 * and that operation calls out through a consumption.
 *
 * An operation also answers its caller, and that is the fifth step. When a
 * policy or a process waits on a schema an operation returns or rejects with,
 * the chain runs from that operation to the reactor: the call went out, the
 * answer came back, and what was waiting wakes. It is the same causal link
 * `by` carries, read on the way home rather than on the way out, and it is
 * what lets a process say "I called and branched on what came back" without
 * inventing an event for a non-event (decision 23, second amendment).
 *
 * So a consumption is the fourth step. When its `by` names an operation
 * (decision 21), the consumer is saying that operation is what makes the
 * exchange, which is the same as saying the operation's effect continues at
 * the consumed one. That is the one causal link the model has across a
 * boundary and it is read as one (decision 21's amendment). Order and timing
 * are still not modelled: each step only says what happens next, never when.
 *
 * Two things deliberately take no step. A consumed event is a subscription,
 * not something the caller causes, so only consumed operations continue the
 * chain. And a policy named in a `by` adds nothing, because a policy already
 * reaches outward through the local operation its `then` names, which is the
 * shape decision 17 requires.
 *
 * The flow map draws these steps and `reaction-cycle` looks for rings in
 * them, so a chain a reader can see drawn is the same chain the rule walks.
 */
export class ReactionChain {
	/**
	 * Which policies and processes each event, and each answer, wakes for the
	 * contexts in scope.
	 */
	private readonly listeners = new Map<
		ReactionTrigger,
		Array<Policy | Process>
	>();
	/**
	 * Which operations answer with each schema: the ones the contexts in scope
	 * provide, and the ones they call. Both belong here because an answer comes
	 * back from wherever the call went, and a map drawn for one context has to
	 * show the neighbour's operation the answer came from.
	 */
	private readonly answerers = new Map<DataSchema, Consumable[]>();
	/** Every policy in scope, in declaration order. */
	readonly policies: Policy[] = [];
	/** Every process in scope, in declaration order. */
	readonly processes: Process[] = [];
	/**
	 * Every step in scope: the consumables the contexts provide, then their
	 * policies and processes.
	 */
	readonly steps: Reactor[] = [];

	constructor(contexts: Iterable<BoundedContext>) {
		for (const bc of contexts) {
			for (const provider of [
				...bc.aggregates.values(),
				...bc.services.values(),
			])
				for (const consumable of provider.consumables.values()) {
					this.steps.push(consumable);
					this.answers(consumable);
				}
			for (const called of operationsCalledBy(bc)) this.answers(called);
			for (const policy of bc.policies.values()) {
				this.policies.push(policy);
				this.steps.push(policy);
				this.listen(policy, policy.events);
			}
			for (const process of bc.processes.values()) {
				this.processes.push(process);
				this.steps.push(process);
				this.listen(process, [...process.startEvents, ...process.events]);
			}
		}
	}

	/** Records that `operation` answers with each of the shapes it names. */
	private answers(operation: Consumable) {
		for (const answer of answersOf(operation)) {
			const existing = this.answerers.get(answer);
			if (!existing) this.answerers.set(answer, [operation]);
			else if (!existing.includes(operation)) existing.push(operation);
		}
	}

	/** Records that `reactor` wakes on each of `triggers`. */
	private listen(reactor: Policy | Process, triggers: ReactionTrigger[]) {
		for (const trigger of triggers) {
			const existing = this.listeners.get(trigger);
			if (existing) existing.push(reactor);
			else this.listeners.set(trigger, [reactor]);
		}
	}

	/** What the chain does next from one step, and what carries each step. */
	stepsFrom(node: Reactor): ReactionStep[] {
		if (node instanceof Policy || node instanceof Process)
			return node.commands.map((to) => ({ to }));
		const steps: ReactionStep[] = [
			...node.raisedEvents,
			...this.consumedThrough(node),
			...(this.listeners.get(node) ?? []),
		].map((to) => ({ to }));
		// An answer wakes whoever was waiting for it, and the step is drawn from
		// the operation that answered rather than from a node of its own: the
		// shape is what the step is called, not something that happens.
		for (const answer of answersOf(node))
			for (const reactor of this.listeners.get(answer) ?? [])
				steps.push({ to: reactor, answer });
		return steps;
	}

	/** What the chain does next from one step. */
	after(node: Reactor): Reactor[] {
		return this.stepsFrom(node).map((step) => step.to);
	}

	/**
	 * The operations that answer with `schema` for the contexts in scope, in
	 * declaration order: what a reaction waiting on that answer is waiting for.
	 */
	answerersOf(schema: DataSchema): Consumable[] {
		return this.answerers.get(schema) ?? [];
	}

	/** The operations this one calls out to; see `callsOut`. */
	private consumedThrough(operation: Consumable): Consumable[] {
		return callsOut(operation);
	}
}

/**
 * The shapes an operation answers its caller with: what it returns, and what
 * it rejects with. Both are answers — one is the call succeeding and the other
 * the call refused — and a reaction may wait on either (decisions 13 and 25).
 */
export function answersOf(operation: Consumable): DataSchema[] {
	return operation.returns
		? [operation.returns, ...operation.rejects]
		: operation.rejects;
}

/**
 * Every operation one context calls: the operations its aggregates and
 * services consume, its own and its neighbours'. A context hears an answer by
 * having made the call, so this is where the answers it can wait on come from.
 */
export function* operationsCalledBy(bc: BoundedContext): Iterable<Consumable> {
	for (const member of [...bc.aggregates.values(), ...bc.services.values()])
		for (const { consumable } of member.consumptions)
			if (consumable.type === "operation") yield consumable;
}

/**
 * The operations `bc` calls that answer with `schema`: what a reaction waiting
 * on that answer is really waiting for, and what the surfaces name beside it so
 * a reader can see where the answer comes from.
 */
export function answeredBy(
	bc: BoundedContext,
	schema: DataSchema,
): Consumable[] {
	const answering: Consumable[] = [];
	for (const operation of operationsCalledBy(bc))
		if (answersOf(operation).includes(schema) && !answering.includes(operation))
			answering.push(operation);
	return answering;
}

/**
 * The operations one operation calls out to: the consumptions its own
 * provider declares that name it in `by`. A consumption's `by` names
 * operations the consumer itself provides (`consumption-by-resolves`), so the
 * consumer is always this operation's provider and no index is needed — which
 * also means the step is found the same way however narrow the scope is.
 */
function callsOut(operation: Consumable): Consumable[] {
	return operation.provider.consumptions
		.filter(
			(c) => c.consumable.type === "operation" && c.by.includes(operation),
		)
		.map((c) => c.consumable);
}

/**
 * The events an operation reaches without raising them: what the operations
 * it calls through a consumption's `by` raise, and what those in turn reach,
 * following the same causal link the flow map draws and `reaction-cycle`
 * walks (decision 21's amendment).
 *
 * This is what lets a front stop restating. An open-host operation that runs
 * an aggregate's transition need not copy that transition's `raises`: the
 * chain already carries the fact, and a copy can only drift from what the
 * aggregate actually raises (`raises-restated`). The surfaces use this to say
 * so in words — the events are reached, not declared — so a reader following
 * the front is never left thinking nothing happens.
 *
 * A chain of calls is followed to its end and each operation is visited once,
 * so a ring of calls terminates rather than looping.
 */
export function reachedEvents(operation: Consumable): Consumable[] {
	const seen = new Set<Consumable>([operation]);
	const events: Consumable[] = [];
	const queue = callsOut(operation);
	while (queue.length) {
		const called = queue.shift();
		if (!called || seen.has(called)) continue;
		seen.add(called);
		for (const event of called.raisedEvents)
			if (!events.includes(event)) events.push(event);
		queue.push(...callsOut(called));
	}
	return events;
}
