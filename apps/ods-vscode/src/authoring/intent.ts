import {
	type Aggregate,
	type BoundedContext,
	type Consumable,
	type Consumption,
	consumptionRef,
	encodeRefSegment,
	identityKeyOf,
	idOf,
	qualifiedRelationshipRef,
	relationshipRef,
	relativeWirePath,
	type Service,
	type SetPath,
	type Workspace,
	type WorkspaceSet,
} from "@open-domain-specification/core";
import {
	type AddIntent,
	type ChosenRef,
	type EditIntent,
	type Json,
	jsonEqual,
	type LegalCheck,
	type RefCheck,
	type TypedRef,
} from "../writer";
import {
	type Draft,
	elementOfToken,
	kindOfFamily,
	type Plain,
	providerKindOf,
	resolveHeld,
	type Subject,
	writtenRef,
} from "./choices";
import {
	type FieldDescriptor,
	familyById,
	type ReadOnlyDescriptor,
} from "./families";
import type {
	EvidenceValue,
	FieldError,
	FieldValue,
	RejectionRow,
} from "./form-protocol";

/**
 * Turns the draft of a form into the ONE writer intent that saves it: the
 * fields' JSON values, only the fields that changed (update), every reference
 * field's legal check with every ref it holds as a typed provider, and the
 * host-owned exemption for refs that were already wrong when the form opened.
 * Vscode-free and pure: it reads the set it is given and returns data.
 */

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const isPlain = (value: unknown): value is Plain =>
	typeof value === "object" && value !== null && !Array.isArray(value);

/** What a reference field holds in the file, resolved in one fresh read. */
export type HeldRefs = {
	/** Token to element, for everything the field names that resolves. */
	elements: Map<string, object>;
	/** Token to the ref the owning file writes for it. */
	refs: Map<string, string>;
	/** Raw `$ref`s that resolve to nothing: the file keeps them and this form cannot edit them. */
	unresolved: string[];
};

const emptyHeld = (): HeldRefs => ({
	elements: new Map(),
	refs: new Map(),
	unresolved: [],
});

export type Decoded = {
	draft: Draft;
	held: Record<string, HeldRefs>;
	/** The JSON of every property the fields write, as the form first saw it (the writer's `expected`). */
	json: Record<string, Json | undefined>;
};

const tokenOf = (element: object): string =>
	identityKeyOf(element as { ref: string });

/** The system kind a context's flags say, in the order the loader reads them. */
export function systemKindOf(node: Plain): string {
	return node.external === true
		? "external"
		: node.boundaryOnly === true
			? "boundaryOnly"
			: node.bigBallOfMud === true
				? "bigBallOfMud"
				: "modelled";
}

export function timingOf(node: Plain): string {
	return node.precondition === true
		? "precondition"
		: node.postcondition === true
			? "postcondition"
			: "always";
}

/** An empty draft: what an add form starts from. */
export function emptyDraft(fields: ReadonlyArray<FieldDescriptor>): Draft {
	const draft: Draft = {};
	for (const f of fields) {
		switch (f.codec) {
			case "bool":
			case "shape-many":
			case "commentsRequired":
				draft[f.name] = false;
				break;
			case "refs":
			case "enum-list":
			case "strings":
			case "rejects":
				draft[f.name] = [];
				break;
			case "evidence":
				draft[f.name] = { comments: [] };
				break;
			case "systemKind":
				draft[f.name] = "modelled";
				break;
			case "timing":
				draft[f.name] = "always";
				break;
			default:
				draft[f.name] = "";
		}
	}
	return draft;
}

