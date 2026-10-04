import { createHash, randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
	BoundedContext,
	holderOf,
	isLegalTarget,
	type LegalClassId,
	type LegalHolder,
	parseRef,
	REF_KINDS,
	type RefKind,
	resolveWirePath,
	type SetPath,
	systemKindProblem,
	validateSetPath,
	type Workspace,
	type WorkspaceSchema,
	WorkspaceSet,
} from "@open-domain-specification/core";
import {
	type Assembled,
	assemble,
	messageOf,
	type SourceText,
} from "./assemble";
import { type JsonPath, jsonPathOfRef, valueAtPath } from "./locate";

/**
 * The one way a form changes a model file. Vscode-free: it asks an injected
 * {@link TextIo} for text and hands text back, so the same function runs
 * against a temp folder in a test and against the editor in the extension.
 *
 * What it promises, and what it does not:
 *
 * - Every call reads the text of EVERY file of the set again (the editor
 *   buffer when the file is open, else the disk) and builds a fresh set from
 *   it. Nothing is remembered between calls, so a previous load, a cache or a
 *   "last good" model can never decide what a ref means.
 * - Only the owning file is ever written. Other files are read, never touched.
 * - A write is detect-before-check: the owner's stamp is compared with a
 *   re-read immediately before writing; on a difference the whole call runs
 *   once more from fresh text, and a second difference is `file-changed`
 *   without a write. This is NOT compare-and-swap: a writer that lands between
 *   the re-read and the rename is overwritten undetected. No kernel CAS and no
 *   post-write race check is claimed (closure contract 3.2).
 * - Re-emitting the owner is canonical: it drops unknown fields and unresolved
 *   LOCAL refs exactly as decision 29 names, and keeps qualified-invalid
 *   entries of the four retaining holders where they were.
 */

export type Json =
	| null
	| boolean
	| number
	| string
	| Json[]
	| { [key: string]: Json };

/** What a ref must name, one of the loader's 17 kinds plus relationship, consumption and answer. */
export type RefKindName = keyof typeof REF_KINDS;

/**
 * A ref as the OWNING file writes it (`#/...` or `other.json#/...`) and the
 * kind of thing it has to name. Obtain one from `set.refTo(owner, element)`.
 */
export type TypedRef = { ref: string; kind: RefKindName };

type Common = {
	/** The owning file: the only file this intent may change. */
	file: SetPath;
	/**
	 * Every ref the change embeds (`{ "$ref": ... }`), typed. Each is
	 * re-resolved against fresh text with its kind; one that no longer resolves
	 * is `stale-provider`. A `$ref` in the change that is not listed here is an
	 * invalid intent, so nothing is ever dropped silently on load.
	 */
	providers?: ReadonlyArray<TypedRef>;
	/**
	 * What the change selects that must still be legal when it is written. Judged
	 * on the set the write would produce, so a sibling, root or relation edited
	 * in the same intent is seen. Absent means nothing is judged.
	 */
	checks?: ReadonlyArray<LegalCheck>;
};

/** One reference the form selected for a field, as the owning file writes it. */
export type ChosenRef = {
	ref: string;
	/** Only for a relation target chosen beside a new relation: the relation type, used when the holder is not itself a relation. */
	relation?: NonNullable<LegalHolder["relation"]>;
};

/**
 * A reference field whose selected choices are judged at write time with
 * `isLegalTarget`. The forms phase supplies one for EVERY selected-ref field of
 * the holder, not only the ones it changed: the writer evaluates what it is
 * given and cannot tell which fields a sibling edit or another file affected.
 */
export type RefCheck = {
	/** The descriptor field, for messages. */
	field: string;
	class: LegalClassId;
	/**
	 * The element whose field this is, resolvable in the changed file: an update
	 * or edit's target, a new record's own ref, or for an entity relation its
	 * owning entity.
	 */
	holder: TypedRef;
	/** Every ref the field holds after the save. Each must also be a typed provider. */
	chosen: ReadonlyArray<ChosenRef>;
	/**
	 * Refs of this field the HOST found illegal when it opened the form, read by
	 * the host from its own fresh set. Never take it from a webview message. It
	 * only keeps a ref that is also already in the file's field before this
	 * write (a deliberately pinned or inherited defect); it can never admit a
	 * ref this save newly writes.
	 */
	openedIllegal?: ReadonlyArray<string>;
};

/**
 * The context kind flags, judged with `systemKindProblem` only when the kind
 * the changed file would carry differs from the kind it carries now.
 */
export type KindCheck = {
	field: string;
	class: "LC-BC-FLAGS";
	/** The bounded context whose `external`, `boundaryOnly` and `bigBallOfMud` flags change. */
	holder: TypedRef;
};

export type LegalCheck = RefCheck | KindCheck;

