import { DISPOSITION, LINK_KINDS } from "./families";
import type {
	Choice,
	EvidenceValue,
	FieldError,
	FieldValue,
	FormField,
	FormInit,
	FormToHost,
	HostToForm,
	Option,
	OwnerInfo,
	ReadOnlyRow,
	RejectionRow,
} from "./form-protocol";

/**
 * The form as an HTML string, vscode-free and DOM-free: `renderDocument` is the
 * whole page the panel sets, `renderBody` is the part the host replaces after a
 * change (the client never builds a field). Every label, name, detail, file and
 * message is element or file data a person typed, so each one goes through
 * `esc` before it is written into the markup, in text and in attributes alike.
 *
 * The DOM contract (a journey addresses controls by label):
 * - `form[data-ods-form][data-mode][data-family]`; every control has a
 *   `<label for>` with exactly `FormField.label`; a select is `#f-<name>`,
 *   its options carry the choice token as value and read `label — detail · file`;
 * - a list of choices is a `fieldset` with a `legend` and one checkbox each;
 * - read-only properties are `dl.readonly` rows (label, value, reason);
 * - `div[role=alert][data-field=<name>]` beside each control, one form-level;
 * - a reason a field or choice is not offered is visible text beside it, named
 *   by `aria-describedby`, and the value it holds stays selected.
 */

