import type { Consumable } from "@open-domain-specification/core";

/** Codicon names per element kind, shared by every host including the extension's tree and search. */
export const ICONS = {
	workspace: "package",
	domain: "symbol-namespace",
	subdomain: "symbol-module",
	boundedcontext: "symbol-class",
	aggregate: "symbol-structure",
	service: "symbol-method",
	entity: "symbol-field",
	valueobject: "symbol-constant",
	invariant: "shield",
	event: "broadcast",
	command: "zap",
	policy: "law",
	term: "book",
	team: "organization",
	consumable: "export",
	schema: "json",
	consumption: "cloud-download",
	relationship: "arrow-swap",
} as const;

/** Icon for a consumable by kind: events broadcast, operations act. */
export const consumableIcon = (c: Consumable) =>
	c.type === "event" ? ICONS.event : ICONS.command;

export const SUBDOMAIN_TYPE: Record<string, string> = {
	core: "Core: the differentiator. Invest the best people and the richest model here.",
	supporting:
		"Supporting: necessary but not differentiating. Keep it simple, build or outsource.",
	generic: "Generic: a solved problem. Buy or adopt off the shelf.",
};

export const SERVICE_TYPE: Record<string, string> = {
	application:
		"Application service: orchestrates a use case across aggregates and holds no domain rules.",
	domain:
		"Domain service: a domain operation that does not belong naturally to a single aggregate.",
};

export const RELATIONSHIP: Record<string, string> = {
	"upstream-downstream":
		"Upstream changes flow to downstream; downstream has no say.",
	"customer-supplier":
		"Downstream is a customer whose needs the upstream plans for.",
	partnership: "Two teams succeed or fail together and coordinate changes.",
	"shared-kernel": "A shared subset of the model, changed only by agreement.",
	"separate-ways": "No integration; each side solves the problem alone.",
};
