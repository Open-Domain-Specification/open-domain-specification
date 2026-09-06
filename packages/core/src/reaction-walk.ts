import {
	Answer,
	type BoundedContext,
	Consumable,
	type Consumption,
	Deadline,
	Policy,
	Process,
	type ProcessTrigger,
} from "./workspace";

/** A step in a reaction chain: an operation, an event, a policy or a process. */
export type Reactor = Consumable | Policy | Process;

/**
 * One step of the chain: what happens next, and — when what carried it was an
 * operation answering its caller — the answer that step is named by.
 *
 * The answer is not a step of its own. A returned or rejected shape is not
 * something that happens on its way somewhere: it is the operation coming
 * back, so the step runs from the operation to whoever was waiting, and the
 * answer is what that step is called (decision 23, second amendment).
 */
export type ReactionStep = {
	/** The next step of the chain. */
	to: Reactor;
	/** The answer the step carries, when it is one. */
	answer?: Answer;
	/**
	 * The deadline the step carries, when it is one: a process's own timer
	 * falling, which runs from the process back to the process.
	 */
	deadline?: Deadline;
};

/**
 * The causal chain the model can follow, one step at a time.
 *
 * A policy issues its operations, an operation raises its events, and an
 * event wakes the policies listening for it. A process is walked the same
 * way: what wakes it is what starts an instance and what it waits for while
 * alive, and what it does is what it issues. What starts one may be a command
 * rather than an event, and the walk needs nothing new for it — the step runs
 * from that operation to the process exactly as it does from an event, because
 * both are consumables the process listens for (decision 23, third
 * amendment). What ends it takes no step —
 * an ending fact completes the instance rather than waking it again, which
 * is why a process that ends on an event its own operations raise is the
 * normal shape and no ring at all (decision 23). Those steps stay inside a
 * context, and on their own the chain dead-ends the moment a context acts on
 * another: under decision 17 a policy issues an operation of its own context,
 * and that operation calls out through a consumption.
 *
 * An operation also answers its caller, and that is the fifth step. When a
 * policy or a process waits on a schema an operation returns or rejects with,
 * or on the bare completion of one that returns nothing, the chain runs to the
 * reactor from the call it made: the call went out, the answer came back, and
 * what was waiting wakes. It is the same causal link `by` carries, read on the
 * way home rather than on the way out, and it is what lets a process say "I
 * called and branched on what came back" without inventing an event for a
 * non-event (decision 23, second amendment; decision 13, second amendment).
 * An answer returns to its caller and to nobody else, so the step runs from
 * the local operation that asked rather than from the operation that answered
 * (see {@link routesTo}); drawn the other way it woke every reactor of every
 * context that consumes the operation, and two contexts calling one shared
 * service read as a ring (decision 23, 2026-09-09 fourth amendment).
 *
 * So a consumption is the fourth step. When its `by` names an operation
 * (decision 21), the consumer is saying that operation is what makes the
 * exchange, which is the same as saying the operation's effect continues at
 * the consumed one. That is the one causal link the model has across a
 * boundary and it is read as one (decision 21's amendment), and where the
 * consumer provides exactly one operation the walk reads that operation as the
 * `by` the model did not make it write (see `callsOut`). Order and timing are
 * still not modelled: each step only says what happens next, never when.
 *
 * A process's deadline is the sixth step, and the only one that starts and
 * ends at the same node. The instance set the timer when it began waiting and
 * the timer fell, so the process wakes itself: there is no provider anywhere
 * to draw it from, because a per-instance limit is nobody else's fact
 * (decision 23, fourth amendment). The ring it closes runs through one process
 * and no other reactor, which is the lifecycle shape `reaction-cycle` already
 * exempts.
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
	 * contexts in scope. An answer is one object per operation and shape, so
	 * two operations refusing with the same schema are two different keys and
	 * wake only whoever named them (decision 23, third amendment).
	 */
	private readonly listeners = new Map<
		ProcessTrigger,
		Array<Policy | Process>
	>();
	/** Every policy in scope, in declaration order. */
	readonly policies: Policy[] = [];
	/** Every process in scope, in declaration order. */
	readonly processes: Process[] = [];
	/**
	 * Every step in scope: the consumables the contexts provide, then their
	 * policies and processes.
	 */
	readonly steps: Reactor[] = [];

	/**
	 * The answer steps, by the node each runs from: the local call the reactor
	 * made, so an answer comes back down the call that asked for it and no
	 * other (see {@link routesTo}). Keyed by a reactor rather than a call only
	 * where the model names the reactor itself as the caller, which
	 * `consumption-by-operation` refuses; the walk still has somewhere to draw
	 * it from, and the loop it makes is the process's own.
	 */
	private readonly answerSteps = new Map<Reactor, ReactionStep[]>();

	constructor(contexts: Iterable<BoundedContext>) {
		for (const bc of contexts) {
			for (const provider of [
				...bc.aggregates.values(),
				...bc.services.values(),
			])
				for (const consumable of provider.consumables.values())
					this.steps.push(consumable);
			for (const policy of bc.policies.values()) {
				this.policies.push(policy);
				this.steps.push(policy);
				this.listen(policy, policy.events);
			}
			for (const process of bc.processes.values()) {
				this.processes.push(process);
				this.steps.push(process);
				// A deadline needs no listener: it is the process's own, so the
				// step to whoever waits for it is the self-step `stepsFrom`
				// draws, and no other node can reach it.
				this.listen(process, [
					...process.startEvents,
					...process.events.filter((it) => !(it instanceof Deadline)),
				]);
			}
		}
		for (const [trigger, reactors] of this.listeners) {
			if (!(trigger instanceof Answer)) continue;
			for (const reactor of reactors)
				for (const from of routesTo(reactor, trigger.operation)) {
					const steps = this.answerSteps.get(from);
					const step: ReactionStep = { to: reactor, answer: trigger };
					if (steps) steps.push(step);
					else this.answerSteps.set(from, [step]);
				}
		}
	}

	/** Records that `reactor` wakes on each of `triggers`. */
	private listen(reactor: Policy | Process, triggers: ProcessTrigger[]) {
		for (const trigger of triggers) {
			const existing = this.listeners.get(trigger);
			if (existing) existing.push(reactor);
			else this.listeners.set(trigger, [reactor]);
		}
	}

	/** What the chain does next from one step, and what carries each step. */
	stepsFrom(node: Reactor): ReactionStep[] {
		const steps = this.ownSteps(node);
		// An answer wakes whoever was waiting for it, and the step is drawn from
		// the call that asked for it rather than from a node of its own: the
		// answer is what the step is called, not something that happens.
		steps.push(...(this.answerSteps.get(node) ?? []));
		return steps;
	}

	/** What a step does of itself, before the answers its calls bring back. */
	private ownSteps(node: Reactor): ReactionStep[] {
		if (node instanceof Policy) return node.commands.map((to) => ({ to }));
		if (node instanceof Process)
			return [
				...node.commands.map((to) => ({ to })),
				// A deadline the process waits on is a step it takes to itself:
				// the instance set the timer, the timer fell, and the same
				// process wakes. A deadline it ends on takes no step, for the
				// reason no ending fact does. The ring this closes is one
				// process and no other reactor, which `reaction-cycle` already
				// reads as a lifecycle rather than a loop.
				...node.events
					.filter((it): it is Deadline => it instanceof Deadline)
					.map((deadline): ReactionStep => ({ to: node, deadline })),
			];
		return [
			...node.raisedEvents,
			...this.consumedThrough(node),
			...(this.listeners.get(node) ?? []),
		].map((to) => ({ to }));
	}

	/** What the chain does next from one step. */
	after(node: Reactor): Reactor[] {
		return this.stepsFrom(node).map((step) => step.to);
	}

	/** The operations this one calls out to; see `callsOut`. */
	private consumedThrough(operation: Consumable): Consumable[] {
		return callsOut(operation);
	}
}

