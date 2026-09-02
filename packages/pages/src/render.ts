import {
	type Aggregate,
	Aggregate as AggregateClass,
	type BoundedContext,
	BoundedContext as BoundedContextClass,
	type Diagnostic,
	type Domain,
	Domain as DomainClass,
	type Entity,
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
	type Service,
	Service as ServiceClass,
	type Subdomain,
	Subdomain as SubdomainClass,
	type ValueObject,
	type Workspace,
} from "@open-domain-specification/core";
import {
	consumableMapToDigraph,
	contextMapToDigraph,
	relationMapToDigraph,
} from "@open-domain-specification/graphviz";
import { elementPage } from "./element-pages";
import {
	attributeTable,
	card,
	chip,
	consumableCard,
	consumableIcon,
	consumesTable,
	contextChip,
	empty,
	esc,
	figure,
	header,
	ICONS,
	icon,
	link,
	md,
	nameOf,
	problemsBlock,
	providesTable,
	RELATIONSHIP,
	type RenderedPage,
	type RenderInput,
	SERVICE_TYPE,
	SUBDOMAIN_TYPE,
	section,
	subdomainCard,
	teamLine,
} from "./html";

export type { RenderedPage, RenderInput } from "./html";

/* ---------- pages ---------- */

type PageBuilder = (
	input: RenderInput,
	problems: (ref: string) => Diagnostic[],
) => Promise<RenderedPage>;

async function workspacePage(
	input: RenderInput,
	problems: (ref: string) => Diagnostic[],
): Promise<RenderedPage> {
	const ws = input.workspace;
	const domains = [...ws.domains.values()];
	const contexts = [...ws.boundedcontexts.values()];
	const teams = [...ws.teams.values()];
	const all = input.diagnostics;
	const workspaceContextMap = ODSContextMap.fromWorkspace(ws);

	const body = `
${header({
	kind: "Workspace",
	iconName: ICONS.workspace,
	name: ws.name,
	id: ws.id,
	meta: [chip(`v${ws.version}`, "muted"), chip(input.fileLabel, "muted")],
	description: ws.description,
	crumbs: [],
})}
${section(
	"problem",
	"Problem space",
	"Domains group the subdomains the business needs; each subdomain is classified by how much it matters to compete.",
	domains.length
		? domains
				.map(
					(d) =>
						`<h3>${link(d.ref, d.name, ICONS.domain)}</h3>${md(d.description)}<div class="grid">${[...d.subdomains.values()].map(subdomainCard).join("")}</div>`,
				)
				.join("")
		: empty("No domains yet. Start by naming what the business does."),
	domains.flatMap((d) => problems(d.ref)),
)}
${section(
	"solution",
	"Solution space",
	"Bounded contexts are where models live. The map shows which context is upstream of which and how they protect themselves.",
	(await figure(
		input.svg,
		"Context map",
		contextMapToDigraph(workspaceContextMap).toDot(),
		workspaceContextMap.nodes.size,
		"No bounded contexts yet.",
	)) +
		(contexts.length
			? `<table><thead><tr><th>Context</th><th>Serves</th><th>Team</th><th>Aggregates</th><th>Services</th></tr></thead><tbody>${contexts
					.map(
						(bc) =>
							`<tr><td>${contextChip(bc)}</td><td>${[...bc.subdomains].map((s) => link(s.ref, s.name)).join(", ") || '<span class="dim">none</span>'}</td><td>${teamLine(bc.team)}</td><td>${bc.aggregates.size}</td><td>${bc.services.size}</td></tr>`,
					)
					.join("")}</tbody></table>`
			: empty("No bounded contexts yet.")),
	contexts.flatMap((bc) => problems(bc.ref).filter((d) => d.ref === bc.ref)),
)}
${section(
	"teams",
	"Teams",
	"Conway's law runs both ways: one team per context keeps the model coherent.",
	teams.length
		? `<div class="grid">${teams
				.map((t) =>
					card({
						ref: t.ref,
						name: t.name,
						iconName: ICONS.team,
						description: t.description,
						body: `<div class="pills">${
							contexts
								.filter((bc) => bc.team === t)
								.map(contextChip)
								.join("") || '<span class="dim">owns no context</span>'
						}</div>`,
					}),
				)
				.join("")}</div>`
		: empty("No teams recorded."),
)}
${section(
	"health",
	"Model health",
	"Structural rules ODS can check. Each entry links to the element concerned.",
	all.length
		? problemsBlock(all)
		: `<p class="ok">${icon("pass")} No structural problems found.</p>`,
)}`;
	return {
		title: ws.name,
		body,
		sections: [
			{ id: "problem", label: "Problem space" },
			{ id: "solution", label: "Solution space" },
			{ id: "teams", label: "Teams" },
			{ id: "health", label: "Model health" },
		],
	};
}

