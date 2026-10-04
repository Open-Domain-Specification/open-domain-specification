import {
	type LegalClassId,
	parseConsumptionRef,
	parseRelationshipRef,
} from "@open-domain-specification/core";
import type { Control, FamilyId } from "./form-protocol";

/**
 * The 20 families and 39 operations (19 adds and 20 updates; the workspace is
 * never added here) a form can author, as data, each keyed to the JSON
 * properties of the schema it reads and writes. `families.test.ts` proves the
 * table against `apps/ods-vscode/schema.json`: every property of every family
 * definition is a field, a read-only row with its reason, a child collection or
 * a documented part of another field, and every enumeration equals the
 * schema's.
 *
 * What is not authored (stated, not hidden): removing, moving and reordering
 * elements; renaming an id or a relationship; a standalone "answers" operation
 * (there is none: answers are views of `returns` and `rejects`, and those, with
 * each rejection's reasons and the many flags, ARE authored on the operation, so
 * no answer field is restricted); and any property
 * the schema does not know, which the writer drops when it re-emits the file
 * (the canonicalization limit of `writer.ts`).
 */

/** The way a field becomes JSON and back; the session switches on it. */
export type Codec =
	| "string"
	| "bool"
	| "enum"
	| "enum-list"
	| "systemKind"
	| "timing"
	| "ref"
	| "refs"
	| "shape"
	| "shape-many"
	| "rejects"
	| "evidence"
	| "strings"
	| "commentsRequired"
	| "participant0"
	| "participant1";

/** When a field is shown; computed from the draft by the session. */
export type VisibleRule =
	| "always"
	| "directed"
	| "symmetric"
	| "operation"
	| "schema-parent";

export type FieldDescriptor = {
	/** Form field name. For a reference field it is also the JSON property, so a legal check and the writer's baseline lookup name the same key. */
	name: string;
	label: string;
	help?: string;
	control: Control;
	codec: Codec;
	required?: boolean;
	/** The schema properties this field writes (a context's system kind writes three flags). Empty for an auxiliary checkbox that rides on another field's property. */
	writesJson: string[];
	/** The schema requires the property: an empty value is written as "" or [] instead of being left out. */
	jsonRequired?: boolean;
	/** The enumeration the value is one of; proven equal to the schema's. */
	enum?: ReadonlyArray<string>;
	ref?: { cls: LegalClassId; many: boolean };
	/**
	 * Fields whose value decides which targets this reference field may name
	 * (read from `holderOf` and the class in `legal-targets.ts`). A changed
	 * governing field withdraws the pinned-reference exemption of this field.
	 */
	governedBy?: ReadonlyArray<string>;
	/** For a many-checkbox: the shape field whose `many` it is. */
	pairedWith?: string;
	visible?: VisibleRule;
	/** Changing it changes another field's choices or visibility. */
	refresh?: boolean;
};

export type ReadOnlyDescriptor = {
	/** Schema property, or `key` for the record key an element is stored under. */
	property: string;
	label: string;
	/** Plain language, shown beside the value. */
	reason: string;
	/** Where the reason comes from, for the reader of this table. */
	source: string;
	/**
	 * The legal class of the ref this property holds. It cannot be edited, but
	 * the ref is still a selected reference of the saved element, so every save
	 * judges it again (and a ref already illegal at opening is kept only as the
	 * writer's exemption allows).
	 */
	judged?: LegalClassId;
};

export type OperationDescriptor = {
	id: `${"add" | "update"}.${FamilyId}`;
	fields: FieldDescriptor[];
	readOnly: ReadOnlyDescriptor[];
};

export type Collection = { property: string; children: FamilyId[] };

export type FamilyDescriptor = {
	id: FamilyId;
	label: string;
	/** The schema definitions of the element; the workspace is the root schema. */
	schemaDefs: string[];
	parent?: {
		families: FamilyId[];
		collection: string;
		keyed: "record" | "list";
	};
	/** Child collections: authored by the child family's add, not fields of this form. */
	collections: Collection[];
	add?: OperationDescriptor;
	update?: OperationDescriptor;
};

// ------------------------------------------------------------------ reasons

const ID_REASON =
	"Other elements, and other files, refer to this id (it is the record key and a segment of every ref to the element), and nothing here rewrites those refs, so it cannot be renamed here. To rename it, add a new element and remove this one in the JSON.";
