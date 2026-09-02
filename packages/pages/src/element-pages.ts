import {
	type Aggregate,
	type Attribute,
	Consumable,
	DataSchema,
	type Diagnostic,
	Entity,
	GlossaryTerm,
	Invariant,
	Policy,
	Team,
	ValueObject,
	type Workspace,
} from "@open-domain-specification/core";
import {
	attributeTable,
	card,
	chip,
	consumableChips,
	consumableIcon,
	consumesTable,
	empty,
	esc,
	header,
	ICONS,
	icon,
	link,
	nameOf,
	type RenderedPage,
	type RenderInput,
	section,
	subdomainCard,
} from "./html";

type Problems = (ref: string) => Diagnostic[];

/* ---------- shared lookups across the workspace ---------- */

function* aggregatesOf(ws: Workspace): Iterable<Aggregate> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.aggregates.values();
}

function* policiesOf(ws: Workspace): Iterable<Policy> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.policies.values();
}

function* consumablesOf(ws: Workspace): Iterable<Consumable> {
	for (const bc of ws.boundedcontexts.values()) {
		for (const m of [...bc.aggregates.values(), ...bc.services.values()])
			yield* m.consumables.values();
	}
}

function* termsOf(ws: Workspace): Iterable<GlossaryTerm> {
	for (const bc of ws.boundedcontexts.values()) yield* bc.glossary.values();
}

/** Attributes anywhere in the workspace whose type is this value object. */
function usagesOf(ws: Workspace, vo: ValueObject): Attribute[] {
	const out: Attribute[] = [];
	for (const a of aggregatesOf(ws)) {
		for (const o of [...a.entities.values(), ...a.valueobjects.values()])
			for (const attr of o.attributes.values())
				if (attr.valueobject === vo) out.push(attr);
	}
	for (const bc of ws.boundedcontexts.values())
		for (const s of bc.schemas.values())
			for (const attr of s.attributes.values())
				if (attr.valueobject === vo) out.push(attr);
	return out;
}

function termsEmbodying(
	ws: Workspace,
	target: { ref: string },
): GlossaryTerm[] {
	return [...termsOf(ws)].filter((t) => t.embodiedBy?.ref === target.ref);
}

function languageSection(ws: Workspace, target: { ref: string }): string {
	const terms = termsEmbodying(ws, target);
	return section(
		"language",
		"In the ubiquitous language",
		"Glossary terms this element embodies. If the team calls it something else, the model has drifted from the language.",
		terms.length
			? `<div class="pills">${terms.map((t) => `<span class="pill">${link(t.ref, t.name, ICONS.term)}</span>`).join("")}</div>`
			: empty("No glossary term names this element."),
	);
}

function ownerCrumbs(ws: Workspace, aggregate: Aggregate): [string, string][] {
	return [
		["#", ws.name],
		[aggregate.boundedcontext.ref, aggregate.boundedcontext.name],
		[aggregate.ref, aggregate.name],
	];
}

const attributesSection = (attributes: Iterable<Attribute>, lead: string) =>
	section(
		"attributes",
		"Attributes",
		lead,
		attributeTable(attributes) || empty("No attributes."),
	);

/* ---------- pages ---------- */

