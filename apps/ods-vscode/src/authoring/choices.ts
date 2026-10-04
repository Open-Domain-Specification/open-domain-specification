import {
	Aggregate,
	Answer,
	Attribute,
	BoundedContext,
	type Candidate,
	Consumable,
	Consumption,
	ContextRelationship,
	DataSchema,
	Deadline,
	Domain,
	decodeWirePath,
	Entity,
	GlossaryTerm,
	holderForNew,
	holderOf,
	Invariant,
	identityKeyOf,
	isLegalTarget,
	kindWord,
	type LegalClassId,
	type LegalHolder,
	legalTargets,
	nameOf,
	Policy,
	Process,
	REF_KINDS,
	Service,
	type SetPath,
	Subdomain,
	Team,
	ValueObject,
	type Verdict,
	Workspace,
	type WorkspaceSchema,
	WorkspaceSet,
	workspaceOf,
} from "@open-domain-specification/core";
import { jsonPathOfRef, valueAtPath } from "../locate";
import type { RefKindName } from "../writer";
import type { FieldDescriptor } from "./families";
import type { Choice, FamilyId, FieldValue } from "./form-protocol";

/**
 * Fresh legal choices for the reference fields of a form. Everything here
 * reads a {@link WorkspaceSet} the caller has just read (editor-first, from
 * every file), never a display model, and asks core's `legalTargets` and
 * `isLegalTarget`, the same predicate the writer applies to the set a write
 * would produce, so a list and the guard cannot disagree.
 *
 * The holder a list is asked for is the element as SAVED plus whatever the
 * draft has changed in the fields that govern the answer (an entity's root, an
 * attribute's other typing field, a relation's type, an invariant's timing and
 * guards, the context at the other end of a relationship). The writer rebuilds
 * the same facts from the post-write set with `holderOf`, so the two agree.
 */

export type Plain = { [key: string]: unknown };
export type Draft = Record<string, FieldValue>;

/** What a form is about, resolved in one fresh read. */
export type Subject = {
	mode: "add" | "update";
	family: FamilyId;
	/** The file that owns the element (update) or the parent (add): the only file a write may change. */
	file: SetPath;
	workspace: Workspace;
	/** Update: the element (the owner of a relation row; the workspace itself for the workspace). Add: the parent. */
	element: object;
	/** The ref of `element` in `file`; `#` for the workspace. */
	ref: string;
	/** The canonical JSON of the element (the row for an entity relation), or of the parent for an add. */
	node: Plain;
	/** Entity relation update: the row's index in the owner's `relations`. */
	row?: number;
	/** Entity relation update: the canonical JSON of the owner. */
	ownerNode?: Plain;
	/** Add: the family of the parent. */
	parentFamily?: FamilyId;
};

/** The kind the writer addresses an element of a family by. */
export const kindOfFamily = (family: FamilyId): RefKindName =>
	family === "relationship"
		? "relationship"
		: family === "consumption"
			? "consumption"
			: "element";

/** The family of a model element, or undefined for one no form authors. */
export function familyOfElement(element: object): FamilyId | undefined {
	if (element instanceof Workspace) return "workspace";
	if (element instanceof Domain) return "domain";
	if (element instanceof Subdomain) return "subdomain";
	if (element instanceof Team) return "team";
	if (element instanceof BoundedContext) return "context";
	if (element instanceof ContextRelationship) return "relationship";
	if (element instanceof Aggregate) return "aggregate";
	if (element instanceof Entity) return "entity";
	if (element instanceof Attribute) return "attribute";
	if (element instanceof Invariant) return "invariant";
	if (element instanceof Service) return "service";
	if (element instanceof Consumable) return "consumable";
	if (element instanceof Consumption) return "consumption";
	if (element instanceof Policy) return "policy";
	if (element instanceof Process) return "process";
	if (element instanceof Deadline) return "deadline";
	if (element instanceof GlossaryTerm) return "term";
	if (element instanceof DataSchema) return "schema";
	if (element instanceof ValueObject) return "valueObject";
	return undefined;
}

/**
 * The element an identity token names in `set`, or undefined. A token is
 * `identityKeyOf`: the wire path of a file and a pointer in it. Whatever is
 * found is only a candidate: whether it may be chosen is `isLegalTarget`'s.
 */
