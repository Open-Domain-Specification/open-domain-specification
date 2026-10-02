import type { Workspace } from "@open-domain-specification/core";

/**
 * The health report's route. It is the one page that is a read of the whole
 * workspace rather than an element, so it has a route but no ref in the model.
 */
export const HEALTH_REF = "#/health";

/** What {@link resolvePage} returns as the target for {@link HEALTH_REF}. */
export const HEALTH_PAGE = { page: "health" } as const;

/** Every ref that owns a page: workspace, teams, domains, subdomains, contexts, their relationships and everything inside them. */
export function pageRefs(ws: Workspace): string[] {
	const refs = ["#", HEALTH_REF];
	for (const t of ws.teams.values()) refs.push(t.ref);
	for (const r of ws.relationships) refs.push(r.ref);
	for (const d of ws.domains.values()) {
		refs.push(d.ref);
		for (const s of d.subdomains.values()) refs.push(s.ref);
	}
	for (const bc of ws.boundedcontexts.values()) {
		refs.push(bc.ref);
		for (const v of bc.valueobjects.values()) {
			refs.push(v.ref);
			// A rule the value keeps by construction (decision 27).
			for (const i of v.invariants.values()) refs.push(i.ref);
		}
		// A rule the context keeps rather than one aggregate (decision 27).
		for (const i of bc.invariants.values()) refs.push(i.ref);
		for (const a of bc.aggregates.values()) {
			refs.push(a.ref);
			for (const m of [
				...a.entities.values(),
				...a.invariants.values(),
				...a.consumables.values(),
			])
				refs.push(m.ref);
		}
		for (const s of bc.services.values()) {
			refs.push(s.ref);
			for (const c of s.consumables.values()) refs.push(c.ref);
		}
		for (const p of bc.policies.values()) refs.push(p.ref);
		for (const p of bc.processes.values()) refs.push(p.ref);
		for (const s of bc.schemas.values()) refs.push(s.ref);
		for (const t of bc.glossary.values()) refs.push(t.ref);
	}
	return refs;
}

/** Picks the nearest page-owning canonical ref, else the workspace. */
export function resolvePage(
	ws: Workspace,
	ref: string,
): { target: unknown; pageRef: string } {
	if (ref === HEALTH_REF) return { target: HEALTH_PAGE, pageRef: HEALTH_REF };
	for (const pageRef of pageRefs(ws).sort((a, b) => b.length - a.length)) {
		if (ref !== pageRef && !ref.startsWith(`${pageRef}/`)) continue;
		const target =
			pageRef === "#"
				? ws
				: (ws.findRelationship(pageRef) ?? ws.getByRef(pageRef));
		if (target) return { target, pageRef };
	}
	return { target: ws, pageRef: "#" };
}
