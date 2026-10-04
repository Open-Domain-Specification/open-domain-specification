import { randomUUID } from "node:crypto";
import {
	type Aggregate,
	BoundedContext,
	type Consumable,
	type Consumption,
	DataSchema,
	decodeRefSegment,
	Entity,
	holderOf,
	identityKeyOf,
	idOf,
	isDirectedRelationshipType,
	type LegalClassId,
	type LegalHolder,
	nameOf,
	relationForChoices,
	type Service,
	type SetPath,
	systemKindProblem,
	ValueObject,
	type Workspace,
	type WorkspaceSet,
	workspaceOf,
} from "@open-domain-specification/core";
import { type FreshRead, readFreshSet } from "../create";
import { jsonPathOfRef, valueAtPath } from "../locate";
import {
	applyIntent,
	type Intent,
	type Json,
	type TextIo,
	type WriteResult,
} from "../writer";
import {
	choiceOf,
	type Draft,
	elementOfToken,
	familyOfElement,
	heldChoice,
	holderFor,
	judgingFor,
	legalChoices,
	type Plain,
	resolveHeld,
	type Subject,
	verdictOf,
} from "./choices";
import {
	DISPOSITION,
	type FamilyDescriptor,
	type FieldDescriptor,
	familyById,
	LINK_KINDS,
	type SYSTEM_KINDS,
} from "./families";
import type {
	Choice,
	EvidenceValue,
	FamilyId,
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
import {
	buildIntent,
	consumptionKey,
	decodeNode,
	emptyDraft,
	fieldChanged,
	type HeldRefs,
	mayKeepPinned,
	orderedBy,
} from "./intent";

/**
 * One open form, vscode-free: the unit the forms are tested through. It reads
 * the model fresh (editor first, every file) each time it opens, refreshes and
 * saves, never from a display cache, and turns a Save into exactly one writer
 * intent or into field-level errors with nothing written.
 *
 * Limits stated here so they are not discovered later: this is the host half
 * only (no webview, no rendering); unknown JSON properties are dropped when the
 * owning file is re-emitted (the writer's canonicalization limit). A policy's
 * or process's answer triggers (`on`, `ends`) are listed against the `then` and
 * `starts` the form holds NOW: a real set loaded with those drafted values, the
 * one the writer judges a save against (choices.ts `judgingFor`).
 */

export type AddRequest = {
	kind: "add";
	/** The set path of the file that holds the parent. */
	file: SetPath;
	/** The ref of the parent in that file; `#` for the workspace. */
	parentRef: string;
	family: FamilyId;
};
export type UpdateRequest = {
	kind: "update";
	file: SetPath;
	ref: string;
	family: FamilyId;
	/** Entity relation only: the row of the owner's `relations`, since a relation has no ref. */
	row?: number;
};
export type FormRequest = AddRequest | UpdateRequest;

/** What a session needs from the host: a fresh read of the whole set and the writer. */
export interface AuthoringPort {
	readFresh(): Promise<FreshRead>;
	applyIntent(intent: Intent): Promise<WriteResult>;
}

/** The port over a text io and a file list: the writer's own `applyIntent` and the fresh read of `create.ts`. */
export function portOf(
	io: TextIo,
	files: ReadonlyArray<SetPath>,
): AuthoringPort {
	return {
		readFresh: () => readFreshSet(io, files),
		applyIntent: (intent) => applyIntent(io, files, intent),
	};
}

export type OpenOutcome =
	| { ok: true; session: FormSession }
	| { ok: false; message: string; action: string };

const CANONICAL_NOTE =
	"Saving rewrites this file in canonical form: properties this version does not know are dropped, as are references that resolve to nothing in the same file. Only this file is written.";

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const isPlain = (value: unknown): value is Plain =>
	typeof value === "object" && value !== null && !Array.isArray(value);

type Problem = { message: string; action: string };

/** One fresh read with the subject resolved in it. */
type Frame = {
	fresh: FreshRead;
	subject: Subject;
	held: Record<string, HeldRefs>;
};

type Opened = {
	family: FamilyDescriptor;
	fields: FieldDescriptor[];
	initial: Draft;
	json: Record<string, Json | undefined>;
	initialRelations?: Json[];
	/** HOST-OWNED. Computed from this session's own read at open; no message can set or change it. */
	illegalAtOpen: Record<string, string[]>;
};

const WORD = (family: FamilyDescriptor) => family.label.toLowerCase();

export class FormSession {
	private closed = false;
	private draft: Draft;
	private ownerFile: SetPath;
	private ownerTouched = false;
	private init_: FormInit | undefined;

	private constructor(
		private readonly port: AuthoringPort,
		private readonly request: FormRequest,
		private readonly opened: Opened,
		private readonly requestId: string,
	) {
		this.draft = clone(opened.initial);
		this.ownerFile = request.file;
	}

	/** Opens a form: one fresh read, the subject resolved in it, and the draft filled from what the file holds. */
	static async open(
		port: AuthoringPort,
		request: FormRequest,
	): Promise<OpenOutcome> {
		const family = familyById(request.family);
		const operation = family?.[request.kind];
		if (!family || !operation)
			return {
				ok: false,
				message: `There is no ${request.kind} form for ${request.family}.`,
				action: "Choose an element that can be added or edited.",
			};
		let fresh: FreshRead;
		try {
			fresh = await port.readFresh();
		} catch (e) {
			return {
				ok: false,
				message: `The model could not be read: ${e instanceof Error ? e.message : String(e)}`,
				action: "Check the .ods folder, then open the form again.",
			};
		}
		const subject = subjectOf(fresh, request, request.file);
		if ("message" in subject) return { ok: false, ...subject };
		const fields = operation.fields;
		let initial: Draft;
		let json: Record<string, Json | undefined> = {};
		let held: Record<string, HeldRefs> = {};
		let initialRelations: Json[] | undefined;
		if (request.kind === "update") {
			const decoded = decodeNode(
				fresh.set,
				subject.workspace,
				subject.node,
				fields,
			);
			initial = decoded.draft;
			json = decoded.json;
			held = decoded.held;
			if (request.family === "entityRelation")
				initialRelations = clone(
					(subject.ownerNode?.relations as Json[] | undefined) ?? [],
				);
		} else initial = emptyDraft(fields);
		const opened: Opened = {
			family,
			fields,
			initial,
			json,
			initialRelations,
			illegalAtOpen: {},
		};
		opened.illegalAtOpen = illegalAtOpen({ fresh, subject, held }, opened);
		const session = new FormSession(port, request, opened, randomUUID());
		session.init_ = session.render({ fresh, subject, held }, "init");
		return { ok: true, session };
	}

	/** What the form first shows. */
	init(): FormInit {
		return this.init_ as FormInit;
	}

	/** ready -> init; change -> refresh; save -> validation, refused or saved (one intent, one file); cancel -> nothing written. */
	async handle(msg: FormToHost): Promise<HostToForm[]> {
		if (msg.type === "cancel") {
			this.closed = true;
			return [];
		}
		if (this.closed)
			return [
				this.validation([
					{
						field: null,
						message:
							"This form is closed. Open it again from the tree or the command palette.",
					},
				]),
			];
		if (msg.requestId !== this.requestId)
			return [
				this.validation([
					{
						field: null,
						message:
							"This message belongs to another form. Close this one and open it again.",
					},
				]),
			];
		if (msg.type === "ready") return [this.init()];
		try {
			return msg.type === "change"
				? await this.change(msg)
				: await this.save(msg);
		} catch (e) {
			return [
				this.validation([
					{
						field: null,
						message: `The form could not be processed: ${e instanceof Error ? e.message : String(e)}. Nothing was changed.`,
					},
				]),
			];
		}
	}

	// ------------------------------------------------------------------ change

	private async change(
		msg: Extract<FormToHost, { type: "change" }>,
	): Promise<HostToForm[]> {
		const errors = this.merge(msg.values, msg.owner, msg.field === "owner");
		if (errors.length) return [this.validation(errors)];
		const frame = await this.frame();
		if ("message" in frame)
			return [this.validation([{ field: null, ...frame }])];
		this.prune(frame);
		return [this.render(frame, "refresh")];
	}

	// -------------------------------------------------------------------- save

	private async save(
		msg: Extract<FormToHost, { type: "save" }>,
	): Promise<HostToForm[]> {
		const errors = this.merge(msg.values, msg.owner, false);
		if (errors.length) return [this.validation(errors)];
		let frame = await this.frame();
		if ("message" in frame)
			return [this.validation([{ field: null, ...frame }])];
		if (
			this.opened.family.id === "relationship" &&
			this.request.kind === "add" &&
			msg.owner === undefined &&
			!this.ownerTouched &&
			this.defaultOwner(frame) !== this.ownerFile
		) {
			this.ownerFile = this.defaultOwner(frame);
			const again = await this.frame();
			if ("message" in again)
				return [this.validation([{ field: null, ...again }])];
			frame = again;
		}
		const { subject, fresh } = frame;
		const { fields } = this.opened;
		this.resetHidden(frame);
		const visible = (f: FieldDescriptor) =>
			this.isVisible(f, frame, this.draft);

		const problems = [
			...this.requiredProblems(visible),
			...this.valueProblems(frame, visible),
			...this.identityProblems(frame),
		];
		if (problems.length) return [this.validation(problems)];
		const refProblems = this.referenceProblems(frame, visible);
		if (refProblems.length) return [this.validation(refProblems)];
		const keyProblems = this.consumptionProblems(frame);
		if (keyProblems.length) return [this.validation(keyProblems)];

		// A changed list that also holds refs this form cannot read would lose them.
		for (const f of fields.filter((x) => x.ref)) {
			const unreadable = frame.held[f.name]?.unresolved ?? [];
			if (
				unreadable.length &&
				this.request.kind === "update" &&
				fieldChanged(fields, f.name, this.draft, this.opened.initial)
			)
				return [
					this.validation([
						{
							field: f.name,
							message: `${f.label} also holds ${unreadable.length} reference(s) that name nothing this model can read (${unreadable.join(", ")}). Saving it here would drop them, so fix or remove them in the JSON first.`,
						},
					]),
				];
		}

		const built = buildIntent({
			set: fresh.set,
			subject,
			fields,
			readOnly: this.opened.family[this.request.kind]?.readOnly ?? [],
			visible,
			draft: this.draft,
			initial: this.opened.initial,
			json: this.opened.json,
			held: frame.held,
			opened: this.opened.illegalAtOpen,
			initialRelations: this.opened.initialRelations,
			ownerFile: this.ownerFile,
		});
		if (!built.ok) return [this.validation(built.errors)];
		if (!built.intent) {
			this.closed = true;
			return [
				{
					type: "saved",
					requestId: this.requestId,
					file: subject.file,
					wrote: "noop",
					message: "Nothing changed, so nothing was written.",
				},
			];
		}
		const result = await this.port.applyIntent(built.intent);
		if (result.ok) {
			this.closed = true;
			return [
				{
					type: "saved",
					requestId: this.requestId,
					file: result.file,
					wrote: result.wrote,
					message: `${savedMessage(result.wrote, result.file)}${built.rekey ? ` ${built.rekey}` : ""}`,
				},
			];
		}
		return [
			{
				type: "refused",
				requestId: this.requestId,
				cause: result.cause,
				message: result.detail,
				action: result.action,
				errors: this.refusalErrors(result),
			},
		];
	}

	private refusalErrors(
		result: Extract<WriteResult, { ok: false }>,
	): FieldError[] {
		if (result.illegal)
			return result.illegal.map((it) => ({
				field: this.fieldOfKey(it.field),
				message: `${it.label}: ${it.reason}`,
			}));
		if (result.cause === "duplicate")
			return [{ field: "name", message: `${result.detail}. ${result.action}` }];
		return [{ field: null, message: `${result.detail}. ${result.action}` }];
	}

	/** The form field a writer property name belongs to. */
	private fieldOfKey(key: string): string | null {
		if (key === "relations") return "target";
		if (key === "systemKind") return "systemKind";
		const f = this.opened.fields.find(
			(x) => x.name === key || x.writesJson.includes(key),
		);
		return f?.name ?? null;
	}

	// ------------------------------------------------------------ the frame

	/** A fresh read with the subject resolved again in it: nothing is carried from the last one. */
	private async frame(): Promise<Frame | Problem> {
		const fresh = await this.port.readFresh();
		const subject = subjectOf(fresh, this.request, this.ownerFile);
		if ("message" in subject) return subject;
		const held =
			this.request.kind === "update"
				? decodeNode(
						fresh.set,
						subject.workspace,
						subject.node,
						this.opened.fields,
					).held
				: {};
		return { fresh, subject, held };
	}

	// ------------------------------------------------------------- the draft

	private merge(
		values: Record<string, FieldValue>,
		owner: string | undefined,
		ownerChanged: boolean,
	): FieldError[] {
		const errors: FieldError[] = [];
		const next: Draft = { ...this.draft };
		for (const [name, raw] of Object.entries(values ?? {})) {
			const f = this.opened.fields.find((x) => x.name === name);
			if (!f) {
				errors.push({
					field: null,
					message: `The form sent a value for "${name}", which this form does not have.`,
				});
				continue;
			}
			const coerced = coerce(f, raw);
			if ("error" in coerced)
				errors.push({ field: name, message: coerced.error });
			else next[name] = coerced.value;
		}
		if (owner !== undefined && this.opened.family.id === "relationship") {
			if (ownerChanged) this.ownerTouched = true;
			this.ownerFile = owner;
		} else if (owner !== undefined && owner !== this.request.file)
			errors.push({
				field: null,
				message: `This change can only be written to ${this.request.file}, the file that holds ${this.request.kind === "add" ? "the parent" : "the element"}.`,
			});
		// A list keeps the order the file has and appends what is new: the first caller of a consumption names its ref.
		for (const f of this.opened.fields)
			if (f.codec === "refs")
				next[f.name] = orderedBy(this.opened.initial[f.name], next[f.name]);
		if (errors.length === 0) this.draft = next;
		return errors;
	}

	/** Hidden fields keep what the file holds, whatever a message said. */
	private resetHidden(frame: Frame): void {
		for (const f of this.opened.fields)
			if (!this.isVisible(f, frame, this.draft))
				this.draft[f.name] = clone(this.opened.initial[f.name]);
	}

	/** On a refresh, choices nothing offers any more are dropped from the draft (a Save never does this: it reports them). */
	private prune(frame: Frame): void {
		this.resetHidden(frame);
		for (const f of this.opened.fields.filter((x) => x.ref)) {
			// A field that could not be judged keeps what the person chose; Save refuses it.
			if (this.judgmentFailure(frame, f, this.draft)) continue;
			const offered = new Set(
				this.choicesOf(frame, f, this.draft).map((c) => c.value),
			);
			const value = this.draft[f.name];
			if (typeof value === "string")
				this.draft[f.name] = offered.has(value) ? value : "";
			else if (f.codec === "rejects")
				this.draft[f.name] = (value as RejectionRow[]).filter((r) =>
					offered.has(r.schema),
				);
			else if (Array.isArray(value))
				this.draft[f.name] = (value as string[]).filter((t) => offered.has(t));
		}
		if (this.opened.family.id === "relationship" && !this.ownerTouched)
			this.ownerFile = this.defaultOwner(frame);
	}

	private defaultOwner(frame: Frame): SetPath {
		const end = elementOfToken(
			frame.fresh.set,
			this.draft.downstream || this.draft.participantA,
		);
		const file = end && (workspaceOf(end)?.file as SetPath | undefined);
		return file && frame.fresh.members.includes(file)
			? file
			: this.request.file;
	}

	// ------------------------------------------------------------ rendering

	private isVisible(f: FieldDescriptor, frame: Frame, draft: Draft): boolean {
		const { subject } = frame;
		switch (f.visible ?? "always") {
			case "directed":
			case "symmetric": {
				const type = subject.mode === "update" ? subject.node.type : draft.type;
				if (typeof type !== "string" || !type) return false;
				return (
					isDirectedRelationshipType(type as never) ===
					(f.visible === "directed")
				);
			}
			case "operation":
				return draft.type === "operation";
			case "schema-parent": {
				const owner =
					subject.mode === "update"
						? holderOf(frame.fresh.set, subject.element).attributeOwner
						: subject.element;
				const held = draft[f.name];
				return (
					owner instanceof DataSchema ||
					(typeof held === "string" && held !== "")
				);
			}
			default:
				return true;
		}
	}

	private choicesOf(frame: Frame, f: FieldDescriptor, draft: Draft): Choice[] {
		const { set } = frame.fresh;
		const cls = (f.ref as NonNullable<FieldDescriptor["ref"]>).cls;
		const judging = judgingFor(set, frame.subject, f, draft);
		// Judged against nothing: offer nothing rather than the saved set's choices.
		if (judging.failure) return [];
		const legal = legalChoices(judging.set, cls, judging.holder);
		const legalKeys = new Set(legal.map((c) => c.key));
		const kept: Choice[] = [];
		for (const [token, element] of frame.held[f.name]?.elements ?? []) {
			if (legalKeys.has(token)) continue;
			const there = judging.same(element);
			const verdict = there
				? verdictOf(judging.set, cls, judging.holder, there)
				: ({ ok: true } as const);
			const reason = verdict.ok
				? "It is no longer offered here."
				: verdict.reason;
			kept.push(
				heldChoice(
					element,
					this.pinnedTokens(frame, f, draft).has(token)
						? `${reason} Kept as it is while this field and the fields that decide it are left alone.`
						: reason,
				),
			);
		}
		return [...kept, ...legal.map(choiceOf)];
	}

	/** Why a reference field cannot be judged against the draft now, if it cannot. */
	private judgmentFailure(
		frame: Frame,
		f: FieldDescriptor,
		draft: Draft,
	): string | undefined {
		return judgingFor(frame.fresh.set, frame.subject, f, draft).failure;
	}

	/** Tokens of refs the field holds that were already illegal when the form opened and may stay. */
	private pinnedTokens(
		frame: Frame,
		f: FieldDescriptor,
		draft: Draft,
	): Set<string> {
		const out = new Set<string>();
		if (this.request.kind !== "update") return out;
		if (!mayKeepPinned(this.opened.fields, f, draft, this.opened.initial))
			return out;
		const opened = this.opened.illegalAtOpen[f.name] ?? [];
		for (const [token, ref] of frame.held[f.name]?.refs ?? [])
			if (opened.includes(ref)) out.add(token);
		return out;
	}

	private optionsOf(frame: Frame, f: FieldDescriptor): Option[] | undefined {
		if (f.name === "for") {
			const owner = frame.subject.element;
			const names =
				owner instanceof Entity || owner instanceof ValueObject
					? relationForChoices(owner)
					: [];
			const now = this.draft[f.name];
			const all =
				typeof now === "string" && now && !names.includes(now)
					? [now, ...names]
					: names;
			return all.map((value) => ({ value, label: value }));
		}
		if (!f.enum) return undefined;
		return f.enum.map((value) => {
			if (f.codec === "systemKind" && frame.subject.mode === "update") {
				const context = frame.subject.element;
				const reason =
					context instanceof BoundedContext &&
					value !== this.opened.initial[f.name]
						? systemKindProblem(context, value as (typeof SYSTEM_KINDS)[number])
						: undefined;
				return {
					value,
					label: value,
					...(reason ? { disabledReason: reason } : {}),
				};
			}
			return { value, label: value };
		});
	}

	private render(frame: Frame, type: "init"): FormInit;
	private render(frame: Frame, type: "refresh"): HostToForm;
	private render(frame: Frame, type: "init" | "refresh"): HostToForm {
		const fields: FormField[] = this.opened.fields.map((f) => {
			const field: FormField = {
				name: f.name,
				label: f.label,
				...(f.help ? { help: f.help } : {}),
				required: f.required === true,
				visible: this.isVisible(f, frame, this.draft),
				control: f.control,
				value: clone(this.draft[f.name]),
				...(f.refresh ? { refreshOnChange: true } : {}),
			};
			if (f.ref) {
				field.choices = this.choicesOf(frame, f, this.draft);
				const failure = this.judgmentFailure(frame, f, this.draft);
				if (failure) field.disabledReason = failure;
			}
			const options = this.optionsOf(frame, f);
			if (options) field.options = options;
			return field;
		});
		const notes = this.notes(frame);
		const owner = this.ownerInfo(frame);
		if (type === "refresh")
			return {
				type: "refresh",
				requestId: this.requestId,
				fields,
				notes,
				owner,
			};
		const { subject } = frame;
		return {
			type: "init",
			requestId: this.requestId,
			mode: this.request.kind,
			family: this.request.family,
			title:
				this.request.kind === "add"
					? `Add ${WORD(this.opened.family)}`
					: `Edit ${WORD(this.opened.family)}${nameOfSubject(subject) ? ` "${nameOfSubject(subject)}"` : ""}`,
			fields,
			readOnly: this.readOnlyRows(frame),
			notes,
			owner,
			stamp: frame.fresh.stamp,
		};
	}

	private ownerInfo(frame: Frame): OwnerInfo {
		if (this.opened.family.id !== "relationship" || this.request.kind !== "add")
			return { file: frame.subject.file };
		return {
			file: this.ownerFile,
			ownerChoices: frame.fresh.members.map((file) => ({
				value: file,
				label: file,
				detail: frame.fresh.set.byPath(file)?.name,
				file,
			})),
		};
	}

	private readOnlyRows(frame: Frame): ReadOnlyRow[] {
		const operation = this.opened.family[this.request.kind];
		if (!operation) return [];
		const rows: ReadOnlyRow[] = [];
		for (const row of operation.readOnly) {
			const value = readOnlyValue(frame, row.property);
			if (value === undefined) continue;
			rows.push({ label: row.label, value, reason: row.reason });
		}
		return rows;
	}

	// ----------------------------------------------------------------- notes

	private notes(frame: Frame): string[] {
		const notes = [CANONICAL_NOTE];
		const { subject } = frame;
		const set = frame.fresh.set;
		const family = this.opened.family.id;
		for (const f of this.opened.fields.filter((x) => x.ref)) {
			const pinned = this.pinnedTokens(frame, f, this.draft);
			if (pinned.size)
				notes.push(
					`${f.label} keeps ${pinned.size} reference(s) the model already rejected when this form opened. They stay while you leave ${[f.label, ...(f.governedBy ?? [])].join(" and ")} alone; change any of them and the reference must be legal.`,
				);
		}
		if (family === "consumable" && subject.mode === "update") {
			const dependants = dependantsOf(subject.element as Consumable);
			if (dependants.length)
				notes.push(
					`Changing the type is allowed. These may then be reported as taking the wrong kind of consumable (consumable-kind), which is advice, not a block: ${dependants.slice(0, 6).join("; ")}${dependants.length > 6 ? `; and ${dependants.length - 6} more` : ""}.`,
				);
			if (this.draft.type === "event" && this.hasOperationFields())
				notes.push(
					"Returns, refusals and raised events belong to operations. They stay in the file while the type is event, and the validator will report them until you change them in the JSON or switch back.",
				);
		}
		if (family === "entity") {
			const entity = subject.mode === "update" ? subject.element : undefined;
			const aggregate =
				subject.mode === "add"
					? (subject.element as Aggregate)
					: (entity as Entity).aggregate;
			const others = [...aggregate.entities.values()].filter(
				(e) => e !== entity && e.root,
			);
			if (this.draft.root === true && others.length)
				notes.push(
					`Aggregate "${aggregate.name}" already has a root (${others.map((e) => e.name).join(", ")}); an aggregate has exactly one root and the validator will report two.`,
				);
			if (
				this.draft.root !== true &&
				others.length === 0 &&
				(entity as Entity | undefined)?.root
			)
				notes.push(
					`Aggregate "${aggregate.name}" will have no root; the validator reports that until one entity is marked as the root.`,
				);
		}
		if (family === "consumption") {
			const consumer = (
				subject.mode === "update"
					? (subject.element as Consumption).consumer
					: subject.element
			) as Aggregate | Service;
			const consumable =
				subject.mode === "update"
					? (subject.element as Consumption).consumable
					: (elementOfToken(set, this.draft.consumable) as
							| Consumable
							| undefined);
			if (consumable) {
				const key = consumptionKey(
					set,
					subject.workspace,
					consumer,
					consumable,
					undefined,
					subject.mode === "update"
						? (subject.element as Consumption)
						: undefined,
				);
				if (key.siblings.length)
					notes.push(
						`"${consumer.name}" already takes "${consumable.name}" ${key.siblings.length} time(s). Consumptions of one consumable are told apart by their first caller, so each needs a different first caller in "Made by", an existing one's ref gains /by/<caller> when this one is added, and changing the first caller changes the consumption's own ref.`,
					);
			}
		}
		if (family === "process" && subject.mode === "update") {
			const dropped = this.droppedAnchors(frame);
			if (dropped.length)
				notes.push(
					`Deadline(s) ${dropped.join(", ")} count from a trigger this process no longer starts on or waits for; the validator will report them until you re-anchor them.`,
				);
		}
		if (family === "context" && this.draft.systemKind !== "modelled")
			notes.push(
				"An external, big-ball-of-mud or boundary-only context is held to what it publishes: the validator also checks its invariants and internal operations, which this form does not block.",
			);
		return notes;
	}

	private hasOperationFields(): boolean {
		return (
			(this.draft.returns !== "" && this.draft.returns !== undefined) ||
			((this.draft.rejects as RejectionRow[] | undefined)?.length ?? 0) > 0 ||
			((this.draft.raises as string[] | undefined)?.length ?? 0) > 0
		);
	}

	private droppedAnchors(frame: Frame): string[] {
		const process = frame.subject.element as {
			deadlines?: Map<string, { name: string; ref: string }>;
		};
		const keep = new Set([
			...(this.draft.starts as string[]),
			...(this.draft.on as string[]),
		]);
		const out: string[] = [];
		for (const deadline of process.deadlines?.values() ?? []) {
			const from = (deadline as unknown as { from?: object }).from;
			if (!from) continue;
			const token = identityKeyOf(from as { ref: string });
			if (token && !keep.has(token)) out.push(`"${deadline.name}"`);
		}
		return out;
	}

	// ------------------------------------------------------------ validation

	private validation(errors: FieldError[]): HostToForm {
		return { type: "validation", requestId: this.requestId, errors };
	}

	private requiredProblems(
		visible: (f: FieldDescriptor) => boolean,
	): FieldError[] {
		const errors: FieldError[] = [];
		for (const f of this.opened.fields) {
			if (!f.required || !visible(f)) continue;
			const value = this.draft[f.name];
			const empty =
				value === undefined ||
				(typeof value === "string" && value.trim() === "") ||
				(Array.isArray(value) && value.length === 0);
			if (empty)
				errors.push({
					field: f.name,
					message: `${f.label} is required: ${f.control === "select" ? "choose one" : "enter a value"}.`,
				});
		}
		return errors;
	}

	private valueProblems(
		frame: Frame,
		visible: (f: FieldDescriptor) => boolean,
	): FieldError[] {
		const errors: FieldError[] = [];
		for (const f of this.opened.fields.filter(visible)) {
			const value = this.draft[f.name];
			if (
				f.codec === "enum" &&
				f.enum &&
				typeof value === "string" &&
				value !== "" &&
				!f.enum.includes(value)
			)
				errors.push({
					field: f.name,
					message: `${f.label} must be one of ${f.enum.join(", ")}.`,
				});
			if (f.codec === "evidence") {
				const evidence = value as EvidenceValue;
				evidence.comments.forEach((c, i) => {
					if (!c.text.trim())
						errors.push({
							field: f.name,
							message: `Comment ${i + 1} has no text; write it or remove it.`,
						});
					if (
						c.link &&
						(!c.link.url.trim() || !LINK_KINDS.includes(c.link.kind))
					)
						errors.push({
							field: f.name,
							message: `Comment ${i + 1} has a link without a url or with a kind that is not one of ${LINK_KINDS.join(", ")}.`,
						});
				});
				if (
					evidence.disposition !== undefined &&
					!(DISPOSITION as readonly string[]).includes(evidence.disposition)
				)
					errors.push({
						field: f.name,
						message: `Disposition must be one of ${DISPOSITION.join(", ")}.`,
					});
			}
			if (f.name === "for" && typeof value === "string" && value) {
				const owner = frame.subject.element;
				const names =
					owner instanceof Entity || owner instanceof ValueObject
						? relationForChoices(owner)
						: [];
				if (!names.includes(value) && value !== this.opened.initial.for)
					errors.push({
						field: f.name,
						message: `"${value}" is not an attribute of "${nameOf(owner)}"; choose one of its attributes or leave this empty.`,
					});
			}
		}
		return errors;
	}

	/** Name and key rules of an add, and the two directed ends of a relationship. */
	private identityProblems(frame: Frame): FieldError[] {
		const { subject } = frame;
		const errors: FieldError[] = [];
		const parent = this.opened.family.parent;
		if (this.request.kind === "add" && parent?.keyed === "record") {
			const name = String(this.draft.name ?? "").trim();
			const id = idOf(name);
			if (name && !/[\p{L}\p{N}]/u.test(id))
				errors.push({
					field: "name",
					message:
						"The name needs at least one letter or digit: the id the element is stored under is made from it.",
				});
			else if (name) {
				const existing = subject.node[parent.collection];
				if (isPlain(existing) && Object.hasOwn(existing, id))
					errors.push({
						field: "name",
						message: `"${name}" would be stored as "${id}", which ${nameOf(subject.element) || "the parent"} already has. Choose another name, or open the existing one to edit it.`,
					});
			}
		}
		if (this.request.family === "relationship" && this.request.kind === "add") {
			const directed = isDirectedRelationshipType(this.draft.type as never);
			const [a, b] = directed
				? [this.draft.upstream, this.draft.downstream]
				: [this.draft.participantA, this.draft.participantB];
			if (a && a === b)
				errors.push({
					field: directed ? "downstream" : "participantB",
					message:
						"A relationship joins two different contexts; choose another one for this end.",
				});
			if (!frame.fresh.members.includes(this.ownerFile))
				errors.push({
					field: null,
					message: `${this.ownerFile} is not a file of this model; choose one of the loaded files to hold the relationship.`,
				});
			const nameId = String(this.draft.name ?? "").trim()
				? idOf(String(this.draft.name).trim())
				: "";
			const x = elementOfToken(frame.fresh.set, a);
			const y = elementOfToken(frame.fresh.set, b);
			const owner = frame.fresh.set.byPath(this.ownerFile);
			if (owner && x && y)
				for (const r of owner.relationships)
					if (
						r.type === this.draft.type &&
						r.nameId === nameId &&
						((r.source === x && r.target === y) ||
							(!directed && r.source === y && r.target === x))
					)
						errors.push({
							field: "name",
							message: `${this.ownerFile} already has a ${r.type} between these contexts${nameId ? ` named "${r.name}"` : ""}. Give this one a name to tell them apart, or edit the existing one.`,
						});
		}
		return errors;
	}

	/**
	 * Every chosen token must be among the legal choices of a fresh read, judged
	 * with the draft's own root, sibling, relation, timing and guards. A ref the
	 * host found illegal at opening is let through only while its field and the
	 * fields that decide it are unchanged; everything else, including a ref that
	 * was legal at opening and is not now, is a field error and nothing is sent.
	 */
	private referenceProblems(
		frame: Frame,
		visible: (f: FieldDescriptor) => boolean,
	): FieldError[] {
		const errors: FieldError[] = [];
		const { set } = frame.fresh;
		for (const f of this.opened.fields.filter((x) => x.ref && visible(x))) {
			const cls = (f.ref as NonNullable<FieldDescriptor["ref"]>).cls;
			const judging = judgingFor(set, frame.subject, f, this.draft);
			const value = this.draft[f.name];
			if (judging.failure) {
				// Chosen values cannot be judged: refuse the Save, say why, touch no other field.
				if (Array.isArray(value) ? value.length : value)
					errors.push({ field: f.name, message: judging.failure });
				continue;
			}
			const legal = new Set(
				legalChoices(judging.set, cls, judging.holder).map((c) => c.key),
			);
			const pinned = this.pinnedTokens(frame, f, this.draft);
			const tokens =
				f.codec === "rejects"
					? (value as RejectionRow[]).map((r) => r.schema)
					: typeof value === "string"
						? value
							? [value]
							: []
						: (value as string[]);
			for (const token of tokens) {
				if (legal.has(token) || pinned.has(token)) continue;
				errors.push({
					field: f.name,
					message: this.illegalMessage(
						judging.set,
						f,
						cls,
						judging.holder,
						token,
					),
				});
			}
		}
		return errors;
	}

	private illegalMessage(
		set: WorkspaceSet,
		f: FieldDescriptor,
		cls: LegalClassId,
		holder: LegalHolder,
		token: string,
	): string {
		const element = elementOfToken(set, token);
		if (!element)
			return `${f.label}: a choice is not in the model any more (it was removed or renamed in another edit). Reopen the form and choose again.`;
		const verdict = verdictOf(set, cls, holder, element);
		return verdict.ok
			? `${f.label}: ${nameOf(element)} is not one of the choices offered now. Reopen the form and choose from the refreshed list.`
			: `${f.label}: ${nameOf(element)} is not allowed here. ${verdict.reason}. Choose another, or remove it.`;
	}

	/** The re-key a consumption's first caller can cause, refused before any write when two would share a ref. */
	private consumptionProblems(frame: Frame): FieldError[] {
		if (this.request.family !== "consumption") return [];
		const { subject, fresh } = frame;
		const consumption =
			subject.mode === "update" ? (subject.element as Consumption) : undefined;
		const consumer = (consumption?.consumer ?? subject.element) as
			| Aggregate
			| Service;
		const consumable =
			consumption?.consumable ??
			(elementOfToken(fresh.set, this.draft.consumable) as
				| Consumable
				| undefined);
		if (!consumable) return [];
		const by = orderedBy(this.opened.initial.by, this.draft.by);
		const first = by[0]
			? (frame.held.by?.elements.get(by[0]) ?? elementOfToken(fresh.set, by[0]))
			: undefined;
		const key = consumptionKey(
			fresh.set,
			subject.workspace,
			consumer,
			consumable,
			first,
			consumption,
		);
		if (!key.collides) return [];
		return [
			{
				field: "by",
				message: first
					? `"${consumer.name}" already takes "${consumable.name}" with "${nameOf(first)}" as the first caller, so a second consumption with the same first caller would have the same ref and could not be told apart. Choose a different first caller, or change the existing consumption instead.`
					: `"${consumer.name}" already takes "${consumable.name}" for the whole consumer, so a second one with no caller would have the same ref. Name a first caller in "Made by", or change the existing consumption instead.`,
			},
		];
	}
}

// ------------------------------------------------------------------ helpers

/** The id or name a title can show. */
/** What a successful write means to the person: a dirty open editor holds the change but the disk does not yet. */
function savedMessage(
	wrote: "noop" | "disk" | "buffer" | "buffer-saved",
	file: string,
): string {
	if (wrote === "noop") return "The model already said this.";
	if (wrote === "buffer")
		return `The change was made in the open editor for ${file} but is not saved to disk. Save that editor to keep it.`;
	return `Saved to ${file}.`;
}

function nameOfSubject(subject: Subject): string {
	return subject.mode === "update" && subject.family !== "entityRelation"
		? nameOf(subject.element)
		: "";
}

function readOnlyValue(frame: Frame, property: string): string | undefined {
	const { subject } = frame;
	const element = subject.element as Record<string, unknown>;
	switch (property) {
		case "key":
			return subject.ref === "#"
				? undefined
				: (decodeRefSegment(subject.ref.split("/").at(-1) as string) ??
						undefined);
		case "id":
			return String(element.id ?? "");
		case "odsVersion":
			return String(element.odsVersion ?? "");
		case "$schema": {
			const schema = frame.fresh.assembled.files.get(subject.file)?.schema
				?.$schema;
			return typeof schema === "string" ? schema : "(none)";
		}
		case "type":
			return String(subject.node.type ?? "");
		case "name":
			return typeof subject.node.name === "string"
				? subject.node.name
				: "(none)";
		case "upstream":
		case "downstream":
		case "participants": {
			const directed = isDirectedRelationshipType(subject.node.type as never);
			if (property === "participants" ? directed : !directed) return undefined;
			const r = subject.element as {
				source: BoundedContext;
				target: BoundedContext;
			};
			const show = (c: BoundedContext) =>
				`${c.name} (${c.workspace.file as string})`;
			return property === "upstream"
				? show(r.source)
				: property === "downstream"
					? show(r.target)
					: `${show(r.source)} and ${show(r.target)}`;
		}
		case "consumable": {
			const c = (subject.element as Consumption).consumable;
			return `${c.name} (${workspaceOf(c)?.file as string})`;
		}
		default:
			return undefined;
	}
}

/** The elements that name a consumable, for the note on changing its type. */
function dependantsOf(consumable: Consumable): string[] {
	const out: string[] = consumable.consumptions.map(
		(c) => `consumption "${nameOf(c)}"`,
	);
	const set = workspaceOf(consumable)?.set;
	for (const workspace of set?.workspaces ?? [])
		for (const context of workspace.boundedcontexts.values()) {
			for (const p of context.policies.values())
				if (p.events.includes(consumable) || p.commands.includes(consumable))
					out.push(`policy "${p.name}"`);
			for (const p of context.processes.values())
				if (
					[
						...p.startEvents,
						...p.events,
						...p.commands,
						...p.endEvents,
					].includes(consumable as never)
				)
					out.push(`process "${p.name}"`);
			for (const providers of [context.aggregates, context.services])
				for (const provider of providers.values())
					for (const c of provider.consumables.values())
						if (c.raisedEvents.includes(consumable))
							out.push(`operation "${c.name}" (raises it)`);
		}
	return out;
}

/** Checks one value the form sent against its field. */
function coerce(
	f: FieldDescriptor,
	raw: unknown,
): { value: FieldValue } | { error: string } {
	const bad = (what: string) => ({
		error: `${f.label} must be ${what}.`,
	});
	switch (f.codec) {
		case "string":
		case "enum":
		case "ref":
		case "shape":
		case "participant0":
		case "participant1":
			return typeof raw === "string" ? { value: raw } : bad("text");
		case "systemKind":
		case "timing":
			return typeof raw === "string" &&
				(f.enum as ReadonlyArray<string>).includes(raw)
				? { value: raw }
				: bad(`one of ${(f.enum as ReadonlyArray<string>).join(", ")}`);
		case "bool":
		case "shape-many":
		case "commentsRequired":
			return typeof raw === "boolean" ? { value: raw } : bad("true or false");
		case "enum-list":
		case "refs":
		case "strings":
			return Array.isArray(raw) && raw.every((v) => typeof v === "string")
				? f.codec === "enum-list" &&
					!raw.every((v) => (f.enum as ReadonlyArray<string>).includes(v))
					? bad(`some of ${(f.enum as ReadonlyArray<string>).join(", ")}`)
					: { value: raw as string[] }
				: bad("a list of text");
		case "rejects":
			return Array.isArray(raw) &&
				raw.every(
					(r) =>
						isPlain(r) &&
						typeof r.schema === "string" &&
						(r.many === undefined || typeof r.many === "boolean") &&
						(r.reasons === undefined ||
							(Array.isArray(r.reasons) &&
								r.reasons.every((x) => typeof x === "string"))),
				)
				? { value: raw as RejectionRow[] }
				: bad("a list of refusals");
		case "evidence":
			return isPlain(raw) &&
				Array.isArray(raw.comments) &&
				raw.comments.every((c) => isPlain(c) && typeof c.text === "string") &&
				(raw.disposition === undefined || typeof raw.disposition === "string")
				? { value: raw as unknown as EvidenceValue }
				: bad("comments and a disposition");
		default:
			return bad("a value this form does not take");
	}
}

/** The canonical JSON file of the owner, parsed fresh. */
const canonicalOf = (set: WorkspaceSet, file: SetPath): Plain | undefined =>
	set.toSchemas().get(file) as unknown as Plain | undefined;

const REFUSED_INSIDES: Record<string, ReadonlyArray<string>> = {
	external: ["aggregate", "policy", "process"],
	boundaryOnly: ["aggregate", "policy", "process", "invariant"],
};

/** Resolves what a request is about in one fresh read, or says why it cannot be opened. */
function subjectOf(
	fresh: FreshRead,
	request: FormRequest,
	file: SetPath,
): Subject | Problem {
	const missing = (what: string): Problem => ({
		message: `${what} is not in the model now.`,
		action:
			"Reload the model (it may have been renamed, removed or broken in another edit) and open the form again.",
	});
	if (!fresh.members.includes(file))
		return {
			message: `${file} is not a file of this model.`,
			action:
				"Fix the file (see the Problems panel) or choose another, then open the form again.",
		};
	const workspace = fresh.set.byPath(file) as Workspace;
	const canonical = canonicalOf(fresh.set, file) as Plain;
	const ref = request.kind === "add" ? request.parentRef : request.ref;
	let element: object | undefined;
	if (ref === "#") element = workspace;
	else
		element =
			workspace.findRelationship(ref) ??
			workspace.findConsumption(ref) ??
			workspace.getByRef(ref);
	if (!element) return missing(`${ref} in ${file}`);
	const at = jsonPathOfRef(canonical, ref);
	const node = at && valueAtPath(canonical, at);
	if (!at || !isPlain(node)) return missing(`${ref} in ${file}`);
	const family = familyOfElement(element);

	if (request.kind === "add") {
		const descriptor = familyById(request.family);
		if (!family || !descriptor.parent?.families.includes(family))
			return {
				message: `A ${request.family} cannot be added under ${family ?? "that element"}.`,
				action: "Choose a parent that can hold one.",
			};
		if (element instanceof BoundedContext) {
			const kind = element.external
				? "external"
				: element.boundaryOnly
					? "boundaryOnly"
					: "";
			if (kind && REFUSED_INSIDES[kind].includes(request.family))
				return {
					message: `"${element.name}" is ${kind === "external" ? "an external context" : "modelled at its boundary only"}: it states what it provides and consumes, not its insides, so it cannot hold a ${request.family}.`,
					action:
						"Change the context's kind first, or add the element to a modelled context.",
				};
		}
		return {
			mode: "add",
			family: request.family,
			file,
			workspace,
			element,
			ref,
			node,
			parentFamily: family,
		};
	}

	if (request.family === "entityRelation") {
		if (!(element instanceof Entity || element instanceof ValueObject))
			return {
				message: `${ref} does not hold relations.`,
				action: "Choose an entity or a value object.",
			};
		const rows = node.relations;
		const row = request.row;
		const found =
			Array.isArray(rows) && row !== undefined ? rows[row] : undefined;
		if (!isPlain(found)) return missing(`relation ${row ?? "?"} of ${ref}`);
		return {
			mode: "update",
			family: "entityRelation",
			file,
			workspace,
			element,
			ref,
			node: found,
			row,
			ownerNode: node,
		};
	}
	if (family !== request.family)
		return {
			message: `${ref} is a ${family ?? "different kind of element"}, not a ${request.family}.`,
			action: "Open the form from the element itself.",
		};
	return {
		mode: "update",
		family: request.family,
		file,
		workspace,
		element,
		ref,
		node,
	};
}

/**
 * Which refs each field holds that the model already rejected when the form
 * opened, as the owning file writes them. Read from the session's own fresh
 * read with the form's initial (saved) values: it is host state, and no message
 * of the protocol carries or changes it.
 */
function addTo(into: Record<string, string[]>, key: string, ref: string) {
	into[key] = [...(into[key] ?? []), ref];
}

function illegalAtOpen(frame: Frame, opened: Opened): Record<string, string[]> {
	const out: Record<string, string[]> = {};
	if (frame.subject.mode !== "update") return out;
	const { set } = frame.fresh;
	for (const f of opened.fields.filter((x) => x.ref)) {
		const cls = (f.ref as NonNullable<FieldDescriptor["ref"]>).cls;
		const holder = holderFor(set, frame.subject, f, opened.initial);
		for (const [token, element] of frame.held[f.name]?.elements ?? []) {
			if (verdictOf(set, cls, holder, element).ok) continue;
			addTo(out, f.name, frame.held[f.name].refs.get(token) as string);
		}
	}
	for (const row of opened.family.update?.readOnly.filter((r) => r.judged) ??
		[]) {
		const raw = frame.subject.node[row.property];
		const cls = row.judged as LegalClassId;
		const holder = holderFor(
			set,
			frame.subject,
			{ name: row.property } as FieldDescriptor,
			opened.initial,
		);
		// `participants` of a symmetric relationship holds two refs.
		for (const one of Array.isArray(raw) ? raw : [raw]) {
			const ref = isPlain(one) ? one.$ref : undefined;
			if (typeof ref !== "string") continue;
			const element = resolveHeld(set, frame.subject.workspace, ref, cls);
			if (element && !verdictOf(set, cls, holder, element).ok)
				addTo(out, row.property, ref);
		}
	}
	if (frame.subject.family === "entityRelation") {
		const rows =
			(frame.subject.ownerNode?.relations as unknown[] | undefined) ?? [];
		for (const row of rows) {
			if (!isPlain(row) || !isPlain(row.target)) continue;
			const ref = row.target.$ref as string;
			const target = elementOfRef(frame, ref);
			if (!target) continue;
			const rowHolder = holderFor(
				set,
				frame.subject,
				opened.fields.find((x) => x.name === "target") as FieldDescriptor,
				{ ...opened.initial, relation: row.relation as string },
			);
			if (!verdictOf(set, "LC-RELATION-TARGET", rowHolder, target).ok)
				addTo(out, "relations", ref);
		}
		if (out.relations) out.target = out.relations;
	}
	return out;
}

function elementOfRef(frame: Frame, ref: string): object | undefined {
	return resolveHeld(
		frame.fresh.set,
		frame.subject.workspace,
		ref,
		"LC-RELATION-TARGET",
	);
}
