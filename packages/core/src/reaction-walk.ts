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
 * policy or a process waits on a schema an operation returns or rejects with —
 * or on one enumerated outcome of that refusal, which is a refusal of the same
 * call said more precisely (decision 25, amended) — or on the bare completion
 * of one that returns nothing, the chain runs to the reactor from the call it
 * made: the call went out, the answer came back, and
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
 * - An operation it issues reaches the call along this context's `by` chain,
 *   through any number of local fronts (see {@link callChainReaches}). A saga
 *   that issues the use-case operation, which calls the payments adapter,
 *   which calls the provider, made that call as surely as if it had made it
 *   in one hop, and the events coming back up the same chain were always read
 *   that way (decision 21, amendment of 2026-09-10; card 126). A silent
 *   consumption whose consumer provides exactly one operation is a hop of that
 *   chain like any other: `callsOut` reads such a consumer as its own `by`,
 *   which is the inference `consumption-by-required` declines to make the
 *   author write down, so the reactor that issues that one operation reaches
 *   the call through it and a reactor that issues something else does not.
 *
 * Where `by` is written and names somebody else, the answer is somebody
 * else's. That is the whole narrowing, and the repair for a model it catches
 * is to say which of the context's operations makes this call.
 *
 * The inference is worth its own sentence, because a fourth clause used to
 * make it here and made it too widely. Card 126 read a lone silent call as
 * "the sole operation of its consumer answers whoever is asking", without
 * asking whether the reactor issues that operation, so a bystander policy that
 * named the answer heard it, the flow map drew the step, and a policy issuing
 * the front on the bystander's event closed a ring `reaction-cycle` reported —
 * while the same model with `by: [thatOperation]` written was refused. The
 * inference behaves as writing it would, which is what decisions 21 and 23 say
 * it is, and once the reactor has to issue the operation the call chain
 * already reaches it: the clause said nothing the one above it does not
 * (card 128, architect's thirteenth round).
 *
 * This is {@link routesTo} asked as a yes-or-no question, and it is written as
 * one call to it rather than as the same clauses again. Until card 116 the
 * inference was asked here only as "is the lone call silent", while
 * `routesTo` also asked whether the consumer had a single operation to infer,
 * so a by-less consumer providing three operations passed `consumable-kind` —
 * the reactor was allowed to wait on the answer — and the walk then drew no
 * step from it, leaving a process waiting for something the flow map never
 * delivered (decision 21, 2026-09-09 amendment; architect's tenth round).
 */
export function hearsAnswerOf(
	reactor: Policy | Process,
	operation: Consumable,
): boolean {
	return routesTo(reactor, operation).length > 0;
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
 * Where the call is two or more fronts away, the step still runs from the
 * operation the reactor issued: that is the node the reactor knows about, and
 * the fronts between are the context's own plumbing, drawn on the chain as
 * their own steps out (see {@link callChainReaches}). Where nothing says who
 * calls and the consumer provides a single operation, that operation is the
 * `by` the model did not make the author write, and the route runs through it
 * like any other hop of the chain, because `callsOut` makes that inference on
 * the way out and the chain is followed with it; where the consumer provides
 * several, the model has not said, and the chain stops rather than guessing —
 * the same silence `consumption-by-required` warns about.
 *
 * The inference routes to the reactor that issues that operation and to no
 * other. Card 126 added a clause that returned the sole operation for any
 * reactor of the context, so a bystander that issued something else was drawn
 * the answer and could close a ring, while the same model with `by` written
 * was refused — the two readings of one fact disagreed. It behaves as
 * `by: [thatOperation]` would (decisions 21 and 23), and read that way it says
 * nothing the call chain above does not, so the clause is gone rather than
 * repaired (card 128).
 */
export function routesTo(
	reactor: Policy | Process,
	operation: Consumable,
): Reactor[] {
	if (reactor.commands.includes(operation)) return [operation];
	const calls = callsTo(reactor.boundedcontext, operation);
	const named = calls.flatMap((call) => callersFor(reactor, call));
	if (named.length > 0) return named;
	return reactor.commands.filter((issued) =>
		callChainReaches(issued, operation, reactor.boundedcontext),
	);
}

/**
 * Whether the local `by` chain that starts at `issued` reaches `operation`.
 *
 * A reactor calls through a front, and a front is entitled to call through
 * another one: a saga issues the use-case operation, which calls the payments
 * adapter, which calls the provider. `reachedEvents` has always followed that
 * chain to its end, so the events the provider raises come back up it, and an
 * answer stopping after one hop made the two halves of the same chain
 * disagree — `consumable-kind` then told the saga it never made a call it
 * plainly made, and dictated which front it had to issue (decision 21, note of
 * 2026-09-10 second, and the amendment that ships it).
 *
 * The chain is followed only while it stays in `local`, the reactor's own
 * context. Each hop is then the reactor's own `by`, said by its own team about
 * its own operations, which is what keeps card 104's rule intact: the answer
 * goes to the caller and to nobody else. Crossing a boundary is still one hop
 * — what the far context does with the call is its own chain, and a reactor
 * here has said nothing about it.
 *
 * Cycle-guarded exactly as `reachedEvents` is: a ring of calls terminates
 * rather than looping.
 */
function callChainReaches(
	issued: Consumable,
	operation: Consumable,
	local: BoundedContext,
): boolean {
	if (issued.type !== "operation") return false;
	const seen = new Set<Consumable>([issued]);
	const queue = callsOut(issued);
	while (queue.length) {
		const called = queue.shift();
		if (!called || seen.has(called)) continue;
		seen.add(called);
		if (called === operation) return true;
		if (called.boundedcontext === local) queue.push(...callsOut(called));
	}
	return false;
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
 *
 * Exported because `raises-restated` has to name the operation that really
 * raises the fact, and it read the consumptions itself with the inference left
 * out — so a single-operation front was told it restated an event that
 * `""` already raises (card 130). One reading of "what does this operation
 * call" is what keeps the walk and the warning saying the same thing.
 */
export function callsOut(operation: Consumable): Consumable[] {
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
