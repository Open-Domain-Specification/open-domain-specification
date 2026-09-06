---
status: Proposed (was Accepted; set back on 2026-09-07 because WorkspaceSet is unimplemented and decisions 14 and 17 cite it as if in force; it returns to Accepted when the set loads)
date: 2026-09-02
---
# Decision 08 — Several workspace files per project, linked by JSON References

## Current position (2026-09-10)

Status is Proposed: `WorkspaceSet` is not implemented (amendment of 2026-09-07), and nothing since has changed that. The file model, the JSON Reference form, the two-phase load, the dump rules and the rejected alternatives stand as the design to build; none has been amended.

The crossing table is to be read as the single-file rules read today, and a crossing will be allowed across files exactly where it is allowed across contexts (amendment of 2026-09-09). Rows that no longer state the single-file rule: `AttributeSchema.valueobject` and `ConsumableSchema.schema` may cross to a shared kernel or a conformed-to upstream (decisions 16 and 03, cards 81 and 92), and `InvariantSchema.constrains` may reach a borrowed value held inside the boundary (decision 27, card 89). The `AttributeSchema.schema` row says "no (decision 18)" while decision 18 admits a shared-kernel partner's schema and `schema-context` admits a conformed-to upstream's as well (verified in `packages/core/src/validate.ts`, `schemaContext`); the amendment's general rule covers it, the row does not. `PolicySchema.on` and the process fields may also name an answer of a consumed operation (decision 23).

The promised set rule that a consumption needs a matching relationship exists for one file as `relationship-declared` (card 70), narrowed since so that an identity crossing is not asked (decision 14, card 100). The `odsVersion` minor bump became the `2.0.0` constant of decision 29 (card 114). Whether `Workspace.fromSchema` still throws on a file-qualified `$ref` under decision 29's rule that loading never throws is not stated by either record.

## Context

A workspace is one self-contained JSON document. Every ref is a fragment
(`#/boundedcontexts/<id>/...`) resolved inside that document by
`getWorkspaceFromSchema`. The VS Code extension keeps a project's model as
JSON files in a `.ods` folder, authored by the extension and by LLMs, and a
project of any size wants more than one file: one per product area, per
team, or per repository. Those files must be able to point at each other so
that a context in one file can consume what a context in another provides.
See board vsc-extension card 07.

## Decision

### Files

- Each file in `.ods` is a complete workspace with its own `id`, `name`,
  `version` and `odsVersion`. There is no project-level root document; the
  folder is the set.
- A bounded context lives entirely in one file. Files never split a context
  or contribute members into another file's context.
- Workspace ids must be unique within the set. Element ids keep their scope
  from decision 07: unique among siblings inside their workspace.

### References

- Cross-file references use JSON Reference form in the existing `$ref`
  fields: a relative file path, then `#`, then the same fragment as today.

  ```json
  { "$ref": "orders.json#/boundedcontexts/orders/aggregates/order/events/order_placed" }
  ```

- A fragment-only `$ref` stays local to its file. Nothing changes for a
  single-file project.
- The path is resolved relative to the referencing file's directory and must
  stay inside the set: no `..` segments, no absolute paths, no URLs. Nested
  folders under `.ods` are allowed and appear in the path.