/** The consumptions of one operation declared inside one context. */
function callsTo(bc: BoundedContext, operation: Consumable): Consumption[] {
	const calls: Consumption[] = [];
	for (const member of [...bc.aggregates.values(), ...bc.services.values()])
		for (const consumption of member.consumptions)
			if (consumption.consumable === operation) calls.push(consumption);
	return calls;
}

/**
 * Whether a reactor may wait on an operation's answer: whether it made the
 * call.
 *
 * An answer is not published. It comes back down the call that asked for it,
 * to whoever asked, and to nobody else — which is what makes it different from
 * an event, and why decision 23 gave an answer a name of its own in the first
 * place. Read at the level of the context, as it was until card 100, it said
 * something weaker and false: every reactor of every context that consumes the
 * operation heard every answer, so two teams that each call one shared scorer
 * woke each other, and `reaction-cycle` reported a ring between contexts that
 * never trigger one another at all.
 *
 * Three ways a reactor is the caller, in the order they are asked:
 *
 * - It issues the operation itself. A process that calls a local validator and
 *   branches on the verdict made the call and declares no consumption of its
 *   own context, which is decision 23's fourth-from-last amendment (card 95).
 * - An operation it issues is named in `by` on a consumption of that
 *   operation, which is the ordinary cross-boundary shape: the reactor issues
 *   a local operation, that operation makes the call, and the answer comes
 *   back to it (decisions 17 and 21). `by` may also name the reactor itself
 *   where the consumption is of an event, which is not a call and has no
 *   answer, so the case costs nothing to allow.
 * - Nothing says who calls, and there is one call in this context to hear. A
 *   consumer providing a single operation is not made to write `by` down
 *   (`consumption-by-required`), and the walk reads the same inference here as
 *   it does in `callsOut`: only where there is nothing to choose between. The
 *   consumption has to be silent for the silence to be stood in for: a lone
 *   call that does name its caller has said who made it, and reading that one
 *   as "anybody here" let a second reactor beside the caller hear an answer
 *   the model had already given away (card 104).
 *
 * Where `by` is written and names somebody else, the answer is somebody
 * else's. That is the whole narrowing, and the repair for a model it catches
 * is to say which of the context's operations makes this call.
 */
