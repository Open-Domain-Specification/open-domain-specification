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
		for (const v of bc.valueobjects.values()) refs.push(v.ref);
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
		for (const s of bc.schemas.values()) refs.push(s.ref);
		for (const t of bc.glossary.values()) refs.push(t.ref);
	}
	return refs;
}

const AGG = /^#\/boundedcontexts\/([^/]+)\/aggregates\/([^/]+)/;
const aggregateOf = (ws: Workspace, m: RegExpMatchArray) =>
	ws.boundedcontexts.get(m[1])?.aggregates.get(m[2]);
const memberOf = (kind: "entities" | "invariants") => [
	new RegExp(`${AGG.source}\\/${kind}\\/([^/]+)`),
	(ws: Workspace, m: RegExpMatchArray) => aggregateOf(ws, m)?.[kind].get(m[3]),
];

/** Deepest pattern first: every element with a ref gets its own page. */
const PAGE_PATTERNS: [
	RegExp,
	(ws: Workspace, m: RegExpMatchArray) => unknown,
][] = [
	// Not an element: a read of the whole workspace that owns a route of its own.
	[/^#\/health$/, () => HEALTH_PAGE],
	[/^#\/teams\/([^/]+)/, (ws, m) => ws.teams.get(m[1])],
	// A relationship's ref is its whole identity, so match it entire.
	[/^#\/relationships\/[^/]+$/, (ws, m) => ws.findRelationship(m[0])],
	[
		/^#\/domains\/([^/]+)\/subdomains\/([^/]+)/,
		(ws, m) => ws.domains.get(m[1])?.subdomains.get(m[2]),
	],
	[/^#\/domains\/([^/]+)/, (ws, m) => ws.domains.get(m[1])],
	// A value object hangs off the context, not the aggregate (decision 16).
	[
		/^#\/boundedcontexts\/([^/]+)\/valueobjects\/([^/]+)/,
		(ws, m) => ws.boundedcontexts.get(m[1])?.valueobjects.get(m[2]),
	],
	...(["entities", "invariants"] as const).map(
		(k) =>
			memberOf(k) as [RegExp, (ws: Workspace, m: RegExpMatchArray) => unknown],
	),
	[
		new RegExp(`${AGG.source}\\/provides\\/([^/]+)`),
		(ws, m) => aggregateOf(ws, m)?.consumables.get(m[3]),
	],
	[
		/^#\/boundedcontexts\/([^/]+)\/services\/([^/]+)\/provides\/([^/]+)/,
		(ws, m) =>
			ws.boundedcontexts.get(m[1])?.services.get(m[2])?.consumables.get(m[3]),
	],
	[AGG, aggregateOf],
	[
		/^#\/boundedcontexts\/([^/]+)\/services\/([^/]+)/,
		(ws, m) => ws.boundedcontexts.get(m[1])?.services.get(m[2]),
	],
	[
		/^#\/boundedcontexts\/([^/]+)\/policies\/([^/]+)/,
		(ws, m) => ws.boundedcontexts.get(m[1])?.policies.get(m[2]),
	],
	[
		/^#\/boundedcontexts\/([^/]+)\/schemas\/([^/]+)/,
		(ws, m) => ws.boundedcontexts.get(m[1])?.schemas.get(m[2]),
	],
	[
		/^#\/boundedcontexts\/([^/]+)\/glossary\/([^/]+)/,
		(ws, m) => ws.boundedcontexts.get(m[1])?.glossary.get(m[2]),
	],
	// An invariant the context owns; the aggregate's is matched further up.
	[
		/^#\/boundedcontexts\/([^/]+)\/invariants\/([^/]+)/,
		(ws, m) => ws.boundedcontexts.get(m[1])?.invariants.get(m[2]),
	],
	[/^#\/boundedcontexts\/([^/]+)/, (ws, m) => ws.boundedcontexts.get(m[1])],
];

/** Picks the page that owns a ref: the deepest page pattern that matches, else the workspace. */
export function resolvePage(
	ws: Workspace,
	ref: string,
): { target: unknown; pageRef: string } {
	for (const [pattern, get] of PAGE_PATTERNS) {
		const m = ref.match(pattern);
		if (m) {
			const target = get(ws, m);
			if (target) return { target, pageRef: m[0] };
		}
	}
	return { target: ws, pageRef: "#" };
}
