import {
	Answer,
	type Consumable,
	Deadline,
	type ProcessTrigger,
} from "./workspace";

/**
 * How far a reading goes to tell one trigger from another that would read the
 * same, each only where the one before still leaves two alike:
 *
 * - `origin`: an answer by where it came from, "Charge rejects with Decline";
 *   a timer by its name and what its clock counts from, read the same way; an
 *   event by the provider that publishes it.
 * - `context`: the same with each operation named by its context and
 *   provider, each shape by its context, and a timer by its id as well.
 * - `ref`: the trigger's own ref, which no two share.
 *
 * Every reader of the model — the flow map, Markdown and the pages — reads a
 * trigger by its own name first, the way decision 23 says: the shape an answer
 * came back as, a timer's length, an event's name. Where two triggers in one
 * list or between two nodes would then read the same, they are told apart by
 * these readings and no others, so every surface says the same thing about
 * the same two triggers (issue #108, identity audit before the twenty-third
 * review).
 */
export type TriggerDistinction = "origin" | "context" | "ref";

export const TRIGGER_DISTINCTIONS = Object.freeze([
	"origin",
	"context",
	"ref",
] as const);

/** An operation or event with the context and provider that offer it. */
const offered = (consumable: Consumable) =>
	`${consumable.boundedcontext.name} / ${consumable.provider.name} / ${consumable.name}`;

/** How a trigger reads at one distinction. */
function readTrigger(
	trigger: ProcessTrigger,
	level: TriggerDistinction,
	includeAnchor: boolean,
): string {
	if (level === "ref") return trigger.ref;
	if (trigger instanceof Answer) {
		if (level === "origin") return trigger.origin;
		const shape = trigger.schema
			? ` ${trigger.schema.boundedcontext.name} / ${trigger.name}`
			: "";
		return `${offered(trigger.operation)} ${trigger.verb}${shape}`;
	}
	if (trigger instanceof Deadline) {
		const anchor =
			includeAnchor && trigger.from
				? ` from ${readTrigger(trigger.from, level, false)}`
				: "";
		const name =
			level === "context" ? `${trigger.name} (${trigger.id})` : trigger.name;
		return `${name}: after ${trigger.after}${anchor}`;
	}
	return level === "origin"
		? `${trigger.provider.name} / ${trigger.name}`
		: offered(trigger);
}

/** How a trigger reads at one distinction. */
export function triggerReading(
	trigger: ProcessTrigger,
	level: TriggerDistinction,
): string {
	return readTrigger(trigger, level, true);
}

/**
 * Each item's text as its reader writes it, told apart only where two would
 * read the same: those are read at the first distinction under which every one
 * of them reads differently. The rest keep the reader's own text.
 */
export function distinguish<T>(
	items: T[],
	readAs: (item: T) => string,
	triggerOf: (item: T) => ProcessTrigger,
): (item: T) => string {
	const texts = new Map(items.map((item) => [item, readAs(item)]));
	const alike = new Map<string, T[]>();
	for (const item of new Set(items)) {
		const text = texts.get(item)!;
		alike.set(text, [...(alike.get(text) ?? []), item]);
	}
	for (const group of alike.values()) {
		if (group.length < 2) continue;
		const level =
			TRIGGER_DISTINCTIONS.find(
				(it) =>
					new Set(group.map((item) => triggerReading(triggerOf(item), it)))
						.size === group.length,
			) ?? "ref";
		for (const item of group)
			texts.set(item, triggerReading(triggerOf(item), level));
	}
	return (item) => texts.get(item) ?? readAs(item);
}