export function elementOfToken(
	set: WorkspaceSet,
	token: unknown,
): object | undefined {
	if (typeof token !== "string") return undefined;
	const hash = token.indexOf("#");
	if (hash <= 0) return undefined;
	const path = decodeWirePath(token.slice(0, hash));
	if (!path.ok) return undefined;
	const workspace = set.byPath(path.path);
	if (!workspace) return undefined;
	const pointer = token.slice(hash);
	const found =
		workspace.getByRef(pointer) ??
		workspace.findRelationship(pointer) ??
		workspace.findConsumption(pointer);
	return found && identityKeyOf(found) === token ? found : undefined;
}

const tokensOf = (value: FieldValue | undefined): string[] =>
	typeof value === "string"
		? value
			? [value]
			: []
		: Array.isArray(value)
			? (value as unknown[]).filter((v): v is string => typeof v === "string")
			: [];

/** The kind a typed provider of `element` has, so the writer re-resolves it with the kind the field reads. */
export function providerKindOf(
	cls: LegalClassId,
	element: object,
): RefKindName {
	switch (cls) {
		case "LC-TEAM":
			return "team";
		case "LC-SUBDOMAIN":
			return "subdomain";
		case "LC-CONTEXT":
			return "context";
		case "LC-OWN-AGGREGATE-ENTITY":
			return "entity";
		case "LC-VALUE-OBJECT-BORROWABLE":
			return "valueObject";
		case "LC-SCHEMA-ATTRIBUTE":
		case "LC-SCHEMA-CARRY":
			return "schema";
		case "LC-IDENTITY-TARGET":
			return "identityTarget";
		case "LC-RELATION-TARGET":
			return "relationTarget";
		case "LC-CONSTRAINS":
			return "constrainable";
		case "LC-TERM-EMBODIES":
			return "element";
		case "LC-RAISES":
		case "LC-CONSUMED":
		case "LC-OPERATION-OWN-CONTEXT":
			return "consumable";
		case "LC-BY":
			return "caller";
		case "LC-AGREEMENT":
			return "relationship";
		case "LC-POLICY-ON":
		case "LC-PROCESS-STARTS":
			return element instanceof Answer ? "answer" : "consumable";
		case "LC-PROCESS-TRIGGER":
			return element instanceof Answer
				? "answer"
				: element instanceof Deadline
					? "element"
					: "consumable";
		case "LC-DEADLINE-FROM":
			return element instanceof Answer ? "answer" : "consumable";
	}
}

/** The kind a held ref is read with, to find the element it names. */
export const heldKindOf = (cls: LegalClassId): RefKindName =>
	cls === "LC-AGREEMENT" ? "relationship" : "element";

/** The element a written ref names, read from `from` the way the loader reads it. */
export function resolveHeld(
	set: WorkspaceSet,
	from: Workspace,
	written: string,
	cls: LegalClassId,
): object | undefined {
	const found = set.resolve(
		from,
		written,
		REF_KINDS[heldKindOf(cls)] as unknown as Parameters<
			WorkspaceSet["resolve"]
		>[2],
	);
	return found.ok ? found.target : undefined;
}

// ----------------------------------------------------------- how to show one

/** The file an element is in, whatever it is. */
const homeFile = (element: object): string =>
	(workspaceOf(element)?.file as string | undefined) ?? "";

export function choiceOf(candidate: Candidate): Choice {
	const where = candidate.path.length
		? ` in ${candidate.path.join(" / ")}`
		: "";
	return {
		value: candidate.key,
		label: candidate.name,
		detail: `${candidate.kind}${where}`,
		file: candidate.file,
	};
}

/** A choice for an element the field holds that is not a legal choice now: shown, selected, and explained. */
export function heldChoice(element: object, disabledReason?: string): Choice {
	return {
		value: identityKeyOf(element as { ref: string }),
		label: nameOf(element),
		detail: kindWord(element),
		file: homeFile(element),
		...(disabledReason ? { disabledReason } : {}),
	};
}

// ------------------------------------------------------------------- holders

/** The element a draft token names in `set`, if it names one. */
const elementOf = (set: WorkspaceSet, value: FieldValue | undefined) =>
	elementOfToken(set, tokensOf(value)[0]);

/**
 * The holder facts a reference field of the form is judged against: the
 * element as saved (or the parent's facts for an add), overlaid with what the
 * draft has changed in the fields that govern legality. Fields that govern
 * nothing are never overlaid, so a form that has not touched them sees exactly
 * what the writer will derive.
 */