function entityPage(
	input: RenderInput,
	problems: Problems,
	e: Entity,
): RenderedPage {
	const ws = input.workspace;
	const a = e.aggregate;
	const incoming = [...a.entities.values(), ...a.valueobjects.values()]
		.flatMap((o) => o.relations)
		.filter((r) => r.target === e);
	const invariants = [...a.invariants.values()].filter((i) =>
		i.targets.includes(e),
	);
	const body = `
${header({
	kind: "Entity",
	iconName: ICONS.entity,
	name: e.name,
	id: e.id,
	meta: e.root
		? [
				chip(
					"aggregate root",
					"core",
					"Every change to the aggregate enters through the root, which enforces the invariants.",
				),
			]
		: [],
	description: e.description,
	crumbs: ownerCrumbs(ws, a),
	facts: [
		["Aggregate", link(a.ref, a.name, ICONS.aggregate)],
		[
			"Identity",
			[...e.attributes.values()]
				.filter((x) => x.identity)
				.map((x) => `<code>${esc(x.name)}</code>`)
				.join(", ") || `<span class="dim">no identity attribute marked</span>`,
		],
	],
})}
${attributesSection(
	e.attributes.values(),
	"An entity is known by its identity, not its attributes; the key marks what identifies it.",
)}
${section(
	"relations",
	"Relations",
	"What this entity holds or points at, and what points back. References across aggregates carry identity only.",
	(e.relations.length
		? `<h3>Outgoing</h3><ul class="relations">${e.relations.map((r) => `<li>${chip(r.relation, "muted")} ${link(r.target.ref, r.target.name, r.target instanceof Entity ? ICONS.entity : ICONS.valueobject)}${r.cardinality ? ` <span class="dim">${esc(r.cardinality)}</span>` : ""}${r.label ? ` <span class="dim">${esc(r.label)}</span>` : ""}</li>`).join("")}</ul>`
		: "") +
		(incoming.length
			? `<h3>Incoming</h3><ul class="relations">${incoming.map((r) => `<li>${link(r.source.ref, r.source.name, r.source instanceof Entity ? ICONS.entity : ICONS.valueobject)} ${chip(r.relation, "muted")} this${r.cardinality ? ` <span class="dim">${esc(r.cardinality)}</span>` : ""}</li>`).join("")}</ul>`
			: "") || empty("No relations."),
	problems(e.ref),
)}
${section(
	"invariants",
	"Constrained by",
	"Invariants that name this entity explicitly. The root enforces them on every change.",
	invariants.length
		? invariants
				.map((i) =>
					card({
						ref: i.ref,
						name: i.name,
						iconName: ICONS.invariant,
						description: i.description,
					}),
				)
				.join("")
		: empty("No invariant names this entity."),
)}
${languageSection(ws, e)}`;
	return {
		title: e.name,
		body,
		sections: [
			{ id: "attributes", label: "Attributes" },
			{ id: "relations", label: "Relations" },
			{ id: "invariants", label: "Constrained by" },
			{ id: "language", label: "Language" },
		],
	};
}

function valueObjectPage(
	input: RenderInput,
	problems: Problems,
	v: ValueObject,
): RenderedPage {
	const ws = input.workspace;
	const a = v.aggregate;
	const usages = usagesOf(ws, v);
	const invariants = [...a.invariants.values()].filter((i) =>
		i.targets.includes(v),
	);
	const body = `
${header({
	kind: "Value Object",
	iconName: ICONS.valueobject,
	name: v.name,
	id: v.id,
	meta: [],
	description: v.description,
	crumbs: ownerCrumbs(ws, a),
	facts: [["Aggregate", link(a.ref, a.name, ICONS.aggregate)]],
})}
${attributesSection(
	v.attributes.values(),
	"A value object is its attributes. Two with the same values are the same thing; change one and you have a new one.",
)}
${section(
	"usage",
	"Used as a type by",
	"Attributes across the workspace whose type is this value object.",
	usages.length
		? `<table><thead><tr><th>Attribute</th><th>On</th><th>In</th></tr></thead><tbody>${usages
				.map((u) => {
					const owner = u.owner as unknown as {
						ref: string;
						name: string;
						aggregate?: Aggregate;
						boundedcontext?: { ref: string; name: string };
					};
					return `<tr><td><code>${esc(u.name)}</code></td><td>${link(owner.ref, owner.name)}</td><td>${owner.aggregate ? link(owner.aggregate.ref, owner.aggregate.name, ICONS.aggregate) : owner.boundedcontext ? link(owner.boundedcontext.ref, owner.boundedcontext.name, ICONS.boundedcontext) : ""}</td></tr>`;
				})
				.join("")}</tbody></table>`
		: empty("Nothing uses this value object as a type yet."),
	problems(v.ref),
)}
${section(
	"relations",
	"Relations",
	"Value objects may hold other value objects; they should not point at entities in other aggregates.",
	v.relations.length
		? `<ul class="relations">${v.relations.map((r) => `<li>${chip(r.relation, "muted")} ${link(r.target.ref, r.target.name)}${r.cardinality ? ` <span class="dim">${esc(r.cardinality)}</span>` : ""}</li>`).join("")}</ul>`
		: empty("No relations."),
)}
${section(
	"invariants",
	"Constrained by",
	"Invariants that name this value object.",
	invariants.length
		? invariants
				.map((i) =>
					card({
						ref: i.ref,
						name: i.name,
						iconName: ICONS.invariant,
						description: i.description,
					}),
				)
				.join("")
		: empty("No invariant names this value object."),
)}
${languageSection(ws, v)}`;
	return {
		title: v.name,
		body,
		sections: [
			{ id: "attributes", label: "Attributes" },
			{ id: "usage", label: "Used by" },
			{ id: "relations", label: "Relations" },
			{ id: "invariants", label: "Constrained by" },
			{ id: "language", label: "Language" },
		],
	};
}