/** Reads the form's values out of the canonical JSON of an element. */
export function decodeNode(
	set: WorkspaceSet,
	workspace: Workspace,
	node: Plain,
	fields: ReadonlyArray<FieldDescriptor>,
): Decoded {
	const draft: Draft = {};
	const held: Record<string, HeldRefs> = {};
	const json: Record<string, Json | undefined> = {};
	for (const f of fields)
		for (const key of f.writesJson)
			json[key] =
				node[key] === undefined ? undefined : clone(node[key] as Json);

	const hold = (f: FieldDescriptor, raw: unknown): string[] => {
		const cls = (f.ref as NonNullable<FieldDescriptor["ref"]>).cls;
		const into = held[f.name] ?? emptyHeld();
		held[f.name] = into;
		const out: string[] = [];
		const refs = Array.isArray(raw) ? raw : raw === undefined ? [] : [raw];
		for (const item of refs) {
			const written = isPlain(item) ? item.$ref : undefined;
			if (typeof written !== "string") continue;
			const element = resolveHeld(set, workspace, written, cls);
			if (!element) {
				into.unresolved.push(written);
				continue;
			}
			const token = tokenOf(element);
			into.elements.set(token, element);
			into.refs.set(token, written);
			out.push(token);
		}
		return out;
	};

	for (const f of fields) {
		const raw = node[f.name];
		switch (f.codec) {
			case "string":
				draft[f.name] = typeof raw === "string" ? raw : "";
				break;
			case "bool":
				draft[f.name] = raw === true;
				break;
			case "enum":
				draft[f.name] = typeof raw === "string" ? raw : "";
				break;
			case "enum-list":
				draft[f.name] = Array.isArray(raw)
					? raw.filter((v): v is string => typeof v === "string")
					: [];
				break;
			case "systemKind":
				draft[f.name] = systemKindOf(node);
				break;
			case "timing":
				draft[f.name] = timingOf(node);
				break;
			case "ref":
			case "shape":
				draft[f.name] = hold(f, raw)[0] ?? "";
				break;
			case "refs":
				draft[f.name] = hold(f, raw);
				break;
			case "shape-many": {
				const shape = node[f.pairedWith as string];
				draft[f.name] = isPlain(shape) && shape.many === true;
				break;
			}
			case "rejects": {
				const rows: RejectionRow[] = [];
				held[f.name] = held[f.name] ?? emptyHeld();
				for (const item of Array.isArray(raw) ? raw : []) {
					if (!isPlain(item)) continue;
					const token = hold(f, item)[0];
					if (!token) continue;
					rows.push({
						schema: token,
						...(item.many === true ? { many: true } : {}),
						...(Array.isArray(item.reasons) && item.reasons.length
							? { reasons: item.reasons as string[] }
							: {}),
					});
				}
				draft[f.name] = rows;
				break;
			}
			case "evidence": {
				const comments = Array.isArray(node.comments)
					? (clone(node.comments) as EvidenceValue["comments"])
					: [];
				const disposition = node.disposition;
				draft[f.name] = {
					comments,
					...(typeof disposition === "string"
						? { disposition: disposition as EvidenceValue["disposition"] }
						: {}),
				};
				break;
			}
			case "strings":
				draft[f.name] = Array.isArray(raw)
					? raw.filter((v): v is string => typeof v === "string")
					: [];
				break;
			case "commentsRequired": {
				const rules = isPlain(node.options) ? node.options.rules : undefined;
				draft[f.name] = isPlain(rules) && rules.commentsRequired === true;
				break;
			}
			default:
				draft[f.name] = "";
		}
	}
	return { draft, held, json };
}

// ------------------------------------------------------------------ encoding

export type EncodeContext = {
	set: WorkspaceSet;
	workspace: Workspace;
	held: Record<string, HeldRefs>;
	/** Every ref the intent embeds or judges, typed; filled as fields are encoded. */
	providers: Map<string, TypedRef>;
};

export type Chosen = { token: string; ref: string; element: object };