export function holderFor(
	set: WorkspaceSet,
	subject: Subject,
	field: FieldDescriptor,
	draft: Draft,
): LegalHolder {
	const { family } = subject;
	const overlay: Partial<LegalHolder> = {};
	if (family === "entity") overlay.root = draft.root === true;
	if (family === "attribute")
		overlay.attribute = {
			valueobject: elementOf(set, draft.valueobject) as ValueObject | undefined,
			schema: elementOf(set, draft.schema) as DataSchema | undefined,
		};
	if (family === "entityRelation")
		overlay.relation =
			typeof draft.relation === "string" && draft.relation
				? (draft.relation as LegalHolder["relation"])
				: undefined;
	if (family === "invariant") {
		const timing = draft.timing;
		const current = (
			subject.mode === "update"
				? holderOf(set, subject.element).invariant?.owner
				: subject.element
		) as NonNullable<LegalHolder["invariant"]>["owner"];
		overlay.invariant = {
			owner: current,
			precondition: timing === "precondition",
			postcondition: timing === "postcondition",
			guarded: tokensOf(draft.constrains)
				.map((t) => elementOfToken(set, t))
				.filter((it): it is Consumable => it instanceof Consumable),
		};
	}
	if (family === "consumption" && subject.mode === "add") {
		const consumable = elementOf(set, draft.consumable);
		if (consumable instanceof Consumable) overlay.consumable = consumable;
	}
	if (family === "relationship") {
		const other =
			field.name === "upstream"
				? draft.downstream
				: field.name === "downstream"
					? draft.upstream
					: field.name === "participantA"
						? draft.participantB
						: field.name === "participantB"
							? draft.participantA
							: undefined;
		const context = elementOf(set, other);
		if (context instanceof BoundedContext) overlay.context = context;
	}
	if (subject.mode === "update" && family !== "entityRelation")
		return { ...holderOf(set, subject.element), ...overlay };
	return holderForNew(
		set,
		subject.element,
		family,
		overlay as Partial<LegalHolder>,
	);
}

/**
 * What a reference field is judged against: a set, the holder in it, and how to
 * find, in that set, an element the saved set holds.
 *
 * Almost always this is the saved set and {@link holderFor}. A policy's or
 * process's answer triggers (`on`, `ends`) depend on what it issues and starts
 * on (`hearsAnswerOf`, `processTrigger`), which the form may have changed and
 * not saved yet; then the set is a REAL one loaded from the canonical files
 * with the draft's `then` and `starts` written into the element, which is
 * exactly the set the writer judges the save against. The core predicates run
 * on it unchanged: no model object is touched and nothing is faked.
 */
export type Judging = {
	set: WorkspaceSet;
	holder: LegalHolder;
	/** The element of `set` that is `element` of the saved set (identity key), or undefined. */
	same(element: object): object | undefined;
	/**
	 * Set only when the draft's `then`/`starts` changed the answer triggers and the
	 * set they produce could not be built: the field cannot be judged at all, so
	 * the saved set's choices must not be offered in its place. Says what failed
	 * and what to do.
	 */
	failure?: string;
};

const DRAFT_ID = "draft_form_element";

/** The fields of a policy or process that decide which answers and triggers it may wait on. */
const REACTION_DRIVERS = ["then", "starts"] as const;
const TRIGGER_CLASSES: ReadonlyArray<LegalClassId> = [
	"LC-POLICY-ON",
	"LC-PROCESS-TRIGGER",
];

/** A built set, or why it could not be built. */
const draftSets = new WeakMap<
	WorkspaceSet,
	Map<string, WorkspaceSet | string>
>();

/**
 * The set the save would produce, as far as `then` and `starts` of the form's
 * policy or process go. Undefined when the draft does not change either (the
 * saved set already is that set); a string, the reason, when the set cannot be built.
 */