async function domainPage(
	input: RenderInput,
	problems: (ref: string) => Diagnostic[],
	d: Domain,
): Promise<RenderedPage> {
	const subs = [...d.subdomains.values()];
	const domainContextMap = ODSContextMap.fromDomain(d);
	const body = `
${header({
	kind: "Domain",
	iconName: ICONS.domain,
	name: d.name,
	id: d.id,
	meta: [],
	description: d.description,
	crumbs: [["#", input.workspace.name]],
})}
${section(
	"subdomains",
	"Subdomains",
	"The parts of this domain, classified as core, supporting or generic. The classification decides where effort goes.",
	subs.length
		? `<div class="grid">${subs.map(subdomainCard).join("")}</div>`
		: empty("No subdomains yet."),
	problems(d.ref),
)}
${section(
	"contexts",
	"Contexts serving this domain",
	"How the solution space lines up against this part of the problem.",
	await figure(
		input.svg,
		`${d.name} context map`,
		contextMapToDigraph(domainContextMap).toDot(),
		domainContextMap.nodes.size,
		"No contexts serve this domain yet.",
	),
)}`;
	return {
		title: d.name,
		body,
		sections: [
			{ id: "subdomains", label: "Subdomains" },
			{ id: "contexts", label: "Contexts" },
		],
	};
}

async function subdomainPage(
	input: RenderInput,
	problems: (ref: string) => Diagnostic[],
	s: Subdomain,
): Promise<RenderedPage> {
	const serving = [...s.boundedcontexts.values()];
	const subdomainContextMap = ODSContextMap.fromSubdomain(s);
	const body = `
${header({
	kind: "Subdomain",
	iconName: ICONS.subdomain,
	name: s.name,
	id: s.id,
	meta: [chip(s.type, s.type, SUBDOMAIN_TYPE[s.type])],
	description: s.description,
	crumbs: [
		["#", input.workspace.name],
		[s.domain.ref, s.domain.name],
	],
})}
${section(
	"classification",
	"Classification",
	SUBDOMAIN_TYPE[s.type] ?? "",
	"",
	problems(s.ref),
)}
${section(
	"serving",
	"Served by",
	"Bounded contexts that implement a model for this subdomain. One context may serve several subdomains, and a subdomain may need several contexts.",
	serving.length
		? `<div class="grid">${serving
				.map((bc) =>
					card({
						ref: bc.ref,
						name: bc.name,
						iconName: ICONS.boundedcontext,
						meta: bc.bigBallOfMud ? chip("big ball of mud", "warn") : "",
						description: bc.description,
						body: `<p class="dim">Team: ${teamLine(bc.team)}</p>`,
					}),
				)
				.join("")}</div>`
		: empty("No bounded context serves this subdomain yet."),
)}
${section(
	"map",
	"Context map",
	"The contexts serving this subdomain and their neighbours.",
	await figure(
		input.svg,
		`${s.name} context map`,
		contextMapToDigraph(subdomainContextMap).toDot(),
		subdomainContextMap.nodes.size,
		"No bounded context serves this subdomain yet.",
	),
)}`;
	return {
		title: s.name,
		body,
		sections: [
			{ id: "classification", label: "Classification" },
			{ id: "serving", label: "Served by" },
			{ id: "map", label: "Context map" },
		],
	};
}

