import {
	Aggregate,
	Answer,
	BoundedContext,
	Consumable,
	DataSchema,
	Deadline,
	Domain,
	Entity,
	GlossaryTerm,
	Invariant,
	Policy,
	Process,
	Service,
	Subdomain,
	Team,
	ValueObject,
} from "@open-domain-specification/core";
import type { Kind } from "../atoms/kinds";

/**
 * Which kind an element is, for the pages that link to something the model
 * types only as referenceable — a glossary term's embodied element, an
 * invariant's targets, the owner of an attribute. v1 drew a generic
 * `symbol-misc` glyph in those places; v2 says the kind with its codicon
 * everywhere a name appears, so the kind has to be recovered from the
 * instance. Falls back to the neutral consumable glyph for anything the
 * model gains later, so a new element type draws an icon rather than
 * throwing.
 */
export const kindOf = (element: unknown): Kind => {
	if (element instanceof Entity) return "entity";
	if (element instanceof ValueObject) return "valueobject";
	if (element instanceof Aggregate) return "aggregate";
	if (element instanceof Service) return "service";
	if (element instanceof BoundedContext) return "boundedcontext";
	if (element instanceof Subdomain) return "subdomain";
	if (element instanceof Domain) return "domain";
	// An answer is read as the shape it came back as: what a reader clicks is
	// the schema, and which call it came from is said beside it.
	if (element instanceof DataSchema || element instanceof Answer)
		return "schema";
	if (element instanceof Policy) return "policy";
	if (element instanceof Process) return "process";
	if (element instanceof Deadline) return "deadline";
	if (element instanceof Invariant) return "invariant";
	if (element instanceof GlossaryTerm) return "term";
	if (element instanceof Team) return "team";
	if (element instanceof Consumable)
		return element.type === "event" ? "event" : "command";
	return "consumable";
};
