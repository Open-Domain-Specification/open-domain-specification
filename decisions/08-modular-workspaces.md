---
status: Proposed (was Accepted; set back on 2026-09-07 because WorkspaceSet is unimplemented and decisions 14 and 17 cite it as if in force; it returns to Accepted when the set loads)
date: 2026-09-02
---
# Decision 08 — Several workspace files per project, linked by JSON References

## Current position (2026-10-04)

The set is implemented in this working tree. `WorkspaceSet` loads a folder of complete workspace files (`fromSchemas`), joins DSL workspaces (`fromWorkspaces`), validates them together and dumps them back (`toSchemas`); core, the extension, the shared renderer in its three hosts, `packages/doc` and `packages/graphviz` read it, and NorthBank is a set of twelve files. The status stays Proposed here, because returning it to Accepted is the milestone's acceptance and not this record's to declare.

What holds, replacing the design below where the two differ (the amendment of 2026-10-04 lists each sentence it replaces):

- **Files.** Each file is one complete workspace with an id of its own; the folder is the set; there is no root document, no manifest and no order hint. A context lives wholly in one file.
- **Refs.** A fragment-only `$ref` is local to its file, and local ids may repeat across files. A ref to another file is the percent-encoded relative path of the file written straight before the pointer, `ledger.json#/boundedcontexts/ledger`, with a single `#`. `.` and `..` are folded, after decoding, against the writing file's directory, and `..` is allowed exactly when the result stays inside the explicit set root. An absolute path, a URL, a backslash, a bad percent sequence, an empty segment, a name that is not `.json` and `schema.json` resolve to nothing.
- **Resolution.** One typed resolver reads every ref. A failure is an `unresolved-ref` at the element that wrote it, with one of four causes: invalid path, no such file, no such element, the wrong kind. A mistake in a file never throws.
- **Permissions.** A file boundary grants and removes nothing: a ref crosses a file exactly where the same ref may cross a context. The crossing table below is replaced by that sentence.
- **Diagnostics.** The two rules about a set are `file-path-invalid` and `workspace-id-unique`. Options belong to the file that sets them.
- **Identity.** An element's key in a set is the wire path of its file and its local ref; it depends on that file alone. `odsVersion` stays `3.0.0`.
- **Retention.** In the four lists whose entry is the pair it joins, an entry whose ref has a path before its `#` and fails is kept raw at its index and written back; a local ref that names nothing keeps decision 29's named cost and is dropped on a save.
- **Order.** Hosts read files in code point order of path and listings that gather across files follow that order; the price is stated in the amendment.

The note of 2026-09-10 and the amendments of 2026-09-07 and 2026-09-09 are history for the design that stood until today.

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

## Amendment (2026-10-04)

The set is built. This amendment records what the build does where the design above says something else; every sentence it replaces stays as written on the day.

**Replaced.**