/** The refs a reference field names in the draft, each registered as a typed provider. */
export function chosenOf(
	ctx: EncodeContext,
	field: FieldDescriptor,
	draft: Draft,
): { chosen: Chosen[]; missing: string[] } {
	const cls = (field.ref as NonNullable<FieldDescriptor["ref"]>).cls;
	const value = draft[field.name];
	const tokens =
		field.codec === "rejects"
			? (value as RejectionRow[]).map((r) => r.schema)
			: typeof value === "string"
				? value
					? [value]
					: []
				: Array.isArray(value)
					? (value as string[])
					: [];
	const chosen: Chosen[] = [];
	const missing: string[] = [];
	const heldFor = ctx.held[field.name];
	for (const token of tokens) {
		const element =
			heldFor?.elements.get(token) ?? elementOfToken(ctx.set, token);
		if (!element) {
			missing.push(token);
			continue;
		}
		const ref =
			heldFor?.refs.get(token) ?? writtenRef(ctx.set, ctx.workspace, element);
		ctx.providers.set(ref, { ref, kind: providerKindOf(cls, element) });
		chosen.push({ token, ref, element });
	}
	return { chosen, missing };
}

const refJson = (ref: string): Json => ({ $ref: ref });

/** The JSON a property of the element gets from the draft; undefined leaves it out. */
export function encodeProperty(
	key: string,
	fields: ReadonlyArray<FieldDescriptor>,
	draft: Draft,
	ctx: EncodeContext,
): Json | undefined {
	const writers = fields.filter((f) => f.writesJson.includes(key));
	const f = writers[0];
	const value = draft[f.name];
	const refsOf = (field: FieldDescriptor) =>
		chosenOf(ctx, field, draft).chosen.map((c) => c.ref);
	switch (f.codec) {
		case "string":
			return typeof value === "string" && value !== ""
				? value
				: f.jsonRequired
					? ""
					: undefined;
		case "bool":
			return value === true ? true : undefined;
		case "enum":
			return typeof value === "string" && value !== "" ? value : undefined;
		case "enum-list": {
			const list = Array.isArray(value) ? (value as string[]) : [];
			return list.length || f.jsonRequired ? list : undefined;
		}
		case "systemKind":
			return value === key ? true : undefined;
		case "timing":
			return value === key ? true : undefined;
		case "ref": {
			const [ref] = refsOf(f);
			return ref === undefined ? undefined : refJson(ref);
		}
		case "refs": {
			const refs = refsOf(f);
			return refs.length ? refs.map(refJson) : f.jsonRequired ? [] : undefined;
		}
		case "shape": {
			const [ref] = refsOf(f);
			if (ref === undefined) return undefined;
			const aux = fields.find((x) => x.pairedWith === f.name);
			return {
				$ref: ref,
				...(aux && draft[aux.name] === true ? { many: true } : {}),
			};
		}
		case "rejects": {
			const rows = value as RejectionRow[];
			if (!rows.length) return undefined;
			const { chosen } = chosenOf(ctx, f, draft);
			return rows.map((row, i) => ({
				$ref: chosen[i].ref,
				...(row.many === true ? { many: true } : {}),
				...(row.reasons?.length ? { reasons: [...row.reasons] } : {}),
			}));
		}
		case "evidence": {
			const evidence = value as EvidenceValue;
			if (key === "comments")
				return evidence.comments.length
					? (clone(evidence.comments) as unknown as Json)
					: undefined;
			return evidence.disposition ?? undefined;
		}
		case "strings": {
			const list = (Array.isArray(value) ? (value as string[]) : [])
				.map((s) => s.trim())
				.filter(Boolean);
			return list.length ? list : undefined;
		}
		case "commentsRequired":
			return value === true ? { rules: { commentsRequired: true } } : undefined;
		case "participant0":
		case "participant1": {
			const [a] = refsOf(writers[0]);
			const [b] = refsOf(writers[1]);
			return a === undefined || b === undefined
				? undefined
				: [refJson(a), refJson(b)];
		}
		default:
			return undefined;
	}
}

// ---------------------------------------------------------------- change set

/** The JSON properties whose form fields differ from what the form first showed. */
export function changedKeys(
	fields: ReadonlyArray<FieldDescriptor>,
	draft: Draft,
	initial: Draft,
): string[] {
	const keys = new Set<string>();
	for (const f of fields) {
		if (jsonEqual(draft[f.name] as Json, initial[f.name] as Json)) continue;
		const own = f.pairedWith
			? (fields.find((x) => x.name === f.pairedWith)?.writesJson ?? [])
			: f.writesJson;
		for (const key of own) keys.add(key);
	}
	return [...keys];
}