/** Sets (or, with `value: undefined`, removes) one field of an element the owner holds. */
export type UpdateIntent = Common & {
	op: "update";
	target: TypedRef;
	field: string;
	/** The value the form saw; `undefined` means it saw the field absent. A different fresh value is `stale-value`. */
	expected: Json | undefined;
	value: Json | undefined;
};

/** One field of an {@link EditIntent}; the stale-value rule of an {@link UpdateIntent} applies to each. */
export type FieldChange = {
	field: string;
	expected: Json | undefined;
	value: Json | undefined;
};

/**
 * Sets (or removes) several fields of one element the owner holds, all in one
 * emit and one write, or none: any stale field, field the schema would drop,
 * or illegal choice refuses the whole intent before any file or editor changes.
 */
export type EditIntent = Common & {
	op: "edit";
	target: TypedRef;
	changes: ReadonlyArray<FieldChange>;
};

/** Adds an element under a parent the owner holds. */
export type AddIntent = Common & {
	op: "add";
	parent: TypedRef;
	/** The property of the parent that holds the elements, for example `boundedcontexts` or `relationships`. */
	collection: string;
	/** Present for a collection keyed by id (an object); absent for a list (an array). */
	id?: string;
	element: { [key: string]: Json };
};

/** Removes an element the owner holds. */
export type RemoveIntent = Common & {
	op: "remove";
	target: TypedRef;
	/** When given, the element as the form saw it; a different fresh element is `stale-value`. */
	expected?: Json;
};

export type Intent = UpdateIntent | EditIntent | AddIntent | RemoveIntent;

export type RefusalCause =
	| "stale-target"
	| "stale-value"
	| "stale-provider"
	| "duplicate"
	| "wrong-owner"
	| "owner-unparsable"
	| "dependency-unreadable"
	| "file-changed"
	| "invalid-intent"
	| "illegal-choice"
	| "write-failed";

/** A selected choice the changed file would hold but the model does not allow. */
export type IllegalChoice = {
	field: string;
	ref: string;
	/** The target and its file, to show beside the field. */
	label: string;
	rule: string;
	reason: string;
};

export type WriteResult =
	| {
			ok: true;
			file: SetPath;
			/** `noop`: the model already said it. `disk`: renamed over the file. `buffer`: edited in an open, dirty buffer, left unsaved. `buffer-saved`: edited in a clean buffer, then saved. */
			wrote: "noop" | "disk" | "buffer" | "buffer-saved";
	  }
	| {
			ok: false;
			cause: RefusalCause;
			detail: string;
			/** What the person can do next. Always present. */
			action: string;
			/** Present exactly when `cause` is `illegal-choice`. */
			illegal?: ReadonlyArray<IllegalChoice>;
	  };

export type TextRead =
	| {
			ok: true;
			text: string;
			/** Opaque stamp of this read; only ever compared for equality. */
			hash: string;
	  }
	| { ok: false; detail: string };

export type WriteOutcome =
	| { status: "ok"; via: "disk" | "buffer" | "buffer-saved" }
	| { status: "changed" }
	| {
			status: "failed";
			detail: string;
			/** What the person can do, when the io knows better than the generic advice. */
			action?: string;
	  };

/** Everything the writer needs from the outside world, asynchronous as the editor and the disk are. */
export interface TextIo {
	readText(file: SetPath): Promise<TextRead>;
	/**
	 * Writes `text` to `file` only if its stamp still equals `expectedHash`,
	 * checked immediately before the write. `changed` means nothing was written.
	 */
	writeIfUnchanged(
		file: SetPath,
		text: string,
		expectedHash: string,
	): Promise<WriteOutcome>;
}

const refuse = (
	cause: RefusalCause,
	detail: string,
	action: string,
	illegal?: ReadonlyArray<IllegalChoice>,
): WriteResult => ({
	ok: false,
	cause,
	detail,
	action,
	...(illegal ? { illegal } : {}),
});

// ---------------------------------------------------------------- JSON helpers

type Plain = { [key: string]: unknown };

const isPlain = (value: unknown): value is Plain =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const UNSAFE_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const MAX_DEPTH = 64;

function isJson(value: unknown, depth = 0): value is Json {
	if (depth > MAX_DEPTH) return false;
	if (value === null || typeof value === "boolean" || typeof value === "string")
		return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every((v) => isJson(v, depth + 1));
	if (isPlain(value))
		return Object.entries(value).every(
			([k, v]) => !UNSAFE_KEYS.has(k) && isJson(v, depth + 1),
		);
	return false;
}

export function jsonEqual(a: unknown, b: unknown): boolean {
	if (a === b) return true;
	if (Array.isArray(a))
		return (
			Array.isArray(b) &&
			a.length === b.length &&
			a.every((v, i) => jsonEqual(v, b[i]))
		);
	if (isPlain(a) && isPlain(b)) {
		const keys = Object.keys(a);
		return (
			keys.length === Object.keys(b).length &&
			keys.every((k) => Object.hasOwn(b, k) && jsonEqual(a[k], b[k]))
		);
	}
	return false;
}