async function contextPage(
	input: RenderInput,
	problems: (ref: string) => Diagnostic[],
	bc: BoundedContext,
): Promise<RenderedPage> {
	const ws = input.workspace;
	const relationships = ws.relationships.filter(
		(r) => r.source === bc || r.target === bc,
	);
	const aggregates = [...bc.aggregates.values()];
	const services = [...bc.services.values()];
	const policies = [...bc.policies.values()];
	const terms = [...bc.glossary.values()];
	const schemas = [...bc.schemas.values()];
	const members = [...aggregates, ...services];
	const provides = members.flatMap((m) => [...m.consumables.values()]);
	const consumes = members.flatMap((m) => m.consumptions);
	const bcContextMap = ODSContextMap.fromBoundedContext(bc);
	const bcConsumableMap = ODSConsumableMap.fromBoundedContext(bc);

	const body = `
${header({
	kind: "Bounded Context",
	iconName: ICONS.boundedcontext,
	name: bc.name,
	id: bc.id,
	meta: [
		...(bc.bigBallOfMud
			? [
					chip(
						"big ball of mud",
						"warn",
						"A model that is not coherent; neighbours should protect themselves with an anti-corruption layer.",
					),
				]
			: []),
	],
	description: bc.description,
	crumbs: [["#", ws.name]],
	facts: [
		[
			"Serves",
			[...bc.subdomains]
				.map(
					(s) =>
						`${link(s.ref, s.name, ICONS.subdomain)} ${chip(s.type, s.type)}`,
				)
				.join(" ") || `<span class="dim">no subdomain</span>`,
		],
		["Owned by", teamLine(bc.team)],
	],
})}
${section(
	"position",
	"Strategic position",
	"Who this context depends on and who depends on it. Roles say how each side protects its model.",
	(relationships.length
		? `<table><thead><tr><th>Relationship</th><th>With</th><th>Type</th><th>Upstream role</th><th>Downstream role</th></tr></thead><tbody>${relationships
				.map((r) => {
					const other = r.source === bc ? r.target : r.source;
					const direction =
						r.type === "partnership" ||
						r.type === "shared-kernel" ||
						r.type === "separate-ways"
							? "with"
							: r.source === bc
								? "upstream of"
								: "downstream of";
					return `<tr><td>${esc(direction)}</td><td>${contextChip(other)}</td><td>${chip(r.type, "muted", RELATIONSHIP[r.type])}</td><td>${r.upstreamRoles.map((x) => chip(x, "muted")).join(" ")}</td><td>${r.downstreamRoles.map((x) => chip(x, "muted")).join(" ")}</td></tr>`;
				})
				.join("")}</tbody></table>`
		: empty(
				"No explicit relationships. Consumptions below imply upstream and downstream links.",
			)) +
		(await figure(
			input.svg,
			`${bc.name} context map`,
			contextMapToDigraph(bcContextMap).toDot(),
			bcContextMap.nodes.size,
			"No neighbouring contexts yet.",
		)),
	problems(bc.ref).filter((d) => d.ref === bc.ref),
)}
${section(
	"model",
	"Model",
	"Aggregates are the consistency boundaries; services carry behaviour that belongs to no single aggregate.",
	(aggregates.length
		? `<h3>Aggregates</h3><div class="grid">${aggregates
				.map((a) => {
					const root = [...a.entities.values()].find((e) => e.root);
					return card({
						ref: a.ref,
						name: a.name,
						iconName: ICONS.aggregate,
						meta: root
							? `${icon("key")} ${esc(root.name)}`
							: chip("no root", "warn"),
						description: a.description,
						body: `<p class="counts">${a.entities.size} entities · ${a.valueobjects.size} value objects · ${a.invariants.size} invariants · ${[...a.consumables.values()].filter((c) => c.type === "operation").length} operations · ${[...a.consumables.values()].filter((c) => c.type === "event").length} events</p>`,
					});
				})
				.join("")}</div>`
		: `<h3>Aggregates</h3>${empty("No aggregates yet.")}`) +
		(services.length
			? `<h3>Services</h3><div class="grid">${services
					.map((s) =>
						card({
							ref: s.ref,
							name: s.name,
							iconName: ICONS.service,
							meta: chip(s.type, "muted", SERVICE_TYPE[s.type]),
							description: s.description,
						}),
					)
					.join("")}</div>`
			: ""),
	members.flatMap((m) => problems(m.ref)),
)}
${section(
	"integration",
	"Integration surface",
	"What this context publishes and what it consumes. Events and open host operations are its published language.",
	(await figure(
		input.svg,
		`${bc.name} consumable map`,
		consumableMapToDigraph(bcConsumableMap).toDot(),
		bcConsumableMap.nodes.size,
		"Provides and consumes nothing yet.",
	)) +
		`<h3>Provides</h3>${providesTable(provides)}<h3>Consumes</h3>${consumesTable(consumes)}`,
)}
${section(
	"behaviour",
	"Policies",
	"Reactions: when these events happen, issue these operations. Policies are where cross-aggregate workflow lives.",
	policies.length
		? policies
				.map((p) =>
					card({
						ref: p.ref,
						name: p.name,
						iconName: ICONS.policy,
						description: p.description,
						body: `<div class="policy"><span class="dim">when</span> ${p.events.map((e) => link(e.ref, e.name, ICONS.event)).join(", ") || '<span class="dim">nothing</span>'} <span class="dim">then</span> ${p.commands.map((c) => link(c.ref, c.name, ICONS.command)).join(", ") || '<span class="dim">nothing</span>'}</div>`,
					}),
				)
				.join("")
		: empty("No policies."),
	policies.flatMap((p) => problems(p.ref)),
)}
${section(
	"schemas",
	"Schemas",
	"Payload shapes this context publishes or accepts. They are part of its published language, so a change here is a change for every consumer.",
	schemas.length
		? `<div class="grid wide">${schemas
				.map((s) =>
					card({
						ref: s.ref,
						name: s.name,
						iconName: ICONS.schema,
						meta: s.consumables.length
							? `<span class="dim">carried by</span> ${s.consumables.map((c) => link(c.ref, c.name, consumableIcon(c))).join(", ")}`
							: chip("unused", "muted"),
						description: s.description,
						body: attributeTable(s.attributes.values()),
					}),
				)
				.join("")}</div>`
		: empty("No schemas. Consumables carry no declared payload."),
	schemas.flatMap((s) => problems(s.ref)),
)}
${section(
	"language",
	"Ubiquitous language",
	"The words this context uses, with the model element that embodies each one. A term that maps to nothing is a gap; an element with no term is jargon.",
	terms.length
		? `<table><thead><tr><th>Term</th><th>Definition</th><th>Also</th><th>Embodied by</th></tr></thead><tbody>${terms
				.map(
					(t) =>
						`<tr id="${esc(t.ref)}"><td><strong>${esc(t.name)}</strong></td><td>${esc(t.definition)}</td><td class="dim">${esc(t.aliases.join(", "))}</td><td>${t.embodiedBy ? link(t.embodiedBy.ref, nameOf(t.embodiedBy)) : '<span class="dim">not modelled</span>'}</td></tr>`,
				)
				.join("")}</tbody></table>`
		: empty("No glossary yet. Naming things is the first act of modelling."),
	terms.flatMap((t) => problems(t.ref)),
)}`;
	return {
		title: bc.name,
		body,
		sections: [
			{ id: "position", label: "Strategic position" },
			{ id: "model", label: "Model" },
			{ id: "integration", label: "Integration surface" },
			{ id: "behaviour", label: "Policies" },
			{ id: "schemas", label: "Schemas" },
			{ id: "language", label: "Ubiquitous language" },
		],
	};
}