const ID_SOURCE =
	"workspace.ts idOf(:40) and each element's path/ref getter; writer.ts changes fields of an element at the same JSON location and cannot rename a key";
const ENDS_REASON =
	"A relationship has no id of its own: its ref is built from the two contexts it joins, its type and its name, and every consumption that names an agreement refers to that ref, so changing one of them makes a different relationship. Add the new relationship and remove this one in the JSON.";
const ENDS_SOURCE =
	"reference.ts relationshipRef/qualifiedRelationshipRef, workspace.ts ContextRelationship.path (nameId = idOf(name))";
const CONSUMABLE_REASON =
	"A consumption's ref embeds the ref of the consumable it takes, so taking another consumable is a different consumption, not an edit of this one. Add the new consumption and remove this one in the JSON.";
const CONSUMABLE_SOURCE =
	"workspace.ts Consumption.path -> consumptionRef(consumer.ref, refFrom(consumable), ...)";

const keyRow = (): ReadOnlyDescriptor => ({
	property: "key",
	label: "Id",
	reason: ID_REASON,
	source: ID_SOURCE,
});

// ------------------------------------------------------------ field builders

type Opts = Partial<FieldDescriptor>;

const text = (
	name: string,
	label: string,
	required = false,
	opts: Opts = {},
): FieldDescriptor => ({
	name,
	label,
	control: "text",
	codec: "string",
	required,
	writesJson: [name],
	...opts,
});
const area = (
	name: string,
	label: string,
	required = false,
	opts: Opts = {},
): FieldDescriptor =>
	text(name, label, required, { control: "textarea", ...opts });
const url = (name: string, label: string): FieldDescriptor =>
	text(name, label, false, { control: "url" });
const enumSelect = (
	name: string,
	label: string,
	values: ReadonlyArray<string>,
	required = false,
	opts: Opts = {},
): FieldDescriptor => ({
	name,
	label,
	control: "select",
	codec: "enum",
	required,
	writesJson: [name],
	enum: values,
	...opts,
});
const flag = (
	name: string,
	label: string,
	opts: Opts = {},
): FieldDescriptor => ({
	name,
	label,
	control: "checkbox",
	codec: "bool",
	writesJson: [name],
	...opts,
});
const refOne = (
	name: string,
	label: string,
	cls: LegalClassId,
	opts: Opts = {},
): FieldDescriptor => ({
	name,
	label,
	control: "select",
	codec: "ref",
	writesJson: [name],
	ref: { cls, many: false },
	...opts,
});
const refMany = (
	name: string,
	label: string,
	cls: LegalClassId,
	opts: Opts = {},
): FieldDescriptor => ({
	name,
	label,
	control: "checkbox-list",
	codec: "refs",
	writesJson: [name],
	ref: { cls, many: true },
	...opts,
});
const evidence = (): FieldDescriptor => ({
	name: "evidence",
	label: "Evidence and disposition",
	control: "evidence",
	codec: "evidence",
	writesJson: ["comments", "disposition"],
});

export const DISPOSITION = ["by-design", "refactor", "tolerated"] as const;
export const LINK_KINDS = [
	"adr",
	"code",
	"contract",
	"dashboard",
	"runbook",
] as const;
const SUBDOMAIN_TYPE = ["core", "generic", "supporting"] as const;
const SERVICE_TYPE = ["application", "domain"] as const;
const CONSUMABLE_TYPE = ["event", "operation"] as const;
const UPSTREAM_ROLES = ["open-host-service", "published-language"] as const;
const DOWNSTREAM_ROLES = ["anti-corruption-layer", "conformist"] as const;
const RELATION = ["includes", "references", "uses"] as const;
const CARDINALITY = ["*", "0..1", "1", "1..*"] as const;
const RELATIONSHIP_TYPES = [
	"customer-supplier",
	"upstream-downstream",
	"partnership",
	"separate-ways",
	"shared-kernel",
] as const;
export const SYSTEM_KINDS = [
	"modelled",
	"external",
	"bigBallOfMud",
	"boundaryOnly",
] as const;
export const TIMINGS = ["always", "precondition", "postcondition"] as const;

const nameField = () => text("name", "Name", true);
const descField = (required: boolean) =>
	area("description", "Description", false, { jsonRequired: required });

// ---------------------------------------------------------------- the fields