/** `wanted` is contained in `actual`: every key and item it states is there, equal; `actual` may carry more (defaults core adds). */
function jsonContains(actual: unknown, wanted: unknown): boolean {
	if (Array.isArray(wanted))
		return (
			Array.isArray(actual) &&
			actual.length === wanted.length &&
			wanted.every((v, i) => jsonContains(actual[i], v))
		);
	if (isPlain(wanted))
		return (
			isPlain(actual) &&
			Object.entries(wanted).every(
				([k, v]) => Object.hasOwn(actual, k) && jsonContains(actual[k], v),
			)
		);
	return actual === wanted;
}

function embeddedRefs(value: unknown, into: string[] = []): string[] {
	if (Array.isArray(value)) for (const v of value) embeddedRefs(v, into);
	else if (isPlain(value))
		for (const [k, v] of Object.entries(value)) {
			if (k === "$ref" && typeof v === "string") into.push(v);
			else embeddedRefs(v, into);
		}
	return into;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const show = (value: unknown): string => {
	const text = value === undefined ? "(absent)" : JSON.stringify(value);
	return text.length > 120 ? `${text.slice(0, 117)}...` : text;
};

// ------------------------------------------------------------ intent checking

const typedRefProblem = (r: unknown, what: string): string | undefined => {
	if (!isPlain(r) || typeof r.ref !== "string" || typeof r.kind !== "string")
		return `${what} must be { ref, kind }`;
	if (!Object.hasOwn(REF_KINDS, r.kind))
		return `${what} names an unknown kind "${r.kind}"; one of ${Object.keys(REF_KINDS).join(", ")}`;
	return undefined;
};

const safeName = (name: unknown): name is string =>
	typeof name === "string" && name !== "" && !UNSAFE_KEYS.has(name);

/** What is wrong with the intent as a value, before any file is read. Total: never throws. */
export function intentProblem(intent: unknown): string | undefined {
	if (!isPlain(intent)) return "the intent must be an object";
	if (typeof intent.file !== "string") return "file must be a set path";
	const checked = validateSetPath(intent.file);
	if (!checked.ok)
		return `file ${JSON.stringify(intent.file)} is not a set path: ${checked.detail}`;
	const providers = intent.providers;
	if (providers !== undefined && !Array.isArray(providers))
		return "providers must be a list of { ref, kind }";
	for (const p of (providers as unknown[] | undefined) ?? []) {
		const bad = typedRefProblem(p, "a provider");
		if (bad) return bad;
	}
	let payload: unknown;
	switch (intent.op) {
		case "edit": {
			const bad = typedRefProblem(intent.target, "target");
			if (bad) return bad;
			if (!Array.isArray(intent.changes) || intent.changes.length === 0)
				return "an edit states at least one change";
			const seen = new Set<string>();
			for (const change of intent.changes as unknown[]) {
				if (!isPlain(change) || !safeName(change.field))
					return "each change names a field (a property name)";
				if (seen.has(change.field))
					return `the field ${change.field} is changed twice`;
				seen.add(change.field);
				if (!("expected" in change) || !("value" in change))
					return "each change states both expected and value (undefined means absent)";
				if (change.expected !== undefined && !isJson(change.expected))
					return `expected of ${change.field} is not JSON`;
				if (change.value !== undefined && !isJson(change.value))
					return `value of ${change.field} is not JSON`;
			}
			payload = (intent.changes as FieldChange[]).map((c) => c.value);
			break;
		}
		case "update": {
			const bad = typedRefProblem(intent.target, "target");
			if (bad) return bad;
			if (!safeName(intent.field)) return "field must be a property name";
			if (!("expected" in intent) || !("value" in intent))
				return "update states both expected and value (undefined means absent)";
			if (intent.expected !== undefined && !isJson(intent.expected))
				return "expected is not JSON";
			if (intent.value !== undefined && !isJson(intent.value))
				return "value is not JSON";
			payload = intent.value;
			break;
		}
		case "add": {
			const bad = typedRefProblem(intent.parent, "parent");
			if (bad) return bad;
			if (!safeName(intent.collection))
				return "collection must be a property name";
			if (intent.id !== undefined && !safeName(intent.id))
				return "id must be a non-empty string";
			if (!isPlain(intent.element) || !isJson(intent.element))
				return "element must be a JSON object";
			payload = intent.element;
			break;
		}
		case "remove": {
			const bad = typedRefProblem(intent.target, "target");
			if (bad) return bad;
			if (intent.expected !== undefined && !isJson(intent.expected))
				return "expected is not JSON";
			break;
		}
		default:
			return `op must be update, edit, add or remove, not ${show(intent.op)}`;
	}
	const declared = new Set(
		((providers as TypedRef[] | undefined) ?? []).map((p) => p.ref),
	);
	for (const ref of embeddedRefs(payload))
		if (!declared.has(ref))
			return `the change writes the ref ${JSON.stringify(ref)} without declaring it in providers`;
	return checksProblem(intent.checks, declared);
}

const RELATIONS = new Set(["includes", "references", "uses"]);

/** What is wrong with the legal checks as values; a chosen ref needs a provider because that is what gives it its kind. */
function checksProblem(
	checks: unknown,
	declared: ReadonlySet<string>,
): string | undefined {
	if (checks === undefined) return undefined;
	if (!Array.isArray(checks)) return "checks must be a list of legal checks";
	for (const check of checks as unknown[]) {
		if (!isPlain(check) || !safeName(check.field) || !safeName(check.class))
			return "a legal check names its field and class";
		const bad = typedRefProblem(check.holder, "a legal check holder");
		if (bad) return bad;
		if (check.class === "LC-BC-FLAGS") continue;
		if (!Array.isArray(check.chosen))
			return `the legal check of ${check.field} lists the refs it chose`;
		for (const chosen of check.chosen as unknown[]) {
			if (!isPlain(chosen) || typeof chosen.ref !== "string")
				return `a chosen ref of ${check.field} must be { ref }`;
			if (
				chosen.relation !== undefined &&
				!RELATIONS.has(chosen.relation as string)
			)
				return `a chosen ref of ${check.field} names an unknown relation`;
			if (!declared.has(chosen.ref))
				return `the chosen ref ${JSON.stringify(chosen.ref)} of ${check.field} is not declared in providers`;
		}
		const opened = check.openedIllegal;
		if (
			opened !== undefined &&
			(!Array.isArray(opened) || opened.some((r) => typeof r !== "string"))
		)
			return `openedIllegal of ${check.field} must be a list of refs`;
	}
	return undefined;
}

// ---------------------------------------------------------------- applyIntent

type Step = { done: WriteResult } | { changed: true };

/**
 * Applies one intent to the owning file of a project.
 *
 * `files` is the project's file list as the caller found it NOW (not a cache):
 * every set path that is part of the set. The owner must be one of them.
 * Never throws on a model, file or intent mistake; each is a refusal that
 * names an action.
 */
export async function applyIntent(
	io: TextIo,
	files: Iterable<SetPath>,
	intent: Intent,
): Promise<WriteResult> {
	const problem = intentProblem(intent);
	if (problem)
		return refuse(
			"invalid-intent",
			problem,
			"This is a defect in the form that sent it; report it. Nothing was changed.",
		);
	const list = [...new Set(files)];
	for (let attempt = 0; attempt < 2; attempt++) {
		const step = await attemptOnce(io, list, intent);
		if ("done" in step) return step.done;
	}
	return refuse(
		"file-changed",
		`${intent.file} changed twice while the change was being prepared`,
		`${intent.file} is being edited elsewhere. Reopen the form so it re-reads the file, then retry.`,
	);
}

async function readAll(
	io: TextIo,
	files: SetPath[],
): Promise<{
	sources: SourceText[];
	hashes: Map<SetPath, string>;
	unreadable: Map<SetPath, string>;
}> {
	const reads = await Promise.all(files.map((file) => io.readText(file)));
	const sources: SourceText[] = [];
	const hashes = new Map<SetPath, string>();
	const unreadable = new Map<SetPath, string>();
	for (const [i, read] of reads.entries()) {
		const file = files[i];
		if (read.ok) {
			sources.push({ file, text: read.text });
			hashes.set(file, read.hash);
		} else unreadable.set(file, read.detail);
	}
	return { sources, hashes, unreadable };
}

async function attemptOnce(
	io: TextIo,
	files: SetPath[],
	intent: Intent,
): Promise<Step> {
	const owner = intent.file;
	if (!files.includes(owner))
		return {
			done: refuse(
				"invalid-intent",
				`${owner} is not a file of this project`,
				"Reload the project; the file may have been renamed or deleted.",
			),
		};

	// 1. Fresh text of every file; nothing carried over from any earlier call.
	const { sources, hashes, unreadable } = await readAll(io, files);
	const ownerUnreadable = unreadable.get(owner);
	if (ownerUnreadable !== undefined)
		return {
			done: refuse(
				"owner-unparsable",
				`${owner} could not be read: ${ownerUnreadable}`,
				`Make ${owner} readable (check that it exists), then retry.`,
			),
		};
	const assembled = assemble(sources);
	const ownerFile = assembled.files.get(owner);
	const ownerWorkspace = assembled.set.byPath(owner);
	if (!ownerFile || ownerFile.excluded || !ownerWorkspace || !ownerFile.schema)
		return {
			done: refuse(
				"owner-unparsable",
				ownerFile?.excluded?.message ?? `${owner} is not in the set`,
				`Fix ${owner} (see the Problems panel), then retry. Nothing was changed.`,
			),
		};
	const ownerRead = hashes.get(owner) as string;
	const ownerText = ownerFile.text;

	// 2. Typed refs, each re-resolved in the fresh set.
	const broken = new Map<SetPath, string>(unreadable);
	for (const [file, entry] of assembled.files)
		if (entry.excluded) broken.set(file, entry.excluded.message);
	const resolved = resolveRefs(
		assembled,
		ownerWorkspace,
		owner,
		intent,
		broken,
	);
	if ("refusal" in resolved) return { done: resolved.refusal };

	// 3. Mutate the owner's canonical JSON; other files are not part of the write.
	const canonical = clone(
		assembled.set.toSchemas().get(owner),
	) as unknown as Plain;
	const priorRefs = priorRefsOf(canonical, intent, resolved.pointer);
	const mutation = mutate(canonical, intent, resolved.pointer);
	if ("refusal" in mutation) return { done: mutation.refusal };
	if (mutation.noop) return { done: { ok: true, file: owner, wrote: "noop" } };

	// 4. The changed owner must load, and the change must survive the load.
	const emitted = emit(
		assembled,
		owner,
		mutation.schema as unknown as WorkspaceSchema,
		intent,
		mutation.path,
	);
	if ("refusal" in emitted) return { done: emitted.refusal };
	const text = withSchemaKey(ownerFile.schema, emitted.schema);
	if (text === ownerText)
		return { done: { ok: true, file: owner, wrote: "noop" } };

	// 5. Every selected choice must be legal in the set this write produces.
	const illegal = legalProblems(
		assembled,
		ownerWorkspace,
		emitted.set,
		owner,
		intent,
		priorRefs,
	);
	if (illegal) return { done: illegal };

	// 6. Detect-before-check write.
	const outcome = await io.writeIfUnchanged(owner, text, ownerRead);
	if (outcome.status === "changed") return { changed: true };
	if (outcome.status === "failed")
		return {
			done: refuse(
				"write-failed",
				`${owner} could not be written: ${outcome.detail}`,
				outcome.action ??
					"Check that the file is writable and the disk has room, then retry. Nothing else was changed.",
			),
		};
	return { done: { ok: true, file: owner, wrote: outcome.via } };
}

/** The kind a typed ref asks for, widened so one resolver call serves all 17. */
const kindFor = (kind: RefKindName) =>
	REF_KINDS[kind] as unknown as RefKind<object>;

function describeKind(kind: RefKindName): string {
	return REF_KINDS[kind].label;
}

function resolveRefs(
	assembled: Assembled,
	ownerWorkspace: Workspace,
	owner: SetPath,
	intent: Intent,
	broken: ReadonlyMap<SetPath, string>,
): { refusal: WriteResult } | { pointer: string } {
	const anchor = intent.op === "add" ? intent.parent : intent.target;
	const role = intent.op === "add" ? "parent" : "target";

	// The ref the intent changes must be in the owning file.
	let pointer = "#";
	if (anchor.ref !== "#") {
		const parsed = parseRef(anchor.ref);
		if (!parsed.ok)
			return {
				refusal: refuse(
					"invalid-intent",
					`the ${role} ref ${JSON.stringify(anchor.ref)} is not a ref: ${parsed.detail}`,
					"This is a defect in the form that sent it; report it.",
				),
			};
		if (!parsed.local) {
			const where = resolveWirePath(owner, parsed.wire);
			if (!where.ok)
				return {
					refusal: refuse(
						"invalid-intent",
						`the ${role} ref ${JSON.stringify(anchor.ref)} names a bad path: ${where.detail}`,
						"This is a defect in the form that sent it; report it.",
					),
				};
			if (where.path !== owner)
				return {
					refusal: refuse(
						"wrong-owner",
						`the ${role} ${anchor.ref} is in ${where.path}, but this change is for ${owner}`,
						`Make the change in ${where.path}, which owns that element.`,
					),
				};
		}
		const found = assembled.set.resolve(
			ownerWorkspace,
			anchor.ref,
			kindFor(anchor.kind),
		);
		if (!found.ok)
			return {
				refusal: refuse(
					"stale-target",
					found.cause === "wrong-kind"
						? `the ${role} ${anchor.ref} is not ${describeKind(anchor.kind)} any more (${found.detail})`
						: `the ${role} ${anchor.ref} is no longer in ${owner} (${found.detail})`,
					`Reload ${owner} in the form and try again; the ${role} changed or was removed.`,
				),
			};
		pointer = (found.target as { ref: string }).ref;
	}

	for (const provider of intent.providers ?? []) {
		const parsed = parseRef(provider.ref);
		if (!parsed.ok)
			return {
				refusal: refuse(
					"invalid-intent",
					`the provider ref ${JSON.stringify(provider.ref)} is not a ref: ${parsed.detail}`,
					"This is a defect in the form that sent it; report it.",
				),
			};
		if (!parsed.local) {
			const where = resolveWirePath(owner, parsed.wire);
			if (!where.ok)
				return {
					refusal: refuse(
						"invalid-intent",
						`the provider ref ${JSON.stringify(provider.ref)} names a bad path: ${where.detail}`,
						"This is a defect in the form that sent it; report it.",
					),
				};
			const why = broken.get(where.path);
			if (why !== undefined)
				return {
					refusal: refuse(
						"dependency-unreadable",
						`the provider ${provider.ref} is in ${where.path}, which cannot be read: ${why}`,
						`Fix ${where.path} (see the Problems panel), then retry. Nothing was changed.`,
					),
				};
		}
		const found = assembled.set.resolve(
			ownerWorkspace,
			provider.ref,
			kindFor(provider.kind),
		);
		if (!found.ok)
			return {
				refusal: refuse(
					"stale-provider",
					found.cause === "wrong-kind"
						? `the provider ${provider.ref} is no longer ${describeKind(provider.kind)} (${found.detail})`
						: `the provider ${provider.ref} no longer exists (${found.detail})`,
					"Pick the provider again in the form; it was changed or removed by someone else.",
				),
			};
	}
	return { pointer };
}

/** An update is an edit of one field. */
const changesOf = (intent: UpdateIntent | EditIntent): FieldChange[] =>
	intent.op === "edit"
		? [...intent.changes]
		: [
				{
					field: intent.field,
					expected: intent.expected,
					value: intent.value,
				},
			];

type Mutation =
	| { refusal: WriteResult }
	| { noop: true }
	| { noop?: false; schema: Plain; path: JsonPath };

function mutate(canonical: Plain, intent: Intent, pointer: string): Mutation {
	const at = jsonPathOfRef(canonical, pointer);
	const node = at && valueAtPath(canonical, at);
	// An element can be in the model without being a plain object of the file
	// (an answer is a view of an operation's `rejects`); it cannot be edited.
	if (!at || (intent.op !== "remove" && !isPlain(node)))
		return {
			refusal: refuse(
				"invalid-intent",
				`${pointer} names an element that cannot be edited in place`,
				"This is a defect in the form that sent it; report it.",
			),
		};

	if (intent.op === "update" || intent.op === "edit") {
		const target = node as Plain;
		const pending: FieldChange[] = [];
		// Judge every field before touching any, so a stale second field leaves the first unapplied.
		for (const change of changesOf(intent)) {
			const fresh = Object.hasOwn(target, change.field)
				? target[change.field]
				: undefined;
			if (jsonEqual(fresh, change.value)) continue;
			if (!jsonEqual(fresh, change.expected))
				return {
					refusal: refuse(
						"stale-value",
						`${change.field} of ${intent.target.ref} is now ${show(fresh)}, not ${show(change.expected)} as the form saw it`,
						"Reload the form to see the current value, then apply your change again.",
					),
				};
			pending.push(change);
		}
		if (pending.length === 0) return { noop: true };
		for (const change of pending)
			if (change.value === undefined) delete target[change.field];
			else target[change.field] = clone(change.value);
		return { schema: canonical, path: at };
	}

	if (intent.op === "remove") {
		if (at.length === 0)
			return {
				refusal: refuse(
					"invalid-intent",
					"the workspace itself cannot be removed",
					"Delete the file instead.",
				),
			};
		if (intent.expected !== undefined && !jsonEqual(node, intent.expected))
			return {
				refusal: refuse(
					"stale-value",
					`${intent.target.ref} is now ${show(node)}, not ${show(intent.expected)} as the form saw it`,
					"Reload the form to see the current element, then remove it again.",
				),
			};
		const parentPath = at.slice(0, -1);
		const key = at[at.length - 1];
		const holder = valueAtPath(canonical, parentPath);
		if (Array.isArray(holder)) holder.splice(key as number, 1);
		else delete (holder as Plain)[key as string];
		return { schema: canonical, path: at };
	}

	// add
	const parent = node as Plain;
	const present = Object.hasOwn(parent, intent.collection)
		? parent[intent.collection]
		: undefined;
	if (intent.id !== undefined) {
		if (present !== undefined && !isPlain(present))
			return {
				refusal: refuse(
					"invalid-intent",
					`${intent.collection} of ${intent.parent.ref} is a list, but an id was given`,
					"This is a defect in the form that sent it; report it.",
				),
			};
		const record = (present ?? {}) as Plain;
		if (Object.hasOwn(record, intent.id))
			return {
				refusal: refuse(
					"duplicate",
					`${intent.collection} of ${intent.parent.ref} already has ${JSON.stringify(intent.id)}`,
					"Choose another name, or open the existing element to edit it.",
				),
			};
		record[intent.id] = clone(intent.element);
		parent[intent.collection] = record;
		return { schema: canonical, path: [...at, intent.collection, intent.id] };
	}
	if (present !== undefined && !Array.isArray(present))
		return {
			refusal: refuse(
				"invalid-intent",
				`${intent.collection} of ${intent.parent.ref} is keyed by id, but no id was given`,
				"This is a defect in the form that sent it; report it.",
			),
		};
	const list = (present ?? []) as unknown[];
	if (list.some((item) => jsonEqual(item, intent.element)))
		return {
			refusal: refuse(
				"duplicate",
				`${intent.collection} of ${intent.parent.ref} already holds exactly this element`,
				"Open the existing element to edit it.",
			),
		};
	list.push(clone(intent.element));
	parent[intent.collection] = list;
	return { schema: canonical, path: [...at, intent.collection] };
}

/**
 * Builds the set again with the changed owner, proves the change loaded and
 * survived, and returns the owner as core would write it. Other files go in
 * exactly as parsed.
 */
function emit(
	assembled: Assembled,
	owner: SetPath,
	changed: WorkspaceSchema,
	intent: Intent,
	at: JsonPath,
): { refusal: WriteResult } | { schema: WorkspaceSchema; set: WorkspaceSet } {
	const entries: Array<[SetPath, WorkspaceSchema]> = [];
	for (const [file, entry] of assembled.files)
		if (file === owner) entries.push([file, changed]);
		else if (entry.schema) entries.push([file, entry.schema]);
	let out: WorkspaceSchema | undefined;
	let set: WorkspaceSet;
	try {
		set = WorkspaceSet.fromSchemas(entries);
		out = set.toSchemas().get(owner);
	} catch (e) {
		return {
			refusal: refuse(
				"invalid-intent",
				`the changed ${owner} could not be loaded: ${messageOf(e)}`,
				"This is a defect in the form that sent it; report it. Nothing was changed.",
			),
		};
	}
	const survived = out && changeSurvived(out, intent, at, changed);
	if (!out || !survived)
		return {
			refusal: refuse(
				"invalid-intent",
				`the change to ${owner} did not survive loading (unknown fields or refs that resolve nowhere are dropped)`,
				"This is a defect in the form that sent it; report it. Nothing was changed.",
			),
		};
	return { schema: out, set };
}

function changeSurvived(
	out: WorkspaceSchema,
	intent: Intent,
	at: JsonPath,
	changed: WorkspaceSchema,
): boolean {
	if (intent.op === "remove") {
		const before = valueAtPath(changed, at);
		const after = valueAtPath(out, at);
		return jsonEqual(before, after);
	}
	if (intent.op === "update" || intent.op === "edit") {
		const node = valueAtPath(out, at);
		// Removing a field has nothing to preserve: core may restore a default
		// (an empty description), which is its answer, not a dropped change.
		return changesOf(intent).every(
			(change) =>
				change.value === undefined ||
				(isPlain(node) &&
					Object.hasOwn(node, change.field) &&
					jsonContains(node[change.field], change.value)),
		);
	}
	if (intent.id !== undefined)
		return jsonContains(valueAtPath(out, at), intent.element);
	const list = valueAtPath(out, at);
	return (
		Array.isArray(list) && list.some((it) => jsonContains(it, intent.element))
	);
}

// -------------------------------------------------------------- legal checks

/**
 * The `$ref`s the holder's field carries in the owner's JSON before this
 * write, as the owner writes them. Only an update, edit or remove of the
 * element a check names can have a field to read; for an add, or a holder that
 * is another element, the answer is the empty set, which can only make the
 * guard stricter.
 */
function priorRefsOf(
	canonical: Plain,
	intent: Intent,
	pointer: string,
): (check: RefCheck) => ReadonlySet<string> {
	const at =
		intent.op === "add" ? undefined : jsonPathOfRef(canonical, pointer);
	const node = at && valueAtPath(canonical, at);
	const held = isPlain(node)
		? new Map(
				Object.entries(node).map(([k, v]) => [k, new Set(embeddedRefs(v))]),
			)
		: new Map<string, Set<string>>();
	return (check) =>
		intent.op !== "add" && check.holder.ref === intent.target.ref
			? (held.get(check.field) ?? new Set())
			: new Set();
}

const kindOfContext = (context: BoundedContext) =>
	context.external
		? "external"
		: context.boundaryOnly
			? "boundaryOnly"
			: context.bigBallOfMud
				? "bigBallOfMud"
				: "modelled";

const ILLEGAL_ACTION =
	"Open the form again and pick from the refreshed list; nothing was changed.";

/**
 * Judges every selected choice against `post`, the set the write would
 * produce, so a sibling, root or relation edited in the same intent counts.
 * The holder is read from `post`, never from the form. A ref is exempt only
 * when the host listed it as illegal at opening AND the field already held it
 * before this write. No rule is run and no diagnostics are compared: an
 * unrelated or pinned defect elsewhere is invisible here.
 */
function legalProblems(
	assembled: Assembled,
	ownerBefore: Workspace,
	post: WorkspaceSet,
	owner: SetPath,
	intent: Intent,
	priorRefs: (check: RefCheck) => ReadonlySet<string>,
): WriteResult | undefined {
	const ownerAfter = post.byPath(owner);
	const defect = (detail: string) =>
		refuse(
			"invalid-intent",
			detail,
			"This is a defect in the form that sent it; report it. Nothing was changed.",
		);
	if (!ownerAfter) return defect(`${owner} is not in the changed set`);
	const illegal: IllegalChoice[] = [];
	for (const check of intent.checks ?? []) {
		const holder = post.resolve(
			ownerAfter,
			check.holder.ref,
			kindFor(check.holder.kind),
		);
		if (!holder.ok)
			return defect(
				`the legal check of ${check.field} names ${check.holder.ref}, which is not in the changed ${owner}`,
			);
		try {
			if (check.class === "LC-BC-FLAGS") {
				const after = holder.target;
				if (!(after instanceof BoundedContext))
					return defect(`${check.holder.ref} is not a bounded context`);
				const written = kindOfContext(after);
				const before = assembled.set.resolve(
					ownerBefore,
					check.holder.ref,
					kindFor(check.holder.kind),
				);
				if (
					before.ok &&
					kindOfContext(before.target as BoundedContext) === written
				)
					continue;
				const reason = systemKindProblem(after, written);
				if (reason)
					illegal.push({
						field: check.field,
						ref: check.holder.ref,
						label: `${after.name} (${holder.workspace.file})`,
						rule:
							written === "external"
								? "external-is-boundary"
								: "boundary-only-is-boundary",
						reason,
					});
				continue;
			}
			const exempt = new Set(
				(check.openedIllegal ?? []).filter((ref) => priorRefs(check).has(ref)),
			);
			const facts = holderOf(post, holder.target);
			for (const chosen of check.chosen) {
				if (exempt.has(chosen.ref)) continue;
				const provider = (intent.providers ?? []).find(
					(p) => p.ref === chosen.ref,
				) as TypedRef;
				const target = post.resolve(
					ownerAfter,
					chosen.ref,
					kindFor(provider.kind),
				);
				if (!target.ok) {
					illegal.push({
						field: check.field,
						ref: chosen.ref,
						label: chosen.ref,
						rule: "stale-choice",
						reason: `${chosen.ref} no longer names ${describeKind(provider.kind)} (${target.detail})`,
					});
					continue;
				}
				const verdict = isLegalTarget(
					post,
					check.class,
					{ ...facts, relation: facts.relation ?? chosen.relation },
					target.target,
				);
				if (!verdict.ok)
					illegal.push({
						field: check.field,
						ref: chosen.ref,
						label: `${(target.target as { name?: string }).name ?? chosen.ref} (${target.workspace.file})`,
						rule: verdict.rule,
						reason: verdict.reason,
					});
			}
		} catch (e) {
			return defect(
				`the legal check of ${check.field} could not be evaluated: ${messageOf(e)}`,
			);
		}
	}
	if (illegal.length === 0) return undefined;
	return refuse(
		"illegal-choice",
		illegal.map((it) => `${it.field}: ${it.reason}`).join("; "),
		ILLEGAL_ACTION,
		illegal,
	);
}

/** The owner as core writes it, keeping the `$schema` the file already had, two-space indented with a final newline. */
function withSchemaKey(raw: WorkspaceSchema, schema: WorkspaceSchema): string {
	const withKey =
		typeof raw.$schema === "string"
			? { $schema: raw.$schema, ...schema }
			: schema;
	return `${JSON.stringify(withKey, null, 2)}\n`;
}

// ------------------------------------------------------------------ disk path

const sha1 = (text: string) => createHash("sha1").update(text).digest("hex");

/**
 * The disk implementation of {@link TextIo} under `root`: reads UTF-8 text
 * stamped by its SHA-1, and writes by temp file plus rename after comparing
 * the stamp with a fresh read. Detect-before-check, not compare-and-swap.
 */
export function diskTextIo(root: string): TextIo {
	const absolute = (file: SetPath): string | undefined => {
		if (!validateSetPath(file).ok) return undefined;
		return path.join(root, ...file.split("/"));
	};
	return {
		async readText(file) {
			const target = absolute(file);
			if (!target) return { ok: false, detail: "not a set path" };
			try {
				const text = await fs.readFile(target, "utf8");
				return { ok: true, text, hash: sha1(text) };
			} catch (e) {
				return {
					ok: false,
					detail: messageOf(e),
				};
			}
		},
		async writeIfUnchanged(file, text, expectedHash) {
			const target = absolute(file);
			if (!target) return { status: "failed", detail: "not a set path" };
			let current: string;
			try {
				current = await fs.readFile(target, "utf8");
			} catch {
				return { status: "changed" };
			}
			if (sha1(current) !== expectedHash) return { status: "changed" };
			const tmp = `${target}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
			try {
				await fs.writeFile(tmp, text, "utf8");
				await fs.rename(tmp, target);
			} catch (e) {
				await fs.rm(tmp, { force: true });
				return {
					status: "failed",
					detail: messageOf(e),
				};
			}
			return { status: "ok", via: "disk" };
		},
	};
}