export function hearsAnswerOf(
	reactor: Policy | Process,
	operation: Consumable,
): boolean {
	if (reactor.commands.includes(operation)) return true;
	const calls = callsTo(reactor.boundedcontext, operation);
	if (calls.some((call) => callersFor(reactor, call).length > 0)) return true;
	return calls.length === 1 && calls[0].by.length === 0;
}

/**
 * Which of a consumption's declared callers are this reactor's: an operation
 * the reactor issues, or the reactor itself.
 *
 * A reactor acts on another context through an operation of its own
 * (decision 17), so the ordinary caller is one of the operations it issues.
 * `by` may also name the reactor itself: on a subscription that is the
 * expected shape (`consumption-by-reactor`), and on a call it is a mistake
 * `consumption-by-operation` reports — but the model has still said who made
 * the call, so the walk reads it rather than dropping the answer on the floor.
 */
function callersFor(reactor: Policy | Process, call: Consumption): Reactor[] {
	return call.by.filter(
		(caller): caller is Reactor =>
			caller === reactor ||
			(caller instanceof Consumable && reactor.commands.includes(caller)),
	);
}

/**
 * The nodes an answer's step to one reactor runs from: the calls that asked
 * for it.
 *
 * `hearsAnswerOf` says whether a reactor may wait on an answer at all, which
 * is a question about one context. This says where the step is drawn from,
 * which is a question about one call, and the two differ for a reason the
 * two-caller probe made plain. Drawn from the answering operation, the step
 * said "whenever this operation answers anybody, every waiting reactor wakes":
 * two contexts calling one shared scorer each woke the other, and
 * `reaction-cycle` closed a ring through contexts that trigger nothing of each
 * other's. Drawn from the local operation that made the call, it says what is
 * true — the call went out from here and came back here — and a reader
 * following the chain sees the call leave on one edge and the answer arrive on
 * another.
 *
 * Only this reactor's own calls are routes. Every caller named on every
 * consumption of the operation was, until card 104, and one context is enough
 * for that to be wrong: two processes that each call one scorer through an
 * operation of their own were each drawn the other's verdict as well as their
 * own, on the flow map and in the ring `reaction-cycle` walks. A caller is
 * this reactor's when the reactor issues it, or when it is the reactor —
 * which the model should not say of a call and sometimes does (see
 * {@link callersFor}).
 *
 * Where the reactor issues the answering operation itself the two are the same
 * node, because there is no boundary and no local proxy for one (card 95).
 * Where nothing says who calls and the consumer provides a single operation,
 * that operation is the route, which is the inference `callsOut` already makes
 * on the way out; where it provides several, the model has not said, and the
 * chain stops rather than guessing — the same silence `consumption-by-required`
 * warns about. That inference is `hearsAnswerOf`'s third clause and is read
 * with it: a lone call that names its caller is not silent, so it is routed by
 * what it names or not at all.
 */
export function routesTo(
	reactor: Policy | Process,
	operation: Consumable,
): Reactor[] {
	if (reactor.commands.includes(operation)) return [operation];
	const calls = callsTo(reactor.boundedcontext, operation);
	const named = calls.flatMap((call) => callersFor(reactor, call));
	if (named.length > 0) return named;
	if (calls.length !== 1 || calls[0].by.length > 0) return [];
	const sole = [...calls[0].consumer.consumables.values()].filter(
		(it) => it.type === "operation",
	);
	return sole.length === 1 ? sole : [];
}

/**
 * The operations one operation calls out to: the consumptions its own
 * provider declares that name it in `by`. A consumption's `by` names
 * operations the consumer itself provides (`consumption-by-resolves`), so the
 * consumer is always this operation's provider and no index is needed — which
 * also means the step is found the same way however narrow the scope is.
 *
 * A consumer that provides exactly one operation is its own `by`. That is what
 * decision 21's third amendment says and what `consumption-by-required` acts
 * on, staying quiet rather than making such a consumer write down the only
 * answer there is; the walk did not read it that way, so the one place the
 * model let an author leave `by` off was the one place the chain dead-ended,
 * and RiverMart's single-operation front reached nothing (card 95). Inferred
 * only where there is nothing to choose between: two operations and an absent
 * `by` still stops here, which is the warning's whole point.
 */
function callsOut(operation: Consumable): Consumable[] {
	if (operation.type !== "operation") return [];
	const { provider } = operation;
	const soleCaller =
		[...provider.consumables.values()].filter((it) => it.type === "operation")
			.length === 1;
	return provider.consumptions
		.filter(
			(c) =>
				c.consumable.type === "operation" &&
				(c.by.includes(operation) || (soleCaller && c.by.length === 0)),
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