const SYSTEM_KIND: FieldDescriptor = {
	name: "systemKind",
	label: "What kind of context",
	help: "Modelled, external, a big ball of mud, or modelled at its boundary only.",
	control: "select",
	codec: "systemKind",
	writesJson: ["external", "bigBallOfMud", "boundaryOnly"],
	enum: SYSTEM_KINDS,
};

const CONTEXT_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	descField(true),
	SYSTEM_KIND,
	refOne("team", "Owned by team", "LC-TEAM"),
	refMany("subdomains", "Serves subdomains", "LC-SUBDOMAIN"),
];

const ENTITY_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	descField(true),
	flag("root", "Root of its aggregate", { refresh: true }),
	refOne(
		"specialises",
		"A kind of (entity of this aggregate)",
		"LC-OWN-AGGREGATE-ENTITY",
		{
			governedBy: ["root"],
		},
	),
];

const ENTITY_RELATION_FIELDS = (): FieldDescriptor[] => [
	enumSelect("relation", "Relation", RELATION, true, { refresh: true }),
	refOne("target", "Target", "LC-RELATION-TARGET", {
		required: true,
		governedBy: ["relation"],
	}),
	text("label", "Label"),
	enumSelect("cardinality", "Cardinality", CARDINALITY),
	{
		name: "for",
		label: "Drawn for attribute",
		help: "Needed only when the source uses the target through two attributes.",
		control: "select",
		codec: "enum",
		writesJson: ["for"],
	},
];

const ATTRIBUTE_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	text("type", "Type", true),
	descField(false),
	flag("identity", "Identity of its owner"),
	flag("optional", "Optional"),
	refOne("valueobject", "Value object", "LC-VALUE-OBJECT-BORROWABLE", {
		governedBy: ["schema"],
		refresh: true,
	}),
	refOne("schema", "Schema", "LC-SCHEMA-ATTRIBUTE", {
		governedBy: ["valueobject"],
		visible: "schema-parent",
		refresh: true,
	}),
	refOne("identifies", "Identifies", "LC-IDENTITY-TARGET"),
];

const INVARIANT_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	descField(true),
	{
		...refMany("constrains", "Constrains", "LC-CONSTRAINS", {
			governedBy: ["timing"],
			refresh: true,
		}),
		jsonRequired: true,
	},
	{
		name: "timing",
		label: "When it is kept",
		control: "select",
		codec: "timing",
		writesJson: ["precondition", "postcondition"],
		enum: TIMINGS,
		refresh: true,
	},
];

const CONSUMABLE_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	descField(true),
	enumSelect("type", "Type", CONSUMABLE_TYPE, true, { refresh: true }),
	enumSelect("pattern", "Published as", UPSTREAM_ROLES),
	flag("internal", "Internal to its context"),
	refOne("schema", "Request shape", "LC-SCHEMA-CARRY", { codec: "shape" }),
	{
		name: "schemaMany",
		label: "Request is a list",
		control: "checkbox",
		codec: "shape-many",
		writesJson: [],
		pairedWith: "schema",
	},
	refOne("returns", "Answers with", "LC-SCHEMA-CARRY", {
		codec: "shape",
		governedBy: ["type"],
		visible: "operation",
	}),
	{
		name: "returnsMany",
		label: "Answer is a list",
		control: "checkbox",
		codec: "shape-many",
		writesJson: [],
		pairedWith: "returns",
		visible: "operation",
	},
	{
		name: "rejects",
		label: "Refuses with",
		control: "rejection-rows",
		codec: "rejects",
		writesJson: ["rejects"],
		ref: { cls: "LC-SCHEMA-CARRY", many: true },
		governedBy: ["type"],
		visible: "operation",
	},
	refMany("raises", "Raises events", "LC-RAISES", {
		governedBy: ["type"],
		visible: "operation",
	}),
	evidence(),
];

const CONSUMPTION_FIELDS = (withConsumable: boolean): FieldDescriptor[] => [
	...(withConsumable
		? [
				refOne("consumable", "Takes", "LC-CONSUMED", {
					required: true,
					refresh: true,
				}),
			]
		: []),
	enumSelect("pattern", "Conforms as", DOWNSTREAM_ROLES),
	refMany("by", "Made by", "LC-BY", {
		governedBy: ["consumable"],
		refresh: true,
	}),
	refOne("relationship", "Under agreement", "LC-AGREEMENT", {
		governedBy: ["consumable"],
	}),
	evidence(),
];