/** Whether a field, or the aux checkbox riding on it, differs from the open state. */
export function fieldChanged(
	fields: ReadonlyArray<FieldDescriptor>,
	name: string,
	draft: Draft,
	initial: Draft,
): boolean {
	const same = (n: string) => jsonEqual(draft[n] as Json, initial[n] as Json);
	if (!same(name)) return true;
	return fields.some((f) => f.pairedWith === name && !same(f.name));
}

/**
 * Whether the writer may keep the refs of a field that were already illegal
 * when the form opened: only while neither the field itself nor any field that
 * governs its legality differs from what the form first showed.
 */
export function mayKeepPinned(
	fields: ReadonlyArray<FieldDescriptor>,
	field: FieldDescriptor,
	draft: Draft,
	initial: Draft,
): boolean {
	return ![field.name, ...(field.governedBy ?? [])].some((name) =>
		fieldChanged(fields, name, draft, initial),
	);
}

// --------------------------------------------------------------- consumptions

/**
 * The identity a consumption has, or would have, among those of its consumer.
 * A pair taken once has no caller in its ref; where one consumer takes one
 * consumable more than once, each carries `/by/<first caller>`
 * (`workspace.ts` Consumption.path), so two with no caller, or the same first
 * caller, would have ONE ref and the writer could address only the first.
 */
export function consumptionKey(
	set: WorkspaceSet,
	workspace: Workspace,
	consumer: Aggregate | Service,
	consumable: Consumable,
	firstCaller: object | undefined,
	self?: Consumption,
): { ref: string; siblings: Consumption[]; collides: boolean } {
	const siblings = consumer.consumptions.filter(
		(c) => c !== self && c.consumable === consumable,
	);
	return {
		ref: consumptionRef(
			consumer.ref,
			set.refTo(workspace, consumable),
			siblings.length && firstCaller
				? set.refTo(workspace, firstCaller as { ref: string })
				: undefined,
		),
		siblings,
		collides: siblings.some((s) => s.by[0] === firstCaller),
	};
}

/** The `by` the draft saves: the callers already there keep their order (the first one names the ref), new ones follow. */
export function orderedBy(
	initial: FieldValue | undefined,
	draft: FieldValue | undefined,
): string[] {
	const was = Array.isArray(initial) ? (initial as string[]) : [];
	const now = Array.isArray(draft) ? (draft as string[]) : [];
	return [
		...was.filter((t) => now.includes(t)),
		...now.filter((t) => !was.includes(t)),
	];
}

// ----------------------------------------------------------------- the intent

export type BuildInput = {
	set: WorkspaceSet;
	subject: Subject;
	fields: ReadonlyArray<FieldDescriptor>;
	/** The read-only rows of the operation; a `judged` one still gets a legal check. */
	readOnly: ReadonlyArray<ReadOnlyDescriptor>;
	/** The fields shown now; hidden ones are neither written nor judged afresh. */
	visible: (field: FieldDescriptor) => boolean;
	draft: Draft;
	initial: Draft;
	json: Record<string, Json | undefined>;
	held: Record<string, HeldRefs>;
	/** HOST-OWNED: written refs per field that were illegal when the form opened. Never from a message. */
	opened: Record<string, string[]>;
	/** Entity relation update: the owner's `relations` as the form first saw them. */
	initialRelations?: Json[];
	/** Add: the file the new element is written to. */
	ownerFile: string;
};

export type Built =
	| { ok: false; errors: FieldError[] }
	| {
			ok: true;
			/** Undefined when nothing differs: no write is attempted. */
			intent?: EditIntent | AddIntent;
			changed: string[];
			/** Said after a save: what else the write re-keyed. */
			rekey?: string;
	  };

const fieldError = (field: string | null, message: string): FieldError => ({
	field,
	message,
});