function structureCard(
	e: Entity | ValueObject,
	kind: "entity" | "valueobject",
): string {
	const isRoot = kind === "entity" && (e as Entity).root;
	const relations = e.relations.map(
		(r) =>
			`<li>${esc(r.relation)} ${link(r.target.ref, r.target.name)}${r.cardinality ? ` <span class="dim">${esc(r.cardinality)}</span>` : ""}${r.label ? ` <span class="dim">${esc(r.label)}</span>` : ""}</li>`,
	);
	return card({
		ref: e.ref,
		name: e.name,
		iconName: ICONS[kind],
		meta: isRoot
			? chip(
					"aggregate root",
					"core",
					"Every change to the aggregate enters through the root.",
				)
			: "",
		description: e.description,
		body:
			attributeTable(e.attributes.values()) +
			(relations.length
				? `<ul class="relations">${relations.join("")}</ul>`
				: ""),
		highlight: isRoot,
	});
}

async function aggregatePage(
	input: RenderInput,
	problems: (ref: string) => Diagnostic[],
	a: Aggregate,
): Promise<RenderedPage> {
	const bc = a.boundedcontext;
	const entities = [...a.entities.values()].sort(
		(x, y) => Number(y.root) - Number(x.root),
	);
	const valueobjects = [...a.valueobjects.values()];
	const invariants = [...a.invariants.values()];
	const consumables = [...a.consumables.values()];
	const operations = consumables.filter((c) => c.type === "operation");
	const events = consumables.filter((c) => c.type === "event");
	const root = entities.find((e) => e.root);
	const aggregateRelationMap = ODSRelationMap.fromAggregate(a);
	const aggregateConsumableMap = ODSConsumableMap.fromAggregate(a);

	const body = `
${header({
	kind: "Aggregate",
	iconName: ICONS.aggregate,
	name: a.name,
	id: a.id,
	meta: [],
	description: a.description,
	crumbs: [
		["#", input.workspace.name],
		[bc.ref, bc.name],
	],
	facts: [
		[
			"Root",
			root
				? link(root.ref, root.name, ICONS.entity)
				: chip(
						"no root entity",
						"warn",
						"An aggregate needs exactly one root entity that guards its invariants.",
					),
		],
		["Context", link(bc.ref, bc.name, ICONS.boundedcontext)],
	],
})}
${section(
	"boundary",
	"Consistency boundary",
	"Everything inside changes together, in one transaction, through the root. References to other aggregates are by identity only.",
	await figure(
		input.svg,
		`${a.name} relation map`,
		relationMapToDigraph(aggregateRelationMap).toDot(),
		aggregateRelationMap.nodes.size,
		"No entities or value objects yet.",
	),
	problems(a.ref).filter((d) => d.ref === a.ref),
)}
${section(
	"structure",
	"Structure",
	"Entities have identity and a lifecycle; value objects are defined by their attributes and are replaced, not changed.",
	(entities.length
		? `<h3>Entities</h3><div class="grid wide">${entities.map((e) => structureCard(e, "entity")).join("")}</div>`
		: `<h3>Entities</h3>${empty("No entities. An aggregate needs a root entity.")}`) +
		(valueobjects.length
			? `<h3>Value objects</h3><div class="grid wide">${valueobjects.map((v) => structureCard(v, "valueobject")).join("")}</div>`
			: ""),
	[...entities, ...valueobjects].flatMap((e) => problems(e.ref)),
)}
${section(
	"invariants",
	"Invariants",
	"Rules that must hold after every change. The root enforces them; the elements they constrain are listed.",
	invariants.length
		? invariants
				.map((i) =>
					card({
						ref: i.ref,
						name: i.name,
						iconName: ICONS.invariant,
						description: i.description,
						body: i.targets.length
							? `<div class="pills">${i.targets.map((t) => `<span class="pill">${link(t.ref, nameOf(t))}</span>`).join("")}</div>`
							: `<p class="dim">Constrains the whole aggregate.</p>`,
					}),
				)
				.join("")
		: empty(
				"No invariants stated. If nothing can go wrong, is this really an aggregate?",
			),
	invariants.flatMap((i) => problems(i.ref)),
)}
${section(
	"behaviour",
	"Provides",
	"Operations express intent and are accepted or rejected by the root; events record what happened and cannot be refused. Internal ones never leave the context.",
	(operations.length
		? `<h3>Operations</h3>${operations.map((c) => consumableCard(c)).join("")}`
		: `<h3>Operations</h3>${empty("No operations. How does state change?")}`) +
		(events.length
			? `<h3>Events</h3>${events
					.map((e) =>
						consumableCard(
							e,
							operations.filter((o) => o.raisedEvents.includes(e)),
						),
					)
					.join("")}`
			: `<h3>Events</h3>${empty("No events. Nothing outside will ever know what happened here.")}`),
	consumables.flatMap((x) => problems(x.ref)),
)}
${section(
	"integration",
	"Integration",
	"What this aggregate relies on from elsewhere.",
	(await figure(
		input.svg,
		`${a.name} consumable map`,
		consumableMapToDigraph(aggregateConsumableMap).toDot(),
		aggregateConsumableMap.nodes.size,
		"Depends on nothing outside itself.",
	)) + `<h3>Consumes</h3>${consumesTable(a.consumptions)}`,
)}`;
	return {
		title: a.name,
		body,
		sections: [
			{ id: "boundary", label: "Consistency boundary" },
			{ id: "structure", label: "Structure" },
			{ id: "invariants", label: "Invariants" },
			{ id: "behaviour", label: "Provides" },
			{ id: "integration", label: "Integration" },
		],
	};
}