function invariantPage(
	input: RenderInput,
	problems: Problems,
	i: Invariant,
): RenderedPage {
	const ws = input.workspace;
	const a = i.aggregate;
	const body = `
${header({
	kind: "Invariant",
	iconName: ICONS.invariant,
	name: i.name,
	id: i.id,
	meta: [],
	description: i.description,
	crumbs: ownerCrumbs(ws, a),
	facts: [["Enforced by", link(a.ref, a.name, ICONS.aggregate)]],
})}
${section(
	"constrains",
	"Constrains",
	"The elements this rule is about. An invariant that spans aggregates cannot be guaranteed in one transaction.",
	i.targets.length
		? `<div class="grid">${i.targets
				.map((t) =>
					card({
						ref: t.ref,
						name: nameOf(t),
						iconName: t instanceof Entity ? ICONS.entity : ICONS.valueobject,
						description: (t as { description?: string }).description,
					}),
				)
				.join("")}</div>`
		: empty("Applies to the aggregate as a whole."),
	problems(i.ref),
)}
${languageSection(ws, i)}`;
	return {
		title: i.name,
		body,
		sections: [
			{ id: "constrains", label: "Constrains" },
			{ id: "language", label: "Language" },
		],
	};
}

function schemaPage(
	input: RenderInput,
	problems: Problems,
	s: DataSchema,
): RenderedPage {
	const ws = input.workspace;
	const bc = s.boundedcontext;
	const carriers = s.consumables;
	const body = `
${header({
	kind: "Schema",
	iconName: ICONS.schema,
	name: s.name,
	id: s.id,
	meta: [],
	description: s.description,
	crumbs: [
		["#", ws.name],
		[bc.ref, bc.name],
	],
	facts: [["Published by", link(bc.ref, bc.name, ICONS.boundedcontext)]],
})}
${attributesSection(
	s.attributes.values(),
	"The shape a consumable carries. Consumers depend on every attribute here, so removing one is a breaking change.",
)}
${section(
	"carriers",
	"Carried by",
	"Consumables that use this schema as their payload. A command and the event it raises often share one.",
	carriers.length
		? `<table><thead><tr><th>Consumable</th><th>Kind</th><th>Provider</th></tr></thead><tbody>${carriers.map((c) => `<tr><td>${link(c.ref, c.name, consumableIcon(c))}</td><td>${consumableChips(c)}</td><td>${link(c.provider.ref, c.provider.name)}</td></tr>`).join("")}</tbody></table>`
		: empty("Nothing carries this schema yet."),
	problems(s.ref),
)}
${languageSection(ws, s)}`;
	return {
		title: s.name,
		body,
		sections: [
			{ id: "attributes", label: "Attributes" },
			{ id: "carriers", label: "Carried by" },
			{ id: "language", label: "Language" },
		],
	};
}

function policyPage(
	input: RenderInput,
	problems: Problems,
	p: Policy,
): RenderedPage {
	const ws = input.workspace;
	const bc = p.boundedcontext;
	const consumableRefCard = (c: Consumable) =>
		card({
			ref: c.ref,
			name: c.name,
			iconName: consumableIcon(c),
			meta: `${consumableChips(c)} ${link(c.provider.ref, c.provider.name)} · ${link(c.boundedcontext.ref, c.boundedcontext.name, ICONS.boundedcontext)}`,
			description: c.description,
		});
	const eventCard = consumableRefCard;
	const commandCard = consumableRefCard;
	const body = `
${header({
	kind: "Policy",
	iconName: ICONS.policy,
	name: p.name,
	id: p.id,
	meta: [],
	description: p.description,
	crumbs: [
		["#", ws.name],
		[bc.ref, bc.name],
	],
	facts: [["Lives in", link(bc.ref, bc.name, ICONS.boundedcontext)]],
})}
${section(
	"when",
	"When",
	"The events that trigger this policy. Events from other contexts arrive through a consumption.",
	p.events.length
		? `<div class="grid">${p.events.map(eventCard).join("")}</div>`
		: empty("Triggered by nothing."),
	problems(p.ref),
)}
${section(
	"then",
	"Then",
	"The operations the policy issues. Whenever X happens, do Y.",
	p.commands.length
		? `<div class="grid">${p.commands.map(commandCard).join("")}</div>`
		: empty("Issues nothing."),
)}
${languageSection(ws, p)}`;
	return {
		title: p.name,
		body,
		sections: [
			{ id: "when", label: "When" },
			{ id: "then", label: "Then" },
			{ id: "language", label: "Language" },
		],
	};
}