function draftReactionSet(
	set: WorkspaceSet,
	subject: Subject,
	draft: Draft,
): { set: WorkspaceSet; element: object } | string | undefined {
	const collection =
		subject.family === "policy"
			? "policies"
			: subject.family === "process"
				? "processes"
				: undefined;
	if (!collection) return undefined;
	const wanted: Record<string, string[]> = {};
	for (const key of REACTION_DRIVERS)
		if (key in draft || subject.family === "policy")
			wanted[key] = tokensOf(draft[key]);
	if (subject.family === "policy") delete wanted.starts;
	const saved =
		subject.mode === "update" ? (subject.node as Plain) : ({} as Plain);
	const same = Object.keys(wanted).every((key) => {
		const was = Array.isArray(saved[key])
			? (saved[key] as Array<{ $ref?: string }>)
					.map((r) => r.$ref)
					.filter((r): r is string => typeof r === "string")
			: [];
		const now = wanted[key].map((token) => {
			const element = elementOfToken(set, token);
			return element ? writtenRef(set, subject.workspace, element) : token;
		});
		return was.length === now.length && was.every((r, i) => r === now[i]);
	});
	if (same && subject.mode === "update") return undefined;
	const memo = draftSets.get(set) ?? new Map<string, WorkspaceSet | string>();
	draftSets.set(set, memo);
	const key = JSON.stringify([subject.mode, subject.ref, subject.file, wanted]);
	const refAt = (post: WorkspaceSet) => {
		const ws = post.byPath(subject.file);
		const ref =
			subject.mode === "update"
				? subject.ref
				: `${subject.ref}/${collection}/${DRAFT_ID}`;
		return ws?.getByRef(ref);
	};
	let post = memo.get(key);
	if (post === undefined) {
		try {
			const schemas = new Map(
				[...set.toSchemas()].map(([file, schema]) => [
					file,
					JSON.parse(JSON.stringify(schema)) as WorkspaceSchema,
				]),
			);
			const owner = schemas.get(subject.file);
			const at = owner && jsonPathOfRef(owner, subject.ref);
			const parent = at && valueAtPath(owner, at);
			if (!parent || typeof parent !== "object") {
				post = "the element is not in the files the model was read from";
				memo.set(key, post);
				return post;
			}
			let target = parent as Plain;
			if (subject.mode === "add") {
				const group = (target[collection] ?? {}) as Plain;
				target[collection] = group;
				const draftElement: Plain = { name: "Draft" };
				group[DRAFT_ID] = draftElement;
				target = draftElement;
			}
			for (const [field, tokens] of Object.entries(wanted)) {
				const refs = tokens
					.map((token) => elementOfToken(set, token))
					.filter((it): it is object => it !== undefined)
					.map((it) => ({ $ref: writtenRef(set, subject.workspace, it) }));
				if (refs.length) target[field] = refs;
				else delete target[field];
			}
			post = WorkspaceSet.fromSchemas(schemas);
		} catch (error) {
			post = error instanceof Error ? error.message : String(error);
		}
		memo.set(key, post);
	}
	if (typeof post === "string") return post;
	const element = refAt(post);
	return element
		? { set: post, element }
		: "the element is missing from the set the draft produces";
}

/** The set, holder and element lookup a field is judged with now. */
export function judgingFor(
	set: WorkspaceSet,
	subject: Subject,
	field: FieldDescriptor,
	draft: Draft,
): Judging {
	const saved: Judging = {
		set,
		holder: holderFor(set, subject, field, draft),
		same: (element) => element,
	};
	const cls = field.ref?.cls;
	if (!cls || !TRIGGER_CLASSES.includes(cls)) return saved;
	const drafted = draftReactionSet(set, subject, draft);
	if (!drafted) return saved;
	if (typeof drafted === "string")
		return {
			...saved,
			failure: `"${field.label}" cannot be judged against your unsaved changes to "then" and "starts" (${drafted}). Nothing is offered here until it can: reload the model files or reopen the form, and fix the file if it is invalid.`,
		};
	return {
		set: drafted.set,
		holder: holderOf(drafted.set, drafted.element),
		same: (element) =>
			elementOfToken(drafted.set, identityKeyOf(element as { ref: string })),
	};
}

/** Every element the field may name now, in the order the set holds them. */
export function legalChoices(
	set: WorkspaceSet,
	cls: LegalClassId,
	holder: LegalHolder,
): Candidate[] {
	return legalTargets(set, cls, holder);
}

export function verdictOf(
	set: WorkspaceSet,
	cls: LegalClassId,
	holder: LegalHolder,
	element: object,
): Verdict {
	return isLegalTarget(set, cls, holder, element);
}

/** The ref a workspace writes to name an element, as the owning file would. */
export const writtenRef = (
	set: WorkspaceSet,
	from: Workspace,
	element: object,
): string => set.refTo(from, element as { ref: string });
