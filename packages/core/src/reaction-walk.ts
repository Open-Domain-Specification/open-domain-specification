import {
	type BoundedContext,
	type Consumable,
	Policy,
	Process,
} from "./workspace";

/** A step in a reaction chain: an operation, an event, a policy or a process. */
export type Reactor = Consumable | Policy | Process;

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
	/** Which policies and processes each event wakes, for the contexts in scope. */
	private readonly listeners = new Map<Consumable, Array<Policy | Process>>();
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
				this.steps.push(...provider.consumables.values());
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

	/** Records that `reactor` wakes on each of `events`. */
	private listen(reactor: Policy | Process, events: Consumable[]) {
		for (const event of events) {
			const existing = this.listeners.get(event);
			if (existing) existing.push(reactor);
			else this.listeners.set(event, [reactor]);
		}
	}

	/** What the chain does next from one step. */
	after(node: Reactor): Reactor[] {
		if (node instanceof Policy || node instanceof Process) return node.commands;
		return [
			...node.raisedEvents,
			...this.consumedThrough(node),
			...(this.listeners.get(node) ?? []),
		];
	}

	/** The operations this one calls out to; see `callsOut`. */
	private consumedThrough(operation: Consumable): Consumable[] {
		return callsOut(operation);
	}
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
