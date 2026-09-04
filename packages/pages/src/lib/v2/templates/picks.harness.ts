import {
	type BoundedContext,
	type ContextRelationship,
	type Domain,
	dispositionOf,
	type Subdomain,
	type Team,
	type Workspace,
} from "@open-domain-specification/core";

/**
 * What each `V2/Templates/...` story renders the page against. The stories
 * and the compare stories read the same elements out of the petstore fixture,
 * so the two columns of a comparison are always the same page.
 *
 * Sales is the context every evidence surface uses: it is the one context
 * that touches all four others, so its strategic position fills each of the
 * three groups at once. Everything else is the first of its kind, which in
 * the petstore is the richest one.
 */
export const pickDomain = (ws: Workspace): Domain =>
	[...ws.domains.values()][0];

export const pickSubdomain = (ws: Workspace): Subdomain =>
	[...pickDomain(ws).subdomains.values()][0];

export const pickContext = (ws: Workspace): BoundedContext =>
	ws.boundedcontexts.get("sales_bc") ?? [...ws.boundedcontexts.values()][0];

export const pickTeam = (ws: Workspace): Team => [...ws.teams.values()][0];

/** The one relationship the petstore marks for refactoring, so the page shows a disposition. */
export const pickRelationship = (ws: Workspace): ContextRelationship =>
	ws.relationships.find((r) => dispositionOf(r) === "refactor") ??
	ws.relationships[0];
