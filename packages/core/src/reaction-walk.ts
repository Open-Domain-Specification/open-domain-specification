import { type BoundedContext, type Consumable, Policy } from "./workspace";

/** A step in a reaction chain: an operation, an event, or a policy. */
export type Reactor = Consumable | Policy;

/**
 * The causal chain the model can follow, one step at a time.
 *
 * A policy issues its operations, an operation raises its events, and an
 * event wakes the policies listening for it. Those three steps stay inside a
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
	/** Which policies each event wakes, for the contexts in scope. */
	private readonly listeners = new Map<Consumable, Policy[]>();
	/** Every policy in scope, in declaration order. */
	readonly policies: Policy[] = [];
	/** Every step in scope: the consumables the contexts provide, then their policies. */
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
				for (const event of policy.events) {
					const existing = this.listeners.get(event);
					if (existing) existing.push(policy);
					else this.listeners.set(event, [policy]);
				}
			}
		}
	}

	/** What the chain does next from one step. */
	after(node: Reactor): Reactor[] {
		if (node instanceof Policy) return node.commands;
		return [
			...node.raisedEvents,
			...this.consumedThrough(node),
			...(this.listeners.get(node) ?? []),
		];
	}

	/**
	 * The operations this one calls out to: the consumptions its own provider
	 * declares that name it in `by`. A consumption's `by` names operations the
	 * consumer itself provides (`consumption-by-resolves`), so the consumer is
	 * always this operation's provider and no index is needed — which also
	 * means the step is found the same way however narrow the scope is.
	 */
	private consumedThrough(operation: Consumable): Consumable[] {
		return operation.provider.consumptions
			.filter(
				(c) => c.consumable.type === "operation" && c.by.includes(operation),
			)
			.map((c) => c.consumable);
	}
}