- "must stay inside the set: no `..` segments, no absolute paths, no URLs." `..` is allowed exactly when the folded path stays inside the explicit set root, because sibling folders and a cycle between them cannot otherwise be written. Absolute paths, URLs and a root that is escaped remain refused. The root is explicit and supplied by the host (the `.ods` folder, the folder an upload was taken from, the viewer's `root`); parent traversal outside it is never followed, and nothing is a manifest. A flat layout, which NorthBank is, does not need `..`.
- The `$ref` form "a relative file path, then `#`, then the same fragment": the path is the wire form of a raw set path. A raw `SetPath` (what a host holds: Unicode, forward slashes, canonical) and its `WirePath` (what a ref, a URL or a link writes: each segment as UTF-8, bytes outside the RFC 3986 unreserved set as `%` and two uppercase hex digits) are two types with one codec. `my team.json` is `my%20team.json`, `a#%.json` is `a%23%25.json`. No case folding and no Unicode normalisation is applied, so a file system that cannot hold two names that differ only in case or form reports the second as `file-path-invalid`. The pointer after the `#` keeps its own codec, unchanged.
- The crossing table and "A file-crossing ref in a field marked no is a load error". A crossing is allowed across files exactly where it is allowed across contexts (the amendment of 2026-09-09), through the live rules (decisions 03, 14, 16, 17, 18, 21, 23 and 27 and `schemaContext`). The rows the amendment of 2026-09-09 and the note of 2026-09-10 already name as stale are not repeated.
- "`Workspace.fromSchema` ... throws and names the set loader." Under decision 29 a qualified ref in a workspace loaded alone is an `unresolved-ref` whose cause is "no such file", because there is no set to look in.
- "An unresolved cross-file ref is a load error for the set, not a diagnostic ... keeps the previous instance." It is a diagnostic at the referencing file, and the four lists whose entry is a pair keep a qualified entry raw (decision 29, note of 2026-10-04). The extension still shows a file that no longer loads from its last good load, labelled stale, for display only; its edit path never reads a last-good load.
- "`WorkspaceSet.validate` ... a file-qualified ref in a field that may not cross." The set rules are `workspace-id-unique` and `file-path-invalid`; every other rule is asked over the files together, with the relationships, consumptions, contexts and reactors of all of them in view. A file that refers back to the file that refers to it is legal and is not diagnosed; a cycle the model forbids is diagnosed wherever its links are.
- "`odsVersion` takes a minor bump." No bump: the metamodel number is `3.0.0` and widening what a `$ref` string may say changes none of it (decision 29, note of 2026-10-01).
- "The rename operation from card 01 rewrites refs across the set." Not built; renaming or moving a file breaks every ref into it, as the consequence above already says of an id.
- "The example workspace package gains a second file that consumes Petstore events." Superseded by NorthBank, which is split into twelve team files, the monolith kept only as a frozen fixture.

**Built as designed.** `toSchemas` writes a ref to another file as the relative wire path of its file, so what is written loads back to the same set. Loading is two-phase: every workspace is made and joined to the set before any ref is read. The visitor gains `visitWorkspaceSet`, which by default visits each workspace. Graphviz maps are built from a workspace or a set (`fromSet`), draw every context, cluster them by workspace and keep colliding local ids apart by file, and label a node or cluster with its workspace where a map holds several. Doc output over a set is one folder of pages per file, named after the file, with links across folders and a first page that lists the files (`toDocSet`); a set of one workspace is written as that workspace alone, and `toDoc`, which writes one workspace alone, refuses a file that belongs to a set of several, since its links to the other files would resolve to nothing.

**Added.** Local ids stay scoped to their file; the identity of an element across a set, `setKey`, is the wire path of its file followed by its local ref and is independent of how many other files there are. Readers that hold more than one workspace key, route and link by it (`#/workspaces/<file>/...`); a reader that holds one keeps the route it always had.

## Amendment (2026-10-04, second): the price of having no root

There is no manifest and no order hint, so two things follow, and neither is a defect to fix without reopening this record.

- **Order is the host's.** The extension, the viewer's uploads, the static export and the Markdown generator read the files of a folder in code point order of their path, and a derived listing that gathers across files follows that order: the consumers of a provider, a set page, a context map drawn across files, a generated sidebar. Order inside a file is the file's own and does not change. Changing file names can reorder an aggregated listing, and the order differs from the order a single-file model of the same elements had; for NorthBank, 13 of 14 aggregated listings and the position rows of 8 context pages change with file order. The DSL's link order is not what a host reads, so a model built from DSL modules and the same model read back from its folder may list a provider's consumers differently; documentation generated for a folder is generated from the folder.
- **A reader given one address sees what that address reaches.** A static host lists nothing, so a viewer started from one URL follows only forward refs: a file nothing reachable refers to (a team file nobody else names, or one that only refers outwards) is not found. The viewer says so and never presents such a set as the whole project; passing more entries or uploading the folder gives a complete set. For NorthBank no single file reaches all twelve; the one that reaches most reaches eleven. The viewer's routine bounds are 64 files, 2 MiB per file and 4 requests at a time; a file past a bound is left out with its own message and the refs into it are `unresolved-ref` for a missing file.

Reopening condition: a reader that cannot list a folder and needs the complete set, or a listing whose order a file name cannot give; either would call for a decision on a manifest or an order hint, which this record rejected and still rejects.

## Amendment (2026-10-04, third): where a relationship lives

A relationship is stored with the workspace that declares it, and the rules read the relationships of every file, so it may be declared in any file of a set. The DSL helpers `upstreamOf` and `downstreamOf` store it in the **upstream** context's workspace (`a.downstreamOf(b)` is `b.upstreamOf(a)`), so across two workspaces they put it in the other file. This is the behaviour of the helpers, documented, and no rule or default makes the downstream's file automatic; nothing in core was changed for NorthBank. NorthBank's team modules call `addRelationship` on the downstream context's workspace, so each relationship lives in its downstream's file (a symmetric one in its first participant's); six of its 34 stay inside one file and 28 cross files. `iso_13616` is the one context whose file the plain rule would put elsewhere: it is upstream of two contexts in two files and is kept in `payments.json` as a pinned one-entry override of that rule, already approved; no further reason is given here.