function termPage(
	input: RenderInput,
	problems: Problems,
	t: GlossaryTerm,
): RenderedPage {
	const ws = input.workspace;
	const bc = t.boundedcontext;
	const embodied = t.embodiedBy as
		| { ref: string; name?: string; description?: string }
		| undefined;
	const sameWord = [...termsOf(ws)].filter(
		(x) => x !== t && x.name.toLowerCase() === t.name.toLowerCase(),
	);
	const body = `
${header({
	kind: "Glossary Term",
	iconName: ICONS.term,
	name: t.name,
	id: t.id,
	meta: t.aliases.map((a) => chip(a, "muted", "alias")),
	description: t.definition,
	crumbs: [
		["#", ws.name],
		[bc.ref, bc.name],
	],
	facts: [["Language of", link(bc.ref, bc.name, ICONS.boundedcontext)]],
})}
${section(
	"embodied",
	"Embodied by",
	"The model element that carries this meaning. Language and model should say the same thing.",
	embodied
		? card({
				ref: embodied.ref,
				name: embodied.name ?? embodied.ref,
				iconName: "symbol-misc",
				description: embodied.description,
			})
		: empty(
				"Not modelled. Either the word is not needed, or the model is missing something.",
			),
	problems(t.ref),
)}
${section(
	"elsewhere",
	"Same word elsewhere",
	"The same term in other contexts. Different definitions are expected; that is what bounded contexts are for.",
	sameWord.length
		? `<table><thead><tr><th>Context</th><th>Definition</th></tr></thead><tbody>${sameWord.map((x) => `<tr><td>${link(x.boundedcontext.ref, x.boundedcontext.name, ICONS.boundedcontext)}</td><td>${link(x.ref, x.definition)}</td></tr>`).join("")}</tbody></table>`
		: empty("Only this context uses the word."),
)}`;
	return {
		title: t.name,
		body,
		sections: [
			{ id: "embodied", label: "Embodied by" },
			{ id: "elsewhere", label: "Elsewhere" },
		],
	};
}

function consumablePage(
	input: RenderInput,
	problems: Problems,
	c: Consumable,
): RenderedPage {
	const ws = input.workspace;
	const provider = c.provider;
	const bc = provider.boundedcontext;
	const isEvent = c.type === "event";
	const raisedBy = [...consumablesOf(ws)].filter((o) =>
		o.raisedEvents.includes(c),
	);
	const policies = [...policiesOf(ws)].filter((p) =>
		isEvent ? p.events.includes(c) : p.commands.includes(c),
	);
	const body = `
${header({
	kind: isEvent ? "Event" : "Operation",
	iconName: consumableIcon(c),
	name: c.name,
	id: c.id,
	meta: [consumableChips(c)],
	description: c.description,
	crumbs: [
		["#", ws.name],
		[bc.ref, bc.name],
		[provider.ref, provider.name],
	],
	facts: [
		[
			"Provided by",
			link(
				provider.ref,
				provider.name,
				"entities" in provider ? ICONS.aggregate : ICONS.service,
			),
		],
		[
			"Payload",
			c.schema
				? link(c.schema.ref, c.schema.name, ICONS.schema)
				: `<span class="dim">no schema</span>`,
		],
	],
})}
${section(
	"payload",
	"Payload",
	isEvent
		? "An event is a fact in the past tense. Carry what a consumer needs to react without asking back."
		: "An operation is an intent. The provider may refuse it; carry what it needs to decide.",
	c.schema
		? `<p class="dim">${link(c.schema.ref, c.schema.name, ICONS.schema)}</p>${attributeTable(c.schema.attributes.values()) || empty("The schema has no attributes.")}`
		: empty("No schema declared."),
	problems(c.ref),
)}
${
	isEvent
		? section(
				"raised",
				"Raised by",
				"Operations whose success produces this event.",
				raisedBy.length
					? `<div class="pills">${raisedBy.map((o) => `<span class="pill">${link(o.ref, o.name, ICONS.command)}</span>`).join("")}</div>`
					: empty("No operation raises this event. Is it ever emitted?"),
			)
		: section(
				"raises",
				"Raises",
				"Events produced when the operation is accepted.",
				c.raisedEvents.length
					? `<div class="pills">${c.raisedEvents.map((e) => `<span class="pill">${link(e.ref, e.name, ICONS.event)}</span>`).join("")}</div>`
					: empty(
							"Raises nothing. Its effect is invisible to the rest of the system.",
						),
			)
}
${section(
	"policies",
	isEvent ? "Reacted to by" : "Issued by policies",
	isEvent
		? "Policies triggered by this event."
		: "Policies that issue this operation in reaction to events.",
	policies.length
		? policies
				.map((p) =>
					card({
						ref: p.ref,
						name: p.name,
						iconName: ICONS.policy,
						meta: link(
							p.boundedcontext.ref,
							p.boundedcontext.name,
							ICONS.boundedcontext,
						),
						description: p.description,
					}),
				)
				.join("")
		: empty(
				isEvent
					? "No policy reacts to this event."
					: "No policy issues this operation; it comes from users or application services.",
			),
)}
${section(
	"consumers",
	"Consumed by",
	c.internal
		? "Internal consumables stay inside their context, so nothing outside can consume them."
		: "Downstream consumers and how each protects its model from this upstream.",
	c.internal
		? empty("Internal to the context.")
		: consumesTable(c.consumptions),
)}
${languageSection(ws, c)}`;
	return {
		title: c.name,
		body,
		sections: [
			{ id: "payload", label: "Payload" },
			isEvent
				? { id: "raised", label: "Raised by" }
				: { id: "raises", label: "Raises" },
			{ id: "policies", label: isEvent ? "Reacted to by" : "Issued by" },
			{ id: "consumers", label: "Consumed by" },
			{ id: "language", label: "Language" },
		],
	};
}

