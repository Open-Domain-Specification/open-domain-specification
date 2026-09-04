---
status: Accepted
date: 2026-09-02
---
# Decision 08 — Several workspace files per project, linked by JSON References

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
  | `AttributeSchema.valueobject` | no |
  | `CommandSchema.raises` | no |
  | `EntityRelationSchema.target` | no |
  | `InvariantSchema.constrains` | no |
  | `ConsumableSchema.event`, `command` | no |
  | `PolicySchema.on` | yes: a consumption, through the file's dependency (decision 17) |
  | `PolicySchema.then` | no (decision 17) |
  | `GlossaryTermSchema.embodiedBy` | no |

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