async function servicePage(
	input: RenderInput,
	problems: (ref: string) => Diagnostic[],
	s: Service,
): Promise<RenderedPage> {
	const bc = s.boundedcontext;
	const serviceConsumableMap = ODSConsumableMap.fromService(s);
	const body = `
${header({
	kind: "Service",
	iconName: ICONS.service,
	name: s.name,
	id: s.id,
	meta: [chip(s.type, "muted", SERVICE_TYPE[s.type])],
	description: s.description,
	crumbs: [
		["#", input.workspace.name],
		[bc.ref, bc.name],
	],
	facts: [
		["Kind", esc(SERVICE_TYPE[s.type] ?? s.type)],
		["Context", link(bc.ref, bc.name, ICONS.boundedcontext)],
	],
})}
${section(
	"integration",
	"Integration",
	"Operations this service opens to other contexts, and the consumables it depends on.",
	(await figure(
		input.svg,
		`${s.name} consumable map`,
		consumableMapToDigraph(serviceConsumableMap).toDot(),
		serviceConsumableMap.nodes.size,
		"Depends on nothing outside itself.",
	)) +
		`<h3>Provides</h3>${providesTable(s.consumables.values())}<h3>Consumes</h3>${consumesTable(s.consumptions)}`,
	problems(s.ref),
)}`;
	return {
		title: s.name,
		body,
		sections: [{ id: "integration", label: "Integration" }],
	};
}