function postHolder(
	input: BuildInput,
	draft: Draft,
): { holder: TypedRef; rekey?: string } {
	const { subject, set } = input;
	const kind = kindOfFamily(subject.family);
	if (subject.family !== "consumption")
		return { holder: { ref: subject.ref, kind } };
	// A consumption's own ref can change with its first caller, and the writer
	// looks the holder up in the set the write produces.
	const consumption =
		subject.mode === "update" ? (subject.element as Consumption) : undefined;
	const consumer = (consumption?.consumer ?? subject.element) as
		| Aggregate
		| Service;
	const consumableEl =
		consumption?.consumable ??
		input.held.consumable?.elements.get(draft.consumable as string) ??
		elementOfToken(set, draft.consumable);
	if (!consumableEl) return { holder: { ref: subject.ref, kind } };
	const by = orderedBy(input.initial.by, draft.by);
	const caller = by[0]
		? (input.held.by?.elements.get(by[0]) ?? elementOfToken(set, by[0]))
		: undefined;
	const key = consumptionKey(
		set,
		subject.workspace,
		consumer,
		consumableEl as Consumable,
		caller,
		consumption,
	);
	return {
		holder: { ref: key.ref, kind },
		rekey:
			consumption && key.ref !== consumption.ref
				? `The consumption's ref changed from ${consumption.ref} to ${key.ref}: consumptions of one consumable by one consumer are told apart by their first caller.`
				: undefined,
	};
}