const POLICY_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	descField(true),
	refMany("on", "Reacts to", "LC-POLICY-ON", { governedBy: ["then"] }),
	refMany("then", "Then issues", "LC-OPERATION-OWN-CONTEXT", { refresh: true }),
];

const PROCESS_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	descField(true),
	refMany("starts", "Starts on", "LC-PROCESS-STARTS", { refresh: true }),
	refMany("on", "Waits for", "LC-PROCESS-TRIGGER", {
		governedBy: ["then", "starts"],
	}),
	refMany("then", "Then issues", "LC-OPERATION-OWN-CONTEXT", { refresh: true }),
	refMany("ends", "Ends on", "LC-PROCESS-TRIGGER", {
		governedBy: ["then", "starts"],
	}),
	evidence(),
];

const DEADLINE_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	descField(true),
	text("after", "Counted after", true),
	refOne("from", "Counted from", "LC-DEADLINE-FROM"),
];

const TERM_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	area("definition", "Definition", true),
	{
		name: "aliases",
		label: "Also called",
		control: "text-list",
		codec: "strings",
		writesJson: ["aliases"],
	},
	refOne("embodiedBy", "Embodied by", "LC-TERM-EMBODIES"),
];

const RELATIONSHIP_COMMON = (): FieldDescriptor[] => [
	{
		...enumSelect("upstreamRoles", "Upstream roles", UPSTREAM_ROLES),
		control: "checkbox-list",
		codec: "enum-list",
		jsonRequired: true,
		visible: "directed",
	},
	{
		...enumSelect("downstreamRoles", "Downstream roles", DOWNSTREAM_ROLES),
		control: "checkbox-list",
		codec: "enum-list",
		jsonRequired: true,
		visible: "directed",
	},
	area("description", "Description"),
	evidence(),
];

const RELATIONSHIP_ADD = (): FieldDescriptor[] => [
	enumSelect("type", "Relationship type", RELATIONSHIP_TYPES, true, {
		refresh: true,
	}),
	text("name", "Name", false, {
		help: "Optional. Needed to tell two agreements between the same contexts apart.",
	}),
	refOne("upstream", "Upstream context", "LC-CONTEXT", {
		required: true,
		visible: "directed",
		governedBy: ["downstream"],
		refresh: true,
	}),
	refOne("downstream", "Downstream context", "LC-CONTEXT", {
		required: true,
		visible: "directed",
		governedBy: ["upstream"],
		refresh: true,
	}),
	{
		...refOne("participantA", "First context", "LC-CONTEXT", {
			required: true,
			visible: "symmetric",
			governedBy: ["participantB"],
			refresh: true,
		}),
		codec: "participant0",
		writesJson: ["participants"],
	},
	{
		...refOne("participantB", "Second context", "LC-CONTEXT", {
			required: true,
			visible: "symmetric",
			governedBy: ["participantA"],
			refresh: true,
		}),
		codec: "participant1",
		writesJson: ["participants"],
	},
	...RELATIONSHIP_COMMON(),
];

const WORKSPACE_FIELDS = (): FieldDescriptor[] => [
	nameField(),
	area("description", "Description", false, { jsonRequired: true }),
	text("version", "Version", false, { jsonRequired: true }),
	url("homepage", "Homepage"),
	url("logoUrl", "Logo URL"),
	text("primaryColor", "Primary colour"),
	{
		name: "commentsRequired",
		label: "Require evidence on every comment-bearing element",
		help: "Switches on the opt-in comments-required rule.",
		control: "checkbox",
		codec: "commentsRequired",
		writesJson: ["options"],
	},
];

const op = <F extends "add" | "update">(
	kind: F,
	family: FamilyId,
	fields: FieldDescriptor[],
	readOnly: ReadOnlyDescriptor[] = [],
): OperationDescriptor => ({
	id: `${kind}.${family}`,
	fields,
	readOnly,
});

const rec = (
	families: FamilyId[],
	collection: string,
): NonNullable<FamilyDescriptor["parent"]> => ({
	families,
	collection,
	keyed: "record",
});
const list = (
	families: FamilyId[],
	collection: string,
): NonNullable<FamilyDescriptor["parent"]> => ({
	families,
	collection,
	keyed: "list",
});

const both = (
	family: FamilyId,
	fields: () => FieldDescriptor[],
	readOnly: ReadOnlyDescriptor[] = [keyRow()],
) => ({
	add: op("add", family, fields()),
	update: op("update", family, fields(), readOnly),
});