/* ---------- routing ---------- */

const AGG = /^#\/boundedcontexts\/([^/]+)\/aggregates\/([^/]+)/;
const aggregateOf = (ws: Workspace, m: RegExpMatchArray) =>
	ws.boundedcontexts.get(m[1])?.aggregates.get(m[2]);
const memberOf = (kind: "entities" | "valueobjects" | "invariants") => [
	new RegExp(`${AGG.source}\\/${kind}\\/([^/]+)`),
	(ws: Workspace, m: RegExpMatchArray) => aggregateOf(ws, m)?.[kind].get(m[3]),
];

/** Deepest pattern first: every element with a ref gets its own page. */
const PAGE_PATTERNS: [
	RegExp,
	(ws: Workspace, m: RegExpMatchArray) => unknown,
][] = [
	[/^#\/teams\/([^/]+)/, (ws, m) => ws.teams.get(m[1])],
	[
		/^#\/domains\/([^/]+)\/subdomains\/([^/]+)/,
		(ws, m) => ws.domains.get(m[1])?.subdomains.get(m[2]),
	],
	[/^#\/domains\/([^/]+)/, (ws, m) => ws.domains.get(m[1])],
	...(["entities", "valueobjects", "invariants"] as const).map(
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

export async function renderPage(input: RenderInput): Promise<RenderedPage> {
	const problems = (ref: string) =>
		input.diagnostics.filter(
			(d) => d.ref === ref || d.ref.startsWith(`${ref}/`),
		);
	const { target, pageRef } = resolvePage(input.workspace, input.ref);
	const anchor =
		input.ref !== pageRef && input.ref !== "#" ? input.ref : undefined;
	const build: PageBuilder = async (i, p) => {
		const leaf = elementPage(i, p, target);
		if (leaf) return leaf;
		if (target instanceof DomainClass) return domainPage(i, p, target);
		if (target instanceof SubdomainClass) return subdomainPage(i, p, target);
		if (target instanceof BoundedContextClass) return contextPage(i, p, target);
		if (target instanceof AggregateClass) return aggregatePage(i, p, target);
		if (target instanceof ServiceClass) return servicePage(i, p, target);
		return workspacePage(i, p);
	};
	const page = await build(input, problems);
	return { ...page, anchor };
}