/** Builds the intent for the form's draft, or says which fields cannot be saved. */
export function buildIntent(input: BuildInput): Built {
	const { subject, set, fields, draft, initial } = input;
	const family = familyById(subject.family);
	const providers = new Map<string, TypedRef>();
	const ctx: EncodeContext = {
		set,
		workspace: subject.workspace,
		held: input.held,
		providers,
	};
	const errors: FieldError[] = [];
	const visible = fields.filter(input.visible);

	// Every reference field resolves, or the save says which one cannot.
	for (const f of fields.filter((x) => x.ref)) {
		const { missing } = chosenOf(ctx, f, draft);
		if (missing.length)
			errors.push(
				fieldError(
					f.name,
					`${f.label}: a choice is not in the model any more; reopen the form and choose again`,
				),
			);
	}
	if (errors.length) return { ok: false, errors };

	const holderInfo = postHolder(input, draft);
	const checks: LegalCheck[] = [];
	const reference = fields.filter(
		(f) => f.ref && (subject.mode === "update" || visible.includes(f)),
	);

	const exempt = (f: FieldDescriptor): string[] | undefined =>
		subject.mode === "update" &&
		mayKeepPinned(fields, f, draft, initial) &&
		input.opened[f.name]?.length
			? input.opened[f.name]
			: undefined;

	if (subject.family === "entityRelation") return buildRelation(input, ctx);

	for (const f of reference) {
		const { chosen } = chosenOf(ctx, f, draft);
		const opened = exempt(f);
		checks.push({
			field: f.name,
			class: (f.ref as NonNullable<FieldDescriptor["ref"]>).cls,
			holder: holderInfo.holder,
			chosen: chosen.map((c): ChosenRef => ({ ref: c.ref })),
			...(opened ? { openedIllegal: [...opened] } : {}),
		} satisfies RefCheck);
	}

	// A property that cannot be edited here still holds a selected ref: judge it too.
	if (subject.mode === "update")
		for (const row of input.readOnly.filter((r) => r.judged)) {
			const raw = subject.node[row.property];
			// A symmetric relationship's `participants` is a list of two refs.
			const refs = (Array.isArray(raw) ? raw : [raw])
				.map((r) => (isPlain(r) ? r.$ref : undefined))
				.filter((r): r is string => typeof r === "string");
			const cls = row.judged as NonNullable<ReadOnlyDescriptor["judged"]>;
			const chosen: ChosenRef[] = [];
			for (const ref of refs) {
				const element = resolveHeld(set, subject.workspace, ref, cls);
				if (!element) continue;
				providers.set(ref, { ref, kind: providerKindOf(cls, element) });
				chosen.push({ ref });
			}
			if (!chosen.length) continue;
			const opened = input.opened[row.property];
			checks.push({
				field: row.property,
				class: cls,
				holder: holderInfo.holder,
				chosen,
				...(opened?.length ? { openedIllegal: [...opened] } : {}),
			});
		}

	if (subject.mode === "update") {
		const keys = changedKeys(fields, draft, initial);
		const changes = keys
			.map((key) => ({
				field: key,
				expected: input.json[key],
				value: encodeProperty(key, fields, draft, ctx),
			}))
			.filter((c) => !jsonEqual(c.expected, c.value));
		if (changes.length === 0) return { ok: true, changed: [] };
		if (
			keys.includes("external") ||
			keys.includes("boundaryOnly") ||
			keys.includes("bigBallOfMud")
		)
			checks.push({
				field: "systemKind",
				class: "LC-BC-FLAGS",
				holder: holderInfo.holder,
			});
		return {
			ok: true,
			changed: changes.map((c) => c.field),
			rekey: holderInfo.rekey,
			intent: {
				op: "edit",
				file: subject.file,
				target: { ref: subject.ref, kind: kindOfFamily(subject.family) },
				changes,
				providers: [...providers.values()],
				checks,
			},
		};
	}

	// add
	const element: { [key: string]: Json } = {};
	const written = new Set<string>();
	for (const f of visible)
		for (const key of f.writesJson) {
			if (written.has(key)) continue;
			written.add(key);
			const value = encodeProperty(key, fields, draft, ctx);
			if (value !== undefined) element[key] = value;
		}
	if (subject.family === "domain") element.subdomains = {};
	const parent = family.parent;
	if (!parent)
		return {
			ok: false,
			errors: [fieldError(null, "this family cannot be added")],
		};
	const id =
		parent.keyed === "record"
			? idOf(String(draft.name ?? "").trim())
			: undefined;
	const base = subject.ref === "#" ? "#" : subject.ref;
	const newRef =
		id === undefined
			? holderInfo.holder.ref
			: `${base}/${parent.collection}/${encodeRefSegment(id)}`;
	const addChecks =
		subject.family === "relationship"
			? relationshipAddChecks(input, checks, ctx)
			: checks.map((c) => ({ ...c, holder: { ...c.holder, ref: newRef } }));
	return {
		ok: true,
		changed: Object.keys(element),
		rekey: holderInfo.rekey,
		intent: {
			op: "add",
			file: input.ownerFile,
			parent: { ref: subject.ref, kind: "element" },
			collection: parent.collection,
			...(id !== undefined ? { id } : {}),
			element: element as { [key: string]: Json },
			providers: [...providers.values()],
			checks: addChecks,
		},
	};
}

/**
 * The ref a new relationship has in the file that will own it, built the way
 * `ContextRelationship.path` builds it: the two ends, the type and the name,
 * with each end's path relative to the owner when it is in another file.
 */
export function newRelationshipRef(
	owner: Workspace,
	type: string,
	source: BoundedContext,
	target: BoundedContext,
	name: string,
): string {
	const nameId = name.trim() ? idOf(name.trim(), undefined) : undefined;
	const where = (end: BoundedContext) =>
		end.workspace === owner
			? "."
			: relativeWirePath(owner.file as SetPath, end.workspace.file as SetPath);
	return source.workspace === owner && target.workspace === owner
		? relationshipRef(source.id, type as never, target.id, nameId)
		: qualifiedRelationshipRef(
				{ path: where(source), id: source.id },
				type as never,
				{ path: where(target), id: target.id },
				nameId,
			);
}

/** The end fields of a relationship: upstream and downstream, or its two participants (source first). */
const RELATIONSHIP_ENDS = [
	"upstream",
	"downstream",
	"participantA",
	"participantB",
];

/**
 * A new relationship's legal checks: the two ends, directed (upstream is the
 * source, downstream the target) or symmetric (first and second participant),
 * judged on the relationship the write produces (its own ref in the owning
 * file), so `LC-CONTEXT` reads both real ends.
 */
