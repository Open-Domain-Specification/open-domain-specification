import type * as ods from "./schema";
import type {
	Consumable,
	Consumption,
	ContextRelationship,
	Process,
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
 * contexts, the consumables and consumptions that cross them, and the
 * processes that run across them (decision 23).
 */
export type StrategicIntent =
	| ContextRelationship
	| Consumable
	| Consumption
	| Process;

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
 * Every strategic intent nobody has written anything down about, at every
 * level the evidence layer reaches. This is the widest reading, and it is the
 * reconciliation worklist the AI skill walks.
 *
 * Internal consumables never cross a context boundary, so they are not
 * strategic and are left out; everything else the model says about how two
 * contexts meet is in scope.
 *
 * The health report and the `comments-required` rule deliberately read the
 * narrower {@link relationshipsWithoutComments} instead: one uncommented
 * consumable is a gap in the notes, whereas one uncommented relationship is a
 * strategic claim nobody has justified, and only the second is worth a warning.
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
		// A process spans several exchanges and usually several contexts, so what
		// is known about the real one behind it is evidence of the same kind.
		intents.push(...boundedcontext.processes.values());
	}

	return intents.filter((intent) => intent.comments.length === 0);
}

/**
 * The relationships nobody has written anything down about: the "No comments"
 * list on the health report, the third of the three counts the workspace node
 * and the summary strip show, and what the `comments-required` rule warns on.
 *
 * A relationship is where the model makes a claim about how two teams meet, so
 * an empty one is the gap a reader can actually act on. Consumables and
 * consumptions are left to {@link intentsWithoutComments}.
 */
export function relationshipsWithoutComments(
	workspace: Workspace,
): ContextRelationship[] {
	return workspace.relationships.filter((r) => r.comments.length === 0);
}
