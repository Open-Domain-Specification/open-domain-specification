import type {
	Attribute,
	BoundedContext,
	Consumable,
	Consumption,
	Diagnostic,
	Subdomain,
	Team,
	Workspace,
} from "@open-domain-specification/core";
import { marked } from "marked";

export type RenderInput = {
	workspace: Workspace;
	/** Ref of the element to show; leaf refs open their owner's page and scroll to the element. */
	ref: string;
	fileLabel: string;
	diagnostics: Diagnostic[];
	svg: (dot: string) => Promise<string>;
};

export type RenderedPage = {
	title: string;
	body: string;
	/** In-page sections for the side navigation. */
	sections: { id: string; label: string }[];
	/** Element to scroll to after load, when the ref pointed below the page's element. */
	anchor?: string;
};

/* ---------- small html helpers ---------- */

export const esc = (s: unknown): string =>
	String(s ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

/** Markdown to HTML. Raw HTML in the source is shown as text, so descriptions cannot inject markup. */
export const md = (text: string | undefined): string =>
	text
		? `<div class="md">${marked.parse(text.replace(/</g, "&lt;").replace(/>/g, "&gt;"), { async: false }) as string}</div>`
		: "";

export const icon = (name: string) => `<i class="codicon codicon-${name}"></i>`;

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

/**
 * A navigable link to another element. The placeholder href marks navigation
 * as host-owned: the extension's page script posts the ref back, while a
 * static host rewrites it with `resolveRefLinks`.
 */
export const link = (ref: string, label: string, iconName?: string) =>
	`<a class="ref" href="#" data-ref="${esc(ref)}">${iconName ? `${icon(iconName)} ` : ""}${esc(label)}</a>`;

/** Matches the anchors `link` emits, capturing the escaped ref; kept beside `link` so both sides change together. */
const REF_LINK = /<a class="ref" href="#" data-ref="([^"]*)"/g;

/** Rewrites every `link` in a rendered body with a host-resolved href (already URL-encoded, not HTML-escaped). */
export const resolveRefLinks = (
	body: string,
	href: (ref: string) => string,
): string =>
	body.replace(REF_LINK, (_, escaped: string) => {
		const ref = escaped.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
		return `<a class="ref" href="${esc(href(ref))}" data-ref="${escaped}"`;
	});

/** The "on this page" list; `page.js` scrolls to `data-section` targets. */
export const tocList = (sections: { id: string; label: string }[]) =>
	`<aside class="toc"><p class="toc-title">On this page</p><ul>${sections.map((s) => `<li><a href="#${esc(s.id)}" data-section="${esc(s.id)}">${esc(s.label)}</a></li>`).join("")}</ul></aside>`;

/** The diagram lightbox `page.js` opens when an SVG is clicked. */
export const diagramModal = () => `<div id="diagram-modal" class="modal" hidden>
	<div class="modal-backdrop"></div>
	<div class="modal-content">
		<button class="icon modal-close" title="Close"><i class="codicon codicon-close"></i></button>
		<div class="modal-body"></div>
	</div>
</div>`;

export const chip = (
	label: string,
	tone: "" | "core" | "supporting" | "generic" | "warn" | "muted" = "",
	title?: string,
) =>
	`<span class="chip ${tone}"${title ? ` title="${esc(title)}"` : ""}>${esc(label)}</span>`;

/** Display name of any referenceable element, falling back to its ref. */
export const nameOf = (t: { ref: string; name?: string }): string =>
	t.name ?? t.ref;

export const idChip = (id: string) =>
	`<code class="id" title="id">${esc(id)}</code>`;

export function section(
	id: string,
	title: string,
	lead: string,
	body: string,
	problems: Diagnostic[] = [],
): string {
	return `<section id="${esc(id)}">
	<header><h2>${esc(title)}</h2><p class="lead">${esc(lead)}</p></header>
	${problemsBlock(problems)}
	${body}
</section>`;
}