/** The 20 families, 39 operations. */
export const FAMILIES: ReadonlyArray<FamilyDescriptor> = [
	{
		id: "workspace",
		label: "Workspace",
		schemaDefs: ["WorkspaceSchema"],
		collections: [
			{ property: "domains", children: ["domain"] },
			{ property: "teams", children: ["team"] },
			{ property: "boundedcontexts", children: ["context"] },
			{ property: "relationships", children: ["relationship"] },
		],
		update: op("update", "workspace", WORKSPACE_FIELDS(), [
			{
				property: "id",
				label: "Id",
				reason:
					"The workspace id names this file in routes, in the folders of generated documentation and in the cluster its contexts are drawn under, so it is not edited here.",
				source: "workspace-set.ts workspace-id-unique rule text",
			},
			{
				property: "odsVersion",
				label: "ODS version",
				reason:
					"The metamodel version is the one this extension's core knows, stamped when the file is written; the model in memory always carries it, whatever the file said.",
				source: "workspace.ts Workspace.odsVersion (readonly, ODS_VERSION)",
			},
			{
				property: "$schema",
				label: "$schema",
				reason:
					"The link to the JSON schema is kept exactly as the file has it; the writer preserves it on every save.",
				source: "writer.ts withSchemaKey",
			},
		]),
	},
	{
		id: "domain",
		label: "Domain",
		schemaDefs: ["DomainSchema"],
		parent: rec(["workspace"], "domains"),
		collections: [{ property: "subdomains", children: ["subdomain"] }],
		...both("domain", () => [nameField(), descField(true)]),
	},
	{
		id: "subdomain",
		label: "Subdomain",
		schemaDefs: ["SubdomainSchema"],
		parent: rec(["domain"], "subdomains"),
		collections: [],
		...both("subdomain", () => [
			nameField(),
			enumSelect("type", "Type", SUBDOMAIN_TYPE, true),
			descField(true),
		]),
	},
	{
		id: "team",
		label: "Team",
		schemaDefs: ["TeamSchema"],
		parent: rec(["workspace"], "teams"),
		collections: [],
		...both("team", () => [
			nameField(),
			descField(false),
			url("homepage", "Homepage"),
		]),
	},
	{
		id: "context",
		label: "Bounded context",
		schemaDefs: ["BoundedContextSchema"],
		parent: rec(["workspace"], "boundedcontexts"),
		collections: [
			{ property: "aggregates", children: ["aggregate"] },
			{ property: "services", children: ["service"] },
			{ property: "invariants", children: ["invariant"] },
			{ property: "valueobjects", children: ["valueObject"] },
			{ property: "policies", children: ["policy"] },
			{ property: "processes", children: ["process"] },
			{ property: "schemas", children: ["schema"] },
			{ property: "glossary", children: ["term"] },
		],
		...both("context", CONTEXT_FIELDS),
	},
	{
		id: "relationship",
		label: "Relationship between contexts",
		schemaDefs: [
			"DirectedContextRelationshipSchema",
			"SymmetricContextRelationshipSchema",
		],
		parent: list(["workspace"], "relationships"),
		collections: [],
		add: op("add", "relationship", RELATIONSHIP_ADD()),
		update: op("update", "relationship", RELATIONSHIP_COMMON(), [
			{
				property: "type",
				label: "Type",
				reason: ENDS_REASON,
				source: ENDS_SOURCE,
			},
			{
				property: "name",
				label: "Name",
				reason: ENDS_REASON,
				source: ENDS_SOURCE,
			},
			{
				property: "upstream",
				label: "Upstream",
				reason: ENDS_REASON,
				source: ENDS_SOURCE,
				judged: "LC-CONTEXT",
			},
			{
				property: "downstream",
				label: "Downstream",
				reason: ENDS_REASON,
				source: ENDS_SOURCE,
				judged: "LC-CONTEXT",
			},
			{
				property: "participants",
				label: "Participants",
				reason: ENDS_REASON,
				source: ENDS_SOURCE,
				judged: "LC-CONTEXT",
			},
		]),
	},
	{
		id: "aggregate",
		label: "Aggregate",
		schemaDefs: ["AggregateSchema"],
		parent: rec(["context"], "aggregates"),
		collections: [
			{ property: "entities", children: ["entity"] },
			{ property: "invariants", children: ["invariant"] },
			{ property: "provides", children: ["consumable"] },
			{ property: "consumes", children: ["consumption"] },
		],
		...both("aggregate", () => [nameField(), descField(true)]),
	},
	{
		id: "entity",
		label: "Entity",
		schemaDefs: ["EntitySchema"],
		parent: rec(["aggregate"], "entities"),
		collections: [
			{ property: "attributes", children: ["attribute"] },
			{ property: "relations", children: ["entityRelation"] },
		],
		...both("entity", ENTITY_FIELDS),
	},
	{
		id: "entityRelation",
		label: "Entity relation",
		schemaDefs: ["EntityRelationSchema"],
		parent: list(["entity", "valueObject"], "relations"),
		collections: [],
		// A relation has no id and no ref: it is a row of its owner's `relations`,
		// edited by writing that whole list back (one row changed).
		add: op("add", "entityRelation", ENTITY_RELATION_FIELDS()),
		update: op("update", "entityRelation", ENTITY_RELATION_FIELDS()),
	},
	{
		id: "attribute",
		label: "Attribute",
		schemaDefs: ["AttributeSchema"],
		parent: rec(["entity", "valueObject", "schema"], "attributes"),
		collections: [],
		...both("attribute", ATTRIBUTE_FIELDS),
	},
	{
		id: "valueObject",
		label: "Value object",
		schemaDefs: ["ValueObjectSchema"],
		parent: rec(["context"], "valueobjects"),
		collections: [
			{ property: "attributes", children: ["attribute"] },
			{ property: "relations", children: ["entityRelation"] },
			{ property: "invariants", children: ["invariant"] },
		],
		...both("valueObject", () => [
			nameField(),
			descField(true),
			refOne(
				"specialises",
				"A kind of (value object)",
				"LC-VALUE-OBJECT-BORROWABLE",
			),
		]),
	},
	{
		id: "invariant",
		label: "Invariant",
		schemaDefs: ["InvariantSchema"],
		parent: rec(["aggregate", "valueObject", "context"], "invariants"),
		collections: [],
		...both("invariant", INVARIANT_FIELDS),
	},
	{
		id: "service",
		label: "Service",
		schemaDefs: ["ServiceSchema"],
		parent: rec(["context"], "services"),
		collections: [
			{ property: "provides", children: ["consumable"] },
			{ property: "consumes", children: ["consumption"] },
		],
		...both("service", () => [
			nameField(),
			descField(true),
			enumSelect("type", "Type", SERVICE_TYPE, true),
		]),
	},
	{
		id: "consumable",
		label: "Operation or event",
		schemaDefs: ["ConsumableSchema"],
		parent: rec(["aggregate", "service"], "provides"),
		collections: [],
		add: op("add", "consumable", CONSUMABLE_FIELDS()),
		// `type` is editable: it is an ordinary field no ref helper reads, and the
		// validator's own fixes tell authors to change it (writer-worker-report 9).
		update: op("update", "consumable", CONSUMABLE_FIELDS(), [keyRow()]),
	},
	{
		id: "consumption",
		label: "Consumption",
		schemaDefs: ["ConsumptionSchema"],
		parent: list(["aggregate", "service"], "consumes"),
		collections: [],
		add: op("add", "consumption", CONSUMPTION_FIELDS(true)),
		update: op("update", "consumption", CONSUMPTION_FIELDS(false), [
			{
				property: "consumable",
				label: "Takes",
				reason: CONSUMABLE_REASON,
				source: CONSUMABLE_SOURCE,
				judged: "LC-CONSUMED",
			},
		]),
	},
	{
		id: "policy",
		label: "Policy",
		schemaDefs: ["PolicySchema"],
		parent: rec(["context"], "policies"),
		collections: [],
		...both("policy", POLICY_FIELDS),
	},
	{
		id: "process",
		label: "Process",
		schemaDefs: ["ProcessSchema"],
		parent: rec(["context"], "processes"),
		collections: [{ property: "deadlines", children: ["deadline"] }],
		...both("process", PROCESS_FIELDS),
	},
	{
		id: "deadline",
		label: "Deadline",
		schemaDefs: ["DeadlineSchema"],
		parent: rec(["process"], "deadlines"),
		collections: [],
		...both("deadline", DEADLINE_FIELDS),
	},
	{
		id: "term",
		label: "Glossary term",
		schemaDefs: ["GlossaryTermSchema"],
		parent: rec(["context"], "glossary"),
		collections: [],
		...both("term", TERM_FIELDS),
	},
	{
		id: "schema",
		label: "Data schema",
		schemaDefs: ["DataSchemaSchema"],
		parent: rec(["context"], "schemas"),
		collections: [{ property: "attributes", children: ["attribute"] }],
		...both("schema", () => [nameField(), descField(false)]),
	},
];

