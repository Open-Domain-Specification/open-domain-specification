import type { RefusalCause } from "../writer";

/**
 * The messages between the extension host and a form, as plain data. Vscode-
 * and DOM-free: the session in `session.ts` speaks only this, so it is tested
 * against the real writer under vitest, and whatever draws the form (a later
 * slice) renders `FormInit`/`refresh` and posts `FormToHost`.
 *
 * Nothing the form sends is ever trusted as a fact about the model: a choice
 * is an identity token the host maps back to an element of its own fresh read,
 * and whether a reference was already wrong when the form opened is something
 * only the host computes (never a field of any message below).
 */

export type FamilyId =
	| "workspace"
	| "domain"
	| "subdomain"
	| "team"
	| "context"
	| "relationship"
	| "aggregate"
	| "entity"
	| "entityRelation"
	| "attribute"
	| "valueObject"
	| "invariant"
	| "service"
	| "consumable"
	| "consumption"
	| "policy"
	| "process"
	| "deadline"
	| "term"
	| "schema";

/**
 * One element a reference field may name. `value` is the element's
 * `identityKeyOf` token (file and pointer), never a ref string, so a form
 * cannot send a ref the host did not offer; `file` is always present because
 * two files may hold equal ids.
 */
export type Choice = {
	value: string;
	label: string;
	/** What it is and where inside its context, for example `entity in Order`. */
	detail?: string;
	file: string;
	/**
	 * Set when the element is held by the field but is not a legal choice now.
	 * It stays selected so nothing is dropped silently; the text says why.
	 */
	disabledReason?: string;
};

/** A fixed option of an enumerated field. */
export type Option = { value: string; label: string; disabledReason?: string };

export type EvidenceValue = {
	comments: Array<{
		text: string;
		link?: {
			kind: "code" | "contract" | "adr" | "runbook" | "dashboard";
			url: string;
			label?: string;
		};
	}>;
	disposition?: "by-design" | "tolerated" | "refactor";
};

/** One refusal an operation answers with: the shape (a choice token), whether it is a list, and the outcomes the contract names. */
export type RejectionRow = {
	schema: string;
	many?: boolean;
	reasons?: string[];
};

export type FieldValue =
	| string
	| boolean
	| string[]
	| EvidenceValue
	| RejectionRow[];

export type Control =
	| "text"
	| "textarea"
	| "url"
	| "select"
	| "checkbox"
	| "checkbox-list"
	| "text-list"
	| "evidence"
	| "rejection-rows";

export type FormField = {
	name: string;
	/** Plain language. */
	label: string;
	help?: string;
	required: boolean;
	visible: boolean;
	disabledReason?: string;
	control: Control;
	value: FieldValue;
	/** Reference fields: the legal choices now, plus anything the field holds. */
	choices?: Choice[];
	/** Enumerated fields. */
	options?: Option[];
	/** Changing it can change another field's choices or visibility: post `change`. */
	refreshOnChange?: boolean;
};

/** A property that is shown and cannot be edited here, with the reason in plain language. */
export type ReadOnlyRow = { label: string; value: string; reason: string };

export type OwnerInfo = {
	/** The file the change will be written to, and the only one. */
	file: string;
	/** Relationship add only: EVERY loaded member file may declare it (decision 08). */
	ownerChoices?: Choice[];
};

export type FormInit = {
	type: "init";
	requestId: string;
	mode: "add" | "update";
	family: FamilyId;
	title: string;
	fields: FormField[];
	readOnly: ReadOnlyRow[];
	/** Advisory, never blocking: incomplete structure, dependants and the canonicalization limit. */
	notes: string[];
	owner: OwnerInfo;
	/** Changes when any file changes; display only. */
	stamp: string;
};

export type FieldError = {
	/** The form field, or null for the form as a whole. */
	field: string | null;
	/** Says what is wrong and what to do. */
	message: string;
};

export type HostToForm =
	| FormInit
	| {
			type: "refresh";
			requestId: string;
			fields: FormField[];
			notes: string[];
			owner: OwnerInfo;
	  }
	| { type: "validation"; requestId: string; errors: FieldError[] }
	| {
			type: "saved";
			requestId: string;
			file: string;
			wrote: "noop" | "disk" | "buffer" | "buffer-saved";
			message: string;
	  }
	| {
			type: "refused";
			requestId: string;
			cause: RefusalCause;
			message: string;
			action: string;
			errors: FieldError[];
	  };

export type FormToHost =
	| { type: "ready"; requestId: string }
	| {
			type: "change";
			requestId: string;
			field: string;
			values: Record<string, FieldValue>;
			owner?: string;
	  }
	| {
			type: "save";
			requestId: string;
			values: Record<string, FieldValue>;
			owner?: string;
	  }
	| { type: "cancel"; requestId: string };