/** HTML-escapes text for element content and for quoted attribute values. */
export function esc(value: unknown): string {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export type RenderEnv = {
	nonce: string;
	cspSource: string;
	scriptUri: string;
	styleUri: string;
};

export const contentSecurityPolicy = (cspSource: string, nonce: string) =>
	`default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}'`;

/** Only these four messages leave the page; anything else is dropped, never forwarded. */
export function asFormMessage(raw: unknown): FormToHost | undefined {
	if (typeof raw !== "object" || raw === null) return undefined;
	const m = raw as Record<string, unknown>;
	if (typeof m.requestId !== "string") return undefined;
	const requestId = m.requestId;
	const isValues = (v: unknown): v is Record<string, FieldValue> =>
		typeof v === "object" && v !== null && !Array.isArray(v);
	switch (m.type) {
		case "ready":
			return { type: "ready", requestId };
		case "cancel":
			return { type: "cancel", requestId };
		case "change":
			if (typeof m.field !== "string" || !isValues(m.values)) return undefined;
			if (m.owner !== undefined && typeof m.owner !== "string")
				return undefined;
			return {
				type: "change",
				requestId,
				field: m.field,
				values: m.values,
				...(m.owner !== undefined ? { owner: m.owner as string } : {}),
			};
		case "save":
			if (!isValues(m.values)) return undefined;
			if (m.owner !== undefined && typeof m.owner !== "string")
				return undefined;
			return {
				type: "save",
				requestId,
				values: m.values,
				...(m.owner !== undefined ? { owner: m.owner as string } : {}),
			};
		default:
			return undefined;
	}
}

/** Host to client, after the host has turned the protocol into what the page can apply. */
export type ToWebview =
	| { type: "body"; html: string }
	| {
			type: "errors";
			form: string[];
			fields: Record<string, string[]>;
	  };

/** What the page shows of one host message; `saved` closes the panel instead, so it has none. */
export function toWebview(msg: HostToForm): ToWebview | undefined {
	switch (msg.type) {
		case "init":
			return {
				type: "body",
				html: renderBody(msg.fields, msg.owner, msg.notes),
			};
		case "refresh":
			return {
				type: "body",
				html: renderBody(msg.fields, msg.owner, msg.notes),
			};
		case "validation":
			return errorsOf([], msg.errors);
		case "refused":
			return errorsOf([`${msg.message} ${msg.action}`], msg.errors);
		default:
			return undefined;
	}
}

function errorsOf(form: string[], errors: FieldError[]): ToWebview {
	const fields: Record<string, string[]> = {};
	const formLevel = [...form];
	for (const e of errors) {
		if (e.field === null) formLevel.push(e.message);
		else fields[e.field] = [...(fields[e.field] ?? []), e.message];
	}
	return { type: "errors", form: formLevel, fields };
}

// ---------------------------------------------------------------- the page

export function renderDocument(init: FormInit, env: RenderEnv): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${esc(contentSecurityPolicy(env.cspSource, env.nonce)).replaceAll("&#39;", "'")}">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${esc(env.styleUri)}">
<title>${esc(init.title)}</title>
</head>
<body>
<main>
${renderForm(init)}
</main>
<script nonce="${esc(env.nonce)}" src="${esc(env.scriptUri)}"></script>
</body>
</html>`;
}

export function renderForm(init: FormInit): string {
	return `<form data-ods-form data-mode="${esc(init.mode)}" data-family="${esc(init.family)}" data-request-id="${esc(init.requestId)}" aria-labelledby="form-title" novalidate>
<h1 id="form-title">${esc(init.title)}</h1>
<div role="alert" class="error form-error" data-field="" id="e-form"></div>
${renderReadOnly(init.readOnly)}<div data-body>
${renderBody(init.fields, init.owner, init.notes)}
</div>
<div class="actions">
<button type="submit">Save</button>
<button type="button" data-action="cancel">Cancel</button>
</div>
</form>`;
}

function renderReadOnly(rows: ReadOnlyRow[]): string {
	if (rows.length === 0) return "";
	return `<dl class="readonly">
${rows
	.map(
		(r) =>
			`<div class="row"><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd><dd class="reason">${esc(r.reason)}</dd></div>`,
	)
	.join("\n")}
</dl>
`;
}

/** The part of the form the host replaces on every refresh: notes, the file written to, and the visible fields. */
export function renderBody(
	fields: FormField[],
	owner: OwnerInfo,
	notes: string[],
): string {
	return [
		renderNotes(notes),
		renderOwner(owner),
		...fields.filter((f) => f.visible).map(renderField),
	]
		.filter(Boolean)
		.join("\n");
}

function renderNotes(notes: string[]): string {
	if (notes.length === 0) return "";
	return `<ul class="notes" aria-label="Notes">
${notes.map((n) => `<li>${esc(n)}</li>`).join("\n")}
</ul>`;
}

function renderOwner(owner: OwnerInfo): string {
	const choices = owner.ownerChoices;
	if (!choices?.length)
		return `<p class="owner" data-owner-file="${esc(owner.file)}">This change is written to <code>${esc(owner.file)}</code> and to no other file.</p>`;
	const options = choices
		.map(
			(c) =>
				`<option value="${esc(c.value)}"${c.value === owner.file ? " selected" : ""}>${esc(choiceText(c))}</option>`,
		)
		.join("\n");
	return `<div class="field" data-name="owner" data-control="owner" data-refresh="true">
<label for="f-owner">File to write to</label>
<p class="help" id="h-owner">A relationship may be declared in any file of the folder. Only that file is changed.</p>
<select id="f-owner" name="owner" data-owner aria-describedby="h-owner e-owner">
${options}
</select>
<div role="alert" class="error" data-field="owner" id="e-owner"></div>
</div>`;
}

// ---------------------------------------------------------------- fields

const str = (v: FieldValue): string => (typeof v === "string" ? v : "");
const list = (v: FieldValue): string[] =>
	Array.isArray(v) && v.every((x) => typeof x === "string")
		? (v as string[])
		: [];

/** `label — detail · file`: the file is always there, ids repeat across files. */
function choiceText(c: Choice): string {
	const where = [c.detail, c.file].filter(Boolean).join(" · ");
	const reason = c.disabledReason ? " (not a legal choice now)" : "";
	return `${c.label} — ${where}${reason}`;
}

type Reasoned = { label: string; reason: string };

function reasonsOf(f: FormField): Reasoned[] {
	return [
		...(f.choices ?? [])
			.filter((c) => c.disabledReason)
			.map((c) => ({
				label: `${c.label} (${c.file})`,
				reason: c.disabledReason as string,
			})),
		...(f.options ?? [])
			.filter((o) => o.disabledReason)
			.map((o) => ({ label: o.label, reason: o.disabledReason as string })),
	];
}

/** The visible text of every reason beside the field; each paragraph is named by `aria-describedby`. */
function reasonBlock(f: FormField): { html: string; ids: string[] } {
	const ids: string[] = [];
	const parts: string[] = [];
	if (f.disabledReason) {
		ids.push(`d-${f.name}`);
		parts.push(
			`<p class="reason field-reason" id="${esc(`d-${f.name}`)}">${esc(f.label)} cannot be changed here: ${esc(f.disabledReason)}</p>`,
		);
	}
	reasonsOf(f).forEach((r, i) => {
		const id = `r-${f.name}-${i}`;
		ids.push(id);
		parts.push(
			`<p class="reason choice-reason" id="${esc(id)}"><strong>${esc(r.label)}</strong>: ${esc(r.reason)}</p>`,
		);
	});
	return { html: parts.join("\n"), ids };
}

function renderField(f: FormField): string {
	const reasons = reasonBlock(f);
	const help = f.help
		? `<p class="help" id="${esc(`h-${f.name}`)}">${esc(f.help)}${f.control === "text-list" ? " One per line." : ""}</p>`
		: f.control === "text-list"
			? `<p class="help" id="${esc(`h-${f.name}`)}">One per line.</p>`
			: "";
	const describedBy = [
		...(help ? [`h-${f.name}`] : []),
		...reasons.ids,
		`e-${f.name}`,
	]
		.map(esc)
		.join(" ");
	const disabled = f.disabledReason ? " disabled" : "";
	const required = f.required ? ' aria-required="true"' : "";
	const id = esc(`f-${f.name}`);
	const name = esc(f.name);
	const error = `<div role="alert" class="error" data-field="${name}" id="${esc(`e-${f.name}`)}"></div>`;
	const wrap = (inner: string, extra = "") =>
		`<div class="field${f.required ? " required" : ""}${extra}" data-name="${name}" data-control="${esc(f.control)}"${f.refreshOnChange ? ' data-refresh="true"' : ""}>
${inner}
${reasons.html}
${error}
</div>`;
	const label = `<label for="${id}">${esc(f.label)}</label>`;

	switch (f.control) {
		case "text":
		case "url":
			return wrap(
				`${label}
${help}
<input type="${f.control === "url" ? "url" : "text"}" id="${id}" name="${name}" value="${esc(str(f.value))}"${required}${disabled} aria-describedby="${describedBy}">`,
			);
		case "textarea":
			return wrap(
				`${label}
${help}
<textarea id="${id}" name="${name}" rows="4"${required}${disabled} aria-describedby="${describedBy}">${esc(str(f.value))}</textarea>`,
			);
		case "text-list":
			return wrap(
				`${label}
${help}
<textarea id="${id}" name="${name}" rows="3"${required}${disabled} aria-describedby="${describedBy}">${esc(list(f.value).join("\n"))}</textarea>`,
			);
		case "checkbox":
			return wrap(
				`<input type="checkbox" id="${id}" name="${name}"${f.value === true ? " checked" : ""}${disabled} aria-describedby="${describedBy}">
${label}
${help}`,
				" checkbox",
			);
		case "select":
			return wrap(
				`${label}
${help}
<select id="${id}" name="${name}"${required}${disabled} aria-describedby="${describedBy}">
${selectOptions(f)}
</select>`,
			);
		case "checkbox-list":
			return wrap(
				`<fieldset${disabled} aria-describedby="${describedBy}">
<legend>${esc(f.label)}</legend>
${help}
${checkboxItems(f)}
</fieldset>`,
			);
		case "evidence":
			return wrap(evidenceControl(f, describedBy, disabled));
		case "rejection-rows":
			return wrap(rejectionControl(f, describedBy, disabled));
	}
}

/** Choices (tokens) or fixed options; a required single choice with nothing chosen shows a prompt, never the first row as if chosen. */
function selectOptions(f: FormField): string {
	const current = str(f.value);
	const items: Array<{ value: string; text: string }> = f.choices
		? f.choices.map((c) => ({ value: c.value, text: choiceText(c) }))
		: (f.options ?? []).map((o) => ({
				value: o.value,
				text: optionText(o),
			}));
	const head =
		current === "" || !items.some((i) => i.value === current)
			? f.required
				? `<option value="" selected disabled>Choose…</option>`
				: `<option value="" selected></option>`
			: f.required
				? ""
				: `<option value=""></option>`;
	const rows = items.map(
		(i) =>
			`<option value="${esc(i.value)}"${i.value === current ? " selected" : ""}>${esc(i.text)}</option>`,
	);
	return [head, ...rows].filter(Boolean).join("\n");
}

const optionText = (o: Option) =>
	o.disabledReason ? `${o.label} (not a legal choice now)` : o.label;

function checkboxItems(f: FormField): string {
	const held = new Set(list(f.value));
	const items: Array<{ value: string; label: string; detail?: string }> =
		f.choices
			? f.choices.map((c) => ({
					value: c.value,
					label: c.label,
					detail: [c.detail, c.file].filter(Boolean).join(" · "),
				}))
			: (f.options ?? []).map((o) => ({ value: o.value, label: o.label }));
	return items
		.map((it, i) => {
			const id = esc(`f-${f.name}-${i}`);
			return `<div class="item"><input type="checkbox" id="${id}" name="${esc(f.name)}" value="${esc(it.value)}"${held.has(it.value) ? " checked" : ""}> <label for="${id}">${esc(it.label)}${it.detail ? ` <span class="detail">— ${esc(it.detail)}</span>` : ""}</label></div>`;
		})
		.join("\n");
}

// ---------------------------------------------------------------- evidence

const evidenceOf = (v: FieldValue): EvidenceValue => {
	const e = v as Partial<EvidenceValue> | undefined;
	return e && typeof e === "object" && !Array.isArray(e)
		? { comments: e.comments ?? [], disposition: e.disposition }
		: { comments: [] };
};

function commentRow(
	name: string,
	i: number | string,
	c?: EvidenceValue["comments"][number],
): string {
	const p = `f-${name}-c${i}`;
	const kinds = [
		`<option value=""${c?.link ? "" : " selected"}></option>`,
		...LINK_KINDS.map(
			(k) =>
				`<option value="${esc(k)}"${c?.link?.kind === k ? " selected" : ""}>${esc(k)}</option>`,
		),
	].join("");
	return `<div class="row" data-row="comment">
<label for="${esc(`${p}-text`)}">Comment</label>
<textarea id="${esc(`${p}-text`)}" rows="2" data-part="text">${esc(c?.text ?? "")}</textarea>
<label for="${esc(`${p}-kind`)}">Link type</label>
<select id="${esc(`${p}-kind`)}" data-part="kind">${kinds}</select>
<label for="${esc(`${p}-url`)}">Link address</label>
<input type="url" id="${esc(`${p}-url`)}" data-part="url" value="${esc(c?.link?.url ?? "")}">
<label for="${esc(`${p}-label`)}">Link label</label>
<input type="text" id="${esc(`${p}-label`)}" data-part="label" value="${esc(c?.link?.label ?? "")}">
<button type="button" data-action="remove-row">Remove comment</button>
</div>`;
}

function evidenceControl(
	f: FormField,
	describedBy: string,
	disabled: string,
): string {
	const v = evidenceOf(f.value);
	const dispositions = [
		`<option value=""${v.disposition ? "" : " selected"}></option>`,
		...DISPOSITION.map(
			(d) =>
				`<option value="${esc(d)}"${v.disposition === d ? " selected" : ""}>${esc(d)}</option>`,
		),
	].join("");
	return `<fieldset${disabled} aria-describedby="${describedBy}">
<legend>${esc(f.label)}</legend>
<label for="${esc(`f-${f.name}`)}">Disposition</label>
<select id="${esc(`f-${f.name}`)}" data-part="disposition">${dispositions}</select>
<div data-rows data-next="${v.comments.length}">
${v.comments.map((c, i) => commentRow(f.name, i, c)).join("\n")}
</div>
<template data-row-template>${commentRow(f.name, "__I__")}</template>
<button type="button" data-action="add-row">Add comment</button>
</fieldset>`;
}

// ---------------------------------------------------------------- rejections

const rowsOf = (v: FieldValue): RejectionRow[] =>
	Array.isArray(v) ? (v as RejectionRow[]).filter((r) => r?.schema) : [];

function rejectionRow(
	f: FormField,
	i: number | string,
	row?: RejectionRow,
): string {
	const p = `f-${f.name}-r${i}`;
	const choices = f.choices ?? [];
	const options = [
		`<option value=""${row ? "" : " selected"}></option>`,
		...choices.map(
			(c) =>
				`<option value="${esc(c.value)}"${row?.schema === c.value ? " selected" : ""}>${esc(choiceText(c))}</option>`,
		),
	].join("");
	return `<div class="row" data-row="rejection">
<label for="${esc(`${p}-schema`)}">Refusal schema</label>
<select id="${esc(`${p}-schema`)}" data-part="schema">${options}</select>
<input type="checkbox" id="${esc(`${p}-many`)}" data-part="many"${row?.many ? " checked" : ""}>
<label for="${esc(`${p}-many`)}">Several at once</label>
<label for="${esc(`${p}-reasons`)}">Reasons, one per line</label>
<textarea id="${esc(`${p}-reasons`)}" rows="2" data-part="reasons">${esc((row?.reasons ?? []).join("\n"))}</textarea>
<button type="button" data-action="remove-row">Remove refusal</button>
</div>`;
}

function rejectionControl(
	f: FormField,
	describedBy: string,
	disabled: string,
): string {
	const rows = rowsOf(f.value);
	return `<fieldset${disabled} aria-describedby="${describedBy}">
<legend>${esc(f.label)}</legend>
<div data-rows data-next="${rows.length}">
${rows.map((r, i) => rejectionRow(f, i, r)).join("\n")}
</div>
<template data-row-template>${rejectionRow(f, "__I__")}</template>
<button type="button" data-action="add-row">Add refusal</button>
</fieldset>`;
}