/**
 * Properties of the supporting definitions a field writes as part of its own
 * value, so every property of the schema is accounted for somewhere.
 */
export const SUPPORT_PROPERTIES: Readonly<Record<string, string>> = {
	"RefSchema.$ref": "the reference a choice field writes",
	"Comment.text": "evidence field: one comment's text",
	"Comment.link": "evidence field: one comment's link",
	"CommentLink.kind": "evidence field: the link's kind",
	"CommentLink.url": "evidence field: the link's url",
	"CommentLink.label": "evidence field: the link's label",
	"RejectionRefSchema.$ref": "rejects field: the refusal's shape",
	"RejectionRefSchema.many": "rejects field: whether a list is refused with",
	"RejectionRefSchema.reasons":
		"rejects field: the outcomes the contract names",
	"ShapeRefSchema.$ref": "schema and returns fields: the shape",
	"ShapeRefSchema.many": "schemaMany and returnsMany checkboxes",
	"WorkspaceOptionsSchema.rules": "commentsRequired checkbox (options.rules)",
	"RuleOptionsSchema.commentsRequired": "commentsRequired checkbox",
};

/** Stated non-goals, never offered: see the header of this file. */
export const NOT_AUTHORED: ReadonlyArray<{ what: string; why: string }> = [
	{
		what: "remove, move and reorder an element",
		why: "not promised by this milestone",
	},
	{
		what: "rename an id, a relationship or a consumption's consumable",
		why: "they are keys of refs held elsewhere and no multi-file rewrite exists",
	},
	{
		what: "a standalone answers operation",
		why: "there is no separate answers form: an answer is a view of its operation's returns and rejects, which ARE edited on the operation (returns, rejects, each rejection's reason, and the many flags), so no answer field is restricted",
	},
	{
		what: "unknown properties",
		why: "the writer drops them when it re-emits a file (canonicalization limit, writer.ts)",
	},
];