function teamPage(
	input: RenderInput,
	problems: Problems,
	t: Team,
): RenderedPage {
	const ws = input.workspace;
	const owned = [...ws.boundedcontexts.values()].filter((bc) => bc.team === t);
	const subdomains = [...new Set(owned.flatMap((bc) => [...bc.subdomains]))];
	const body = `
${header({
	kind: "Team",
	iconName: ICONS.team,
	name: t.name,
	id: t.id,
	meta: t.homepage
		? [`<a href="${esc(t.homepage)}">${icon("link-external")} homepage</a>`]
		: [],
	description: t.description,
	crumbs: [["#", ws.name]],
})}
${section(
	"owns",
	"Owns",
	"Bounded contexts this team is responsible for. One team per context keeps the model coherent; a context with two owners has two models.",
	owned.length
		? `<div class="grid">${owned
				.map((bc) =>
					card({
						ref: bc.ref,
						name: bc.name,
						iconName: ICONS.boundedcontext,
						meta: bc.bigBallOfMud ? chip("big ball of mud", "warn") : "",
						description: bc.description,
						body: `<p class="counts">${bc.aggregates.size} aggregates · ${bc.services.size} services</p>`,
					}),
				)
				.join("")}</div>`
		: empty("Owns no bounded context."),
	problems(t.ref),
)}
${section(
	"problem",
	"Problem space covered",
	"The subdomains reached through the contexts this team owns. A team spread across core and generic work has split priorities.",
	subdomains.length
		? `<div class="grid">${subdomains.map(subdomainCard).join("")}</div>`
		: empty("No subdomains reached."),
)}`;
	return {
		title: t.name,
		body,
		sections: [
			{ id: "owns", label: "Owns" },
			{ id: "problem", label: "Problem space" },
		],
	};
}

/** Pages for the leaf elements; returns undefined for anything handled by render.ts. */
export function elementPage(
	input: RenderInput,
	problems: Problems,
	target: unknown,
): RenderedPage | undefined {
	if (target instanceof Entity) return entityPage(input, problems, target);
	if (target instanceof ValueObject)
		return valueObjectPage(input, problems, target);
	if (target instanceof Invariant)
		return invariantPage(input, problems, target);
	if (target instanceof DataSchema) return schemaPage(input, problems, target);
	if (target instanceof Policy) return policyPage(input, problems, target);
	if (target instanceof GlossaryTerm) return termPage(input, problems, target);
	if (target instanceof Consumable)
		return consumablePage(input, problems, target);
	if (target instanceof Team) return teamPage(input, problems, target);
	return undefined;
}
