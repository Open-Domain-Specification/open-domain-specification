import type { ReactionChain, ReactionStep, Reactor } from "./reaction-walk";
import { Consumable, Policy, Process } from "./workspace";

/**
 * One node of the reaction chain as one invocation reaches it: the node, and
 * — on an operation — the policy or process whose call it is serving.
 *
 * The chain draws an answer step from the call that asked for it, once per
 * node, so the step is conditional: it is taken when that reactor made the
 * call, and not when somebody else's call passes through the same operation.
 * The flow map draws the conditional steps, which is what a reader needs to
 * see every route. A ring has to be one run of steps, so `reaction-cycle`
 * keeps a ring met on the drawn chain only when these states, where the
 * condition is part of the state, run it whole, and searches them for a ring
 * the drawn walk could not show.
 */
export type Invocation = {
	readonly node: Reactor;
	/** The reactor whose call an operation is serving; none on a reactor or an event. */
	readonly caller?: Policy | Process;
};

/**
 * The reaction chain unfolded by who made each call (issue #108, twentieth
 * signoff review; decision 23).
 *
 * The caller is set where a reactor issues an operation and carried across
 * every call that operation makes, in this context or the next, because the
 * call chain is that one invocation. It is dropped where an operation raises
 * an event and where anything wakes a reactor: a fact is published to every
 * subscriber, and a reactor is the same node however it woke. Only an answer
 * step reads it. An answer comes back down the call that asked for it to the
 * reactor that made that call, so the step is taken when the caller is that
 * reactor, or when the reactor is a process the operation starts, whose
 * instance owns the calls its starting operation makes but not that
 * operation's own answer, which goes to whoever called it (decision 23, third
 * amendment of 2026-09-10).
 *
 * The states are finite: one per reactor and event, and one per operation and
 * possible caller, so at most nodes × (reactors + 1), each interned so a walk
 * can key on identity. A depth-first walk of them is linear in states and
 * steps, with no call stack to unwind and no paths to enumerate.
 */
export class InvocationWalk {
	private readonly interned = new Map<
		Reactor,
		Map<Policy | Process | undefined, Invocation>
	>();

	constructor(private readonly chain: ReactionChain) {}

	/**
	 * Where a walk may begin: every node, with no caller. Every state is
	 * reached from one of these, since a caller is only ever set by the
	 * reactor stepping into its own operation.
	 */
	entries(): Invocation[] {
		return this.chain.steps.map((node) => this.at(node));
	}

	/** The states one invocation can step to next, each once. */
	next(from: Invocation): Invocation[] {
		const caller = callerAt(from);
		const next = new Set<Invocation>();
		for (const step of this.chain.stepsFrom(from.node))
			if (answersInvocation(caller, from.node, step))
				next.add(this.at(step.to, carriesCaller(step.to) ? caller : undefined));
		return [...next];
	}

	/** A stable key for a state, for ordering and de-duplicating rings. */
	keyOf(state: Invocation): string {
		return `${state.node.ref}|${state.caller?.ref ?? ""}`;
	}

	private at(node: Reactor, caller?: Policy | Process): Invocation {
		let byCaller = this.interned.get(node);
		if (!byCaller) {
			byCaller = new Map();
			this.interned.set(node, byCaller);
		}
		let state = byCaller.get(caller);
		if (!state) {
			state = { node, caller };
			byCaller.set(caller, state);
		}
		return state;
	}
}

/**
 * Whether one invocation takes a step: every step but an answer is taken,
 * and an answer only when it comes back to the reactor that made this call,
 * or to a process the call's operation starts, for the calls that operation
 * makes rather than its own answer.
 */
export function answersInvocation(
	caller: Policy | Process | undefined,
	at: Reactor,
	step: ReactionStep,
): boolean {
	if (!step.answer) return true;
	if (step.to === caller) return true;
	return (
		step.to instanceof Process &&
		at instanceof Consumable &&
		step.to.startEvents.includes(at) &&
		step.answer.operation !== at
	);
}

/**
 * Whose call a state is: a reactor's own, since anything it issues is its
 * call, or the caller an operation is serving.
 */
function callerAt(state: Invocation): Policy | Process | undefined {
	return isReactor(state.node) ? state.node : state.caller;
}

/**
 * Whether the next node serves the call that reached it: an operation does,
 * whether a reactor issued it or another operation called it, and a reactor
 * or an event serves nobody's call.
 */
function carriesCaller(node: Reactor): boolean {
	return !isReactor(node) && node.type !== "event";
}

function isReactor(node: Reactor): node is Policy | Process {
	return node instanceof Policy || node instanceof Process;
}