export const OPERATION_COUNT = FAMILIES.reduce(
	(n, f) => n + (f.add ? 1 : 0) + (f.update ? 1 : 0),
	0,
);

export const familyById = (id: FamilyId): FamilyDescriptor =>
	FAMILIES.find((f) => f.id === id) as FamilyDescriptor;

export function operationOf(
	family: FamilyId,
	mode: "add" | "update",
): OperationDescriptor | undefined {
	return familyById(family)[mode];
}

/**
 * The family of the element a ref names, by the shape of the ref alone, or
 * undefined for a ref this form cannot author (an answer, a malformed ref).
 */
export function familyOfRef(ref: string): FamilyId | undefined {
	if (ref === "#") return "workspace";
	if (parseRelationshipRef(ref)) return "relationship";
	if (parseConsumptionRef(ref)) return "consumption";
	const segments = ref.split("/");
	if (segments[0] !== "#" || segments.length < 3 || segments.length % 2 === 0)
		return undefined;
	const collection = segments[segments.length - 2];
	const inside = (parent: string) => segments.includes(parent);
	switch (collection) {
		case "domains":
			return "domain";
		case "subdomains":
			return "subdomain";
		case "teams":
			return "team";
		case "boundedcontexts":
			return "context";
		case "aggregates":
			return "aggregate";
		case "entities":
			return "entity";
		case "attributes":
			return "attribute";
		case "valueobjects":
			return "valueObject";
		case "invariants":
			return "invariant";
		case "services":
			return "service";
		case "provides":
			return inside("aggregates") || inside("services")
				? "consumable"
				: undefined;
		case "policies":
			return "policy";
		case "processes":
			return "process";
		case "deadlines":
			return "deadline";
		case "glossary":
			return "term";
		case "schemas":
			return "schema";
		default:
			return undefined;
	}
}

/** The families that can be added under the element `ref` names (its own family decides, never the data under it). */
export function addFamiliesUnder(ref: string): FamilyId[] {
	const parent = familyOfRef(ref);
	if (!parent) return [];
	return FAMILIES.filter(
		(f) => f.add && f.parent?.families.includes(parent),
	).map((f) => f.id);
}