export function problemsBlock(problems: Diagnostic[]): string {
	if (problems.length === 0) return "";
	return `<ul class="problems">${problems
		.map(
			(d) =>
				`<li class="${d.severity}">${icon(d.severity)} <span class="rule">${esc(d.rule)}</span> ${esc(d.message)} ${link(d.ref, "go to")}</li>`,
		)
		.join("")}</ul>`;
}

export const empty = (text: string) => `<p class="empty">${esc(text)}</p>`;

export function card(opts: {
	ref: string;
	name: string;
	iconName: string;
	meta?: string;
	description?: string;
	body?: string;
	highlight?: boolean;
}): string {
	return `<article class="card${opts.highlight ? " highlight" : ""}" id="${esc(opts.ref)}">
	<div class="card-head">${link(opts.ref, opts.name, opts.iconName)}${opts.meta ? `<span class="meta">${opts.meta}</span>` : ""}</div>
	${md(opts.description)}
	${opts.body ?? ""}
</article>`;
}

export async function figure(
	svg: RenderInput["svg"],
	caption: string,
	dot: string,
	nodeCount: number,
	emptyText: string,
): Promise<string> {
	if (nodeCount === 0) return empty(emptyText);
	try {
		return `<figure class="diagram"><div class="canvas">${await svg(dot)}</div><figcaption>${esc(caption)}</figcaption></figure>`;
	} catch (e) {
		return `<p class="empty">Diagram could not be rendered: ${esc(e instanceof Error ? e.message : e)}</p>`;
	}
}

/* ---------- shared fragments ---------- */

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

export function attributeTable(attributes: Iterable<Attribute>): string {
	const rows = [...attributes];
	if (rows.length === 0) return "";
	return `<table class="attrs"><thead><tr><th></th><th>Attribute</th><th>Type</th><th>Description</th></tr></thead><tbody>${rows
		.map(
			(a) =>
				`<tr id="${esc(a.ref)}"><td class="k">${a.identity ? `<span title="identity">${icon("key")}</span>` : ""}</td><td>${esc(a.name)}</td><td><code>${a.valueobject ? link(a.valueobject.ref, a.type) : esc(a.type)}</code></td><td>${esc(a.description ?? "")}</td></tr>`,
		)
		.join("")}</tbody></table>`;
}

/** Icon for a consumable by kind: events broadcast, operations act. */
export const consumableIcon = (c: Consumable) =>
	c.type === "event" ? ICONS.event : ICONS.command;

/** Kind, visibility and role chips for a consumable. */
export function consumableChips(c: Consumable): string {
	return [
		chip(c.type, "muted"),
		c.internal
			? chip(
					"internal",
					"warn",
					"Stays inside its context; other contexts cannot consume it.",
				)
			: "",
		c.pattern ? chip(c.pattern, "muted") : "",
	]
		.filter(Boolean)
		.join(" ");
}

export function consumableRow(c: Consumable): string {
	const consumers = c.consumptions
		.map((x) => link(x.consumer.ref, x.consumer.name))
		.join(", ");
	const raises = c.raisedEvents
		.map((e) => link(e.ref, e.name, ICONS.event))
		.join(", ");
	return `<tr id="${esc(c.ref)}"><td>${link(c.ref, c.name, consumableIcon(c))}</td><td>${consumableChips(c)}</td><td>${c.schema ? link(c.schema.ref, c.schema.name, ICONS.schema) : '<span class="dim">none</span>'}</td><td>${raises || '<span class="dim">–</span>'}</td><td>${c.internal ? '<span class="dim">internal</span>' : consumers || '<span class="dim">none</span>'}</td></tr>`;
}

export function providesTable(consumables: Iterable<Consumable>): string {
	const rows = [...consumables];
	if (rows.length === 0) return empty("Provides nothing.");
	return `<table><thead><tr><th>Consumable</th><th>Kind</th><th>Schema</th><th>Raises</th><th>Consumed by</th></tr></thead><tbody>${rows.map(consumableRow).join("")}</tbody></table>`;
}