function relationshipAddChecks(
	input: BuildInput,
	checks: LegalCheck[],
	ctx: EncodeContext,
): LegalCheck[] {
	const own = checks.filter((c) =>
		RELATIONSHIP_ENDS.includes(c.field),
	) as RefCheck[];
	if (own.length !== 2) return [];
	const [source, target] = own.map(
		(c) =>
			chosenOf(
				ctx,
				input.fields.find((f) => f.name === c.field) as FieldDescriptor,
				input.draft,
			).chosen[0]?.element as BoundedContext | undefined,
	);
	if (!source || !target) return [];
	const ref = newRelationshipRef(
		input.subject.workspace,
		String(input.draft.type),
		source,
		target,
		String(input.draft.name ?? ""),
	);
	return own.map((c) => ({
		...c,
		holder: { ref, kind: "relationship" as const },
	}));
}

/**
 * An entity relation has no id and no ref: it is a row of its owner's
 * `relations`. An update writes that whole list back with one row replaced
 * (stale if any row changed since the form opened); an add appends one row.
 * The legal check is on the owner, with the relation type riding on each ref.
 */
function buildRelation(input: BuildInput, ctx: EncodeContext): Built {
	const { subject, fields, draft, initial } = input;
	const row: { [key: string]: Json } = {};
	const written = new Set<string>();
	for (const f of fields)
		for (const key of f.writesJson) {
			if (written.has(key)) continue;
			written.add(key);
			const value = encodeProperty(key, fields, draft, ctx);
			if (value !== undefined) row[key] = value;
		}
	const owner: TypedRef = { ref: subject.ref, kind: "element" };
	const rowCheck = (
		rows: Array<{ [key: string]: Json }>,
		opened?: string[],
	): RefCheck => ({
		field: "relations",
		class: "LC-RELATION-TARGET",
		holder: owner,
		chosen: rows.map((r) => ({
			ref: (r.target as { $ref: string }).$ref,
			relation: r.relation as ChosenRef["relation"],
		})),
		...(opened?.length ? { openedIllegal: opened } : {}),
	});
	const provide = (rows: Array<{ [key: string]: Json }>) => {
		for (const r of rows) {
			const ref = (r.target as { $ref: string }).$ref;
			const element = resolveHeld(
				ctx.set,
				ctx.workspace,
				ref,
				"LC-RELATION-TARGET",
			);
			ctx.providers.set(ref, {
				ref,
				kind: element
					? providerKindOf("LC-RELATION-TARGET", element)
					: "relationTarget",
			});
		}
	};
	if (subject.mode === "add") {
		provide([row]);
		return {
			ok: true,
			changed: Object.keys(row),
			intent: {
				op: "add",
				file: input.ownerFile,
				parent: owner,
				collection: "relations",
				element: row,
				providers: [...ctx.providers.values()],
				checks: [rowCheck([row])],
			},
		};
	}
	if (changedKeys(fields, draft, initial).length === 0)
		return { ok: true, changed: [] };
	const before = (input.initialRelations ?? []) as Array<{
		[key: string]: Json;
	}>;
	const at = subject.row as number;
	const after = before.map((r, i) => (i === at ? row : r));
	provide(after);
	// The edited row keeps a ref the host found illegal at opening only while its
	// target and its relation type are unchanged (a label edit); other rows keep theirs.
	const edited = (before[at]?.target as { $ref?: string } | undefined)?.$ref;
	const target = fields.find((x) => x.name === "target") as FieldDescriptor;
	const keepEdited = mayKeepPinned(fields, target, draft, initial);
	const opened = (input.opened.relations ?? []).filter(
		(r) => r !== edited || keepEdited,
	);
	return {
		ok: true,
		changed: ["relations"],
		intent: {
			op: "edit",
			file: subject.file,
			target: owner,
			changes: [
				{
					field: "relations",
					expected: clone(before) as Json,
					value: after as Json,
				},
			],
			providers: [...ctx.providers.values()],
			checks: [rowCheck(after, opened)],
		},
	};
}