## Amendment (2026-10-04, fourth): what the loader assumes, and what the extension's writer can promise

**Malformed input.** The loader takes a `WorkspaceSchema`. A mistake in the model is a diagnostic and never a throw, but JSON of another shape can make the loader throw: an empty object, `null`, an array or a string, a context whose `aggregates` hold a number, a list of relationships holding `null`. Core makes no claim that arbitrary malformed depth is handled without a throw. A host that reads files shape-checks what it hands the loader, catches what still throws, and reports the file as a problem of that file, leaving it out of the set so the rest load; the extension does this with four causes (not JSON, not a workspace file, could not be loaded, an unacceptable path), and the viewer and uploads leave such a file out with a message of their own.

**The writer.** A form edit changes only the file that owns the thing edited, built from the text of every file of the folder read fresh each time (the open editor's text when the file is open, else the disk), never from a last-good load. These are observations of VS Code 1.96.4 and a design, not guarantees:

- `workspace.applyEdit` does not reject an edit prepared against a document version that has since moved; a prepared stale edit was accepted and overwrote an intervening change. The only guard is the writer's own check, immediately before the edit, of the buffer's version and a digest of its text. A mismatch makes it read again and retry once; a second mismatch is `file-changed` and nothing is written. That check is not atomic with the edit. `applyEdit` did return false while a keystroke was in flight, observed in three runs and not for every interleaving, so it is not relied on either.
- A dirty owning buffer is edited in place and stays unsaved. Any other open buffer, dirty or clean, is read as the dependency text and never written. A clean buffer is edited and saved; a save of a clean buffer whose file changed on disk returned false in the host, the disk change was preserved, and the writer reports the change as retained unsaved with the action to compare and save or revert.
- A file that is not open is read, re-read immediately before the write and compared, written to a temporary file and renamed over the target. The same residual race remains: a write that lands between the re-read and the rename is overwritten undetected, and a dependency file read earlier is not read again after the edit.
- No compare-and-swap, no atomic snapshot of the files of a set, and no protection against every interleaving of the editor, the disk and a dependency is claimed. An unreadable dependency a change refers to, or an owner that does not parse, refuses the change with the action that fixes it; other unresolved refs and dirty buffers do not.
- Writing the owner again is canonical: it drops what decision 29 names and keeps the qualified entries of the four lists raw at their index.

## Historical: the Current position as it stood on 2026-09-10

This is the Current position this record carried until 2026-10-04, restored verbatim from the file at the base of the work. It is history, superseded by the Current position at the top; it records what held on the day, when `WorkspaceSet` was not implemented.

Status is Proposed: `WorkspaceSet` is not implemented (amendment of 2026-09-07), and nothing since has changed that. The file model, the JSON Reference form, the two-phase load, the dump rules and the rejected alternatives stand as the design to build; none has been amended.

The crossing table is to be read as the single-file rules read today, and a crossing will be allowed across files exactly where it is allowed across contexts (amendment of 2026-09-09). Rows that no longer state the single-file rule: `AttributeSchema.valueobject` and `ConsumableSchema.schema` may cross to a shared kernel or a conformed-to upstream (decisions 16 and 03, cards 81 and 92), and `InvariantSchema.constrains` may reach a borrowed value held inside the boundary (decision 27, card 89). The `AttributeSchema.schema` row says "no (decision 18)" while decision 18 admits a shared-kernel partner's schema and `schema-context` admits a conformed-to upstream's as well (verified in `packages/core/src/validate.ts`, `schemaContext`); the amendment's general rule covers it, the row does not. `PolicySchema.on` and the process fields may also name an answer of a consumed operation (decision 23).

The promised set rule that a consumption needs a matching relationship exists for one file as `relationship-declared` (card 70), narrowed since so that an identity crossing is not asked (decision 14, card 100). The `odsVersion` minor bump became the `2.0.0` constant of decision 29 (card 114). Whether `Workspace.fromSchema` still throws on a file-qualified `$ref` under decision 29's rule that loading never throws is not stated by either record.