- Only the strategic seam may cross a file boundary:

  | Field | May cross |
  |---|---|
  | `ConsumptionSchema.consumable` | yes |
  | `ContextRelationshipSchema.upstream`, `downstream`, `participants` | yes |
  | `BoundedContextSchema.subdomains` | yes |
  | `BoundedContextSchema.team` | yes |
  | `AttributeSchema.valueobject` | no, except into a context this one shares a kernel with (decision 16, card 49) |
  | `ConsumableSchema.raises` | no (an operation raises its own context's events; card 69) |
  | `EntityRelationSchema.target` | no |
  | `InvariantSchema.constrains` | no |
  | `PolicySchema.on` | yes: a consumption, through the file's dependency (decision 17) |
  | `PolicySchema.then` | no (decision 17) |
  | `GlossaryTermSchema.embodiedBy` | no |
  | `AttributeSchema.schema` | no (decision 18) |
  | `AttributeSchema.identifies` | yes, through the file's dependency, like a consumption (decision 14) |
  | `ConsumptionSchema.by` | no (it names the consumer's own operations, decision 21) |
  | `ProcessSchema.starts`, `on`, `ends` | yes, as `PolicySchema.on` (decision 23) |
  | `ProcessSchema.then` | no |

  Everything below a context is that context's own model, and DDD says a
  context reaches another only through published language, open host
  services and the relationships between them. A context that wants to react
  to another file's event consumes it and raises its own. A file-crossing
  ref in a field marked no is a load error.

### Loading and dumping

- Core gains a `WorkspaceSet`. It is constructed from a map of relative path
  to `WorkspaceSchema`; reading the folder stays with the caller so core
  remains free of file IO, as it is today.
- Loading is two-phase. Every file is built with local refs only, then
  cross-file refs are linked against the set. Cycles between files are
  therefore fine: two contexts in two files may consume from each other.
- In memory a cross-file link is an ordinary object reference. A
  `Consumption` points at a `Consumable` that happens to belong to another
  `Workspace`. Nothing downstream of the model has to know where an element
  came from unless it asks, via the element's workspace.
- `toSchema` on an element emits a file-qualified `$ref` whenever the target
  belongs to a different workspace, using the set's paths to form the
  relative path from the referencing file. `WorkspaceSet.toSchemas` returns
  the map of path to schema, and the caller writes only the files it needs.
- `Workspace.fromSchema` keeps working for a single file. If it meets a
  file-qualified `$ref` it throws and names the set loader; a file with
  external refs cannot be loaded in isolation.
- An unresolved cross-file ref is a load error for the set, not a
  diagnostic. A partial model that silently dropped a link would dump a file
  that lost information. The extension turns the error into a diagnostic on
  the referencing file and keeps the previous instance, per card 06.

### Validation

- `WorkspaceSet.validate` runs every workspace's rules and adds set rules:
  duplicate workspace id, a file-qualified ref in a field that may not cross,
  and the existing structural rules evaluated across files, so a consumption
  of another file's consumable still needs a matching context relationship.

### Downstream packages

- The visitor gains `visitWorkspaceSet`, which by default visits each
  workspace. Existing visitors keep working on a single workspace.
- Graphviz maps accept a workspace or a set. Over a set the context map,
  consumable map and flow map draw every context and cluster them by
  workspace; the relation map stays per aggregate and is unaffected.
- Doc output over a set produces one folder per workspace and links across
  folders where refs cross.
- The example workspace package gains a second file that consumes Petstore
  events, so the set path is exercised by the existing docs and UI builds.

### Schema

- `$ref` values get a pattern that admits both forms, and their descriptions
  state which fields may carry a file path. The generated schema is one file
  shared by every workspace in the set, referenced from each by `$schema`.

## Consequences

- No change for single-file documents; `odsVersion` takes a minor bump for
  the widened `$ref` grammar.
- Renaming a file breaks refs into it, the same as renaming an id. The
  rename operation from card 01 rewrites refs across the set.
- Teams and subdomains can be defined once and referenced from many files,
  which invites a convention of a small shared file for them. It is a
  convention, not a schema role.
- Hand-written cross refs are longer, but they read as paths and the schema
  gives completion on the local part.
- Rejected: a project-level root document listing its files. It would be a
  second thing to keep in sync and would make a file meaningless outside its
  project. Also rejected: workspace-id-qualified refs (`orders#/...`).
  They need an index from id to file before anything resolves, and they are
  not JSON References, so generic tooling could not follow them.

## Amendment (2026-09-07)

The architect review found this record cited as in force while nothing implements it, and its crossing table naming fields decision 09 removed and missing fields decisions 14, 18, 21 and 23 added. The table is corrected above and the status is Proposed until the set loads. The promised set rule, that a consumption of another file's consumable needs a matching relationship, is written now for the single-file case as `relationship-declared` (card 70); the set version inherits it.

## Amendment (2026-09-09)

The crossing table above predates decisions 16, 19, 27 and 28: `AttributeSchema.valueobject` and `ConsumableSchema.schema` may now cross to a shared kernel or a conformed-to upstream, and an invariant may constrain a borrowed value held inside its boundary. Read the table as the single-file rules read today; when the set is implemented, a crossing is allowed across files exactly where it is allowed across contexts.

## Note (2026-09-10)

Two rows of the crossing table lag the record: `AttributeSchema.schema` reads "no", and decision 18 with decision 16's amendment of 2026-09-08 lets an attribute be typed by a shared-kernel partner's or a conformed upstream's schema, so the row reads "yes, where decision 16 allows it"; and "it throws and names the set loader" predates decision 29, under which a file-qualified ref is an `unresolved-ref` diagnostic until this record is implemented.