/** A consumable as a card: chips, schema attributes, what it raises or is raised by, who consumes it. */
export function consumableCard(
	c: Consumable,
	raisedBy: Consumable[] = [],
): string {
	const lines: string[] = [];
	if (c.raisedEvents.length)
		lines.push(
			`<span class="dim">raises</span> ${c.raisedEvents.map((e) => link(e.ref, e.name, ICONS.event)).join(", ")}`,
		);
	if (raisedBy.length)
		lines.push(
			`<span class="dim">raised by</span> ${raisedBy.map((o) => link(o.ref, o.name, ICONS.command)).join(", ")}`,
		);
	if (!c.internal)
		lines.push(
			`<span class="dim">consumed by</span> ${c.consumptions.map((x) => link(x.consumer.ref, x.consumer.name)).join(", ") || '<span class="dim">nobody yet</span>'}`,
		);
	return card({
		ref: c.ref,
		name: c.name,
		iconName: consumableIcon(c),
		meta: consumableChips(c),
		description: c.description,
		body:
			(c.schema
				? `<p class="dim">${icon(ICONS.schema)} ${link(c.schema.ref, c.schema.name)}</p>${attributeTable(c.schema.attributes.values())}`
				: "") +
			(lines.length ? `<p class="policy">${lines.join("<br>")}</p>` : ""),
	});
}

export function consumesTable(consumptions: Consumption[]): string {
	if (consumptions.length === 0)
		return empty("Depends on nothing outside itself.");
	return `<table><thead><tr><th>Consumable</th><th>Provider</th><th>Context</th><th>Protection</th></tr></thead><tbody>${consumptions
		.map(
			(x) =>
				`<tr><td>${link(x.consumable.ref, x.consumable.name, ICONS.consumption)}</td><td>${link(x.consumable.provider.ref, x.consumable.provider.name)}</td><td>${link(x.consumable.provider.boundedcontext.ref, x.consumable.provider.boundedcontext.name, ICONS.boundedcontext)}</td><td>${x.pattern ? chip(x.pattern, "muted") : '<span class="dim">unspecified</span>'}</td></tr>`,
		)
		.join("")}</tbody></table>`;
}

export function contextChip(bc: BoundedContext): string {
	return `<span class="pill">${link(bc.ref, bc.name, ICONS.boundedcontext)}${bc.bigBallOfMud ? chip("big ball of mud", "warn") : ""}</span>`;
}

export function subdomainCard(s: Subdomain): string {
	const serving = [...s.boundedcontexts.values()];
	return card({
		ref: s.ref,
		name: s.name,
		iconName: ICONS.subdomain,
		meta: chip(s.type, s.type, SUBDOMAIN_TYPE[s.type]),
		description: s.description,
		body: serving.length
			? `<p class="dim">Served by</p><div class="pills">${serving.map(contextChip).join("")}</div>`
			: `<p class="empty">No bounded context serves this subdomain yet.</p>`,
	});
}

export function teamLine(t: Team | undefined): string {
	return t
		? link(t.ref, t.name, ICONS.team)
		: `<span class="dim">no owning team</span>`;
}

/* ---------- header ---------- */

export function header(opts: {
	kind: string;
	iconName: string;
	name: string;
	id: string;
	meta: string[];
	description?: string;
	crumbs: [string, string][];
	facts?: [string, string][];
}): string {
	return `<header class="page-head">
	<nav class="crumbs">${opts.crumbs.map(([ref, label]) => `${link(ref, label)}<span class="sep">›</span>`).join("")}<span class="kind">${esc(opts.kind)}</span></nav>
	<h1>${icon(opts.iconName)} ${esc(opts.name)} ${idChip(opts.id)} ${opts.meta.join(" ")}</h1>
	${md(opts.description)}
	${opts.facts?.length ? `<dl class="facts">${opts.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join("")}</dl>` : ""}
</header>`;
}
