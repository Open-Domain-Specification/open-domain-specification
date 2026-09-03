import type * as ods from "./schema";
import type {
	Consumable,
	Consumption,
	ContextRelationship,
	Workspace,
} from "./workspace";

/**
 * The evidence half of a strategic intent: what the author knows about the
 * real system behind it, and what the architecture thinks of it. Accepted by
 * the DSL wherever an intent is declared.
 */
export type EvidenceOptions = {
	/** Grounded statements about the real system, each optionally backed by a link. */
	comments?: ods.Comment[];
	/** Absent (or `by-design`) means the intent is how it should be. */
	disposition?: ods.Disposition;
};

/** A model element that carries evidence. */
export interface Evidenced {
	comments: ods.Comment[];
	disposition?: ods.Disposition;
}

/**
 * The strategic intents evidence hangs off: the relationships between
 * contexts, and the consumables and consumptions that cross them.
 */
export type StrategicIntent = ContextRelationship | Consumable | Consumption;

/**
 * `by-design` is the meaning of an absent disposition, so it is never stored
 * and never written to JSON. Applied where an element is constructed.
 */
export function normaliseDisposition(
	disposition?: ods.Disposition,
): ods.Disposition | undefined {
	return disposition === "by-design" ? undefined : disposition;
}

/** What the architecture thinks of an intent; `by-design` when nothing was said. */
export function dispositionOf(element: {
	disposition?: ods.Disposition;
}): ods.Disposition {
	return element.disposition ?? "by-design";
}

/**
 * Every strategic intent nobody has written anything down about. The health
 * report's "no comments" list, and the `comments-required` rule, read this.
 *
 * Internal consumables never cross a context boundary, so they are not
 * strategic and are left out; everything else the model says about how two
 * contexts meet is in scope.
 */
export function intentsWithoutComments(
	workspace: Workspace,
): StrategicIntent[] {
	const intents: StrategicIntent[] = [...workspace.relationships];

	for (const boundedcontext of workspace.boundedcontexts.values()) {
		const providers = [
			...boundedcontext.aggregates.values(),
			...boundedcontext.services.values(),
		];
		for (const provider of providers) {
			for (const consumable of provider.consumables.values()) {
				if (!consumable.internal) intents.push(consumable);
			}
			intents.push(...provider.consumptions);
		}
	}

	return intents.filter((intent) => intent.comments.length === 0);
}
