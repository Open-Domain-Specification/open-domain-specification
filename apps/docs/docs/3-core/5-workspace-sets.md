---
sidebar_position: 5
title: Sets of Workspaces
---

# Sets of Workspaces

A project of any size wants more than one file: one per product area, per team or per
repository. A folder of workspace files is a **set**. Every file is one complete workspace with an
id of its own; there is no root document and no manifest that lists them, so the folder is the
set and what a host lists in it is what it loads.

```ts file=../../tests/workspace-set.example.test.ts
```

## Refs between files

A ref that begins `#/` is **local**: it is looked up in the file that writes it and nowhere else.
That is why two files may use the same id for different things, and each file's `ledger` is its
own. A ref to another file writes the path of that file first and then the same pointer, with no
second `#`:

```json
{ "$ref": "../payments/team.json#/boundedcontexts/ledger/services/api/provides/post" }
```

- The path is **relative to the file that holds the ref**, with forward slashes and
  percent-encoding of each file name as UTF-8 with uppercase hex. `my team.json` is
  `my%20team.json`, `a#%.json` is `a%23%25.json`, and `team b/ü.json` is `team%20b/%C3%BC.json`. A
  raw space, a raw non-ASCII character, a backslash, a colon, a query or a malformed `%` is not in
  the grammar, and no case or Unicode normalisation is applied.
- `.` and `..` are folded against the directory of the file that writes the ref, after decoding,
  so `%2E%2E` is a parent segment exactly as `..` is. A `..` is allowed **only while the result
  stays inside the set's root**, the folder the host opened: the `.ods` folder, the folder an
  upload was taken from, or the viewer's explicit root. A path that leaves the root, is absolute,
  names a URL, is empty, has an empty segment, does not end in `.json` or names `schema.json`
  resolves to nothing. Version 3.0.0 of the model is unchanged by any of this: the schema's `$ref`
  pattern admits the wider string and the loader reads it.
- The identity of an element across a set is the wire path of its file followed by its local ref,
  for example `a%23%25.json#/boundedcontexts/ledger`. It depends on that file alone, so adding,
  removing or reordering other files never changes it. Renaming or moving a file does change it,
  as it breaks every ref into that file.

## Typed resolution, and what goes wrong

One resolver reads every ref, local or qualified: it finds what the ref names and checks that it is
a kind of element the field can hold. A mistake in a model is a result, never a throw. A ref that
cannot be followed is an `unresolved-ref` at the element that wrote it, with the cause named in
the message:

| Cause | Meaning |
| --- | --- |
| invalid path | the path is not in the grammar, or leaves the root |
| no such file | no file of the set has that path (a workspace read alone has no set, so every qualified ref is this) |
| no such element | the file is there and has no element at that pointer |
| the wrong kind | the pointer names an element the field cannot hold |

Two diagnostics belong to the set rather than to a workspace. `file-path-invalid` leaves out a file
whose path a host offered but cannot be accepted (not canonical, not `.json`, `schema.json`, or
given twice), and every ref that would have reached it is reported unresolved at the file that
wrote it. `workspace-id-unique` reports the later of two files that claim one workspace id; both are
kept, and their elements stay apart by file.

## A file boundary changes no permission

What may cross a file is exactly what may cross a context. The same relationship, shared kernel,
conformist or customer-supplier route that lets a context name another's value object, schema,
consumable or identity within one file lets it do so across two, and the rules that refuse it in
one file refuse it across two (decisions 03, 14, 16, 17, 18, 21, 23 and 27). Where the contexts are
in different files, the relationship that permits the crossing may be declared in either; the rules
read every file of the set. A cycle between files is legal and is not diagnosed. A cycle the model
forbids is diagnosed wherever its links sit. A context lives wholly in one file: files never split
one or contribute members to another file's context. A domain, a subdomain or a team may be
declared in one file and served or owned by the contexts of others.

Options are per file. `options.rules.commentsRequired` in one file asks nothing of another.

## Loading

`WorkspaceSet.fromSchemas` takes `[path, schema]` entries and `WorkspaceSet.fromWorkspaces` takes
workspaces built with the DSL. Every workspace is made and joined to the set before any ref is
read. Loading a file does not throw on a mistake **in the model**: a bad ref, an unknown field, a
duplicate id or a path that cannot be accepted is a diagnostic of that file.

It does assume that what it is given is a workspace file. The loader is typed against
`WorkspaceSchema`, and JSON of another shape can make it throw: an empty object, `null`, an array
or a string; a context whose `aggregates` hold a number; a list of relationships holding `null`.
So a **host checks the shape of what it hands the loader** and reports a file that fails as a problem
of that file, with the rest of the set still loaded. The extension reports a file that is not JSON,
not a workspace, not loadable or at an unacceptable path on that file and leaves it out of the set;
the viewer and the upload route do the same with their own message, and
`packages/skill/skill/examples/validate.mjs` does it for the command line.

## What a save keeps

Four lists lose an entry when its ref fails, because the entry is the pair it joins: a consumer's
`consumes`, a workspace's `relationships`, an entity's or value object's `relations`, and a
consumption's `by`. When the failing ref has a path in front of its `#` (whether the path is
invalid, the file is not there, the element is missing or it is the wrong kind), the whole entry is
kept as it was written, with every key it had, **at the index it had**, and is written back
untouched. It links again as soon as the file and the element are there. This is deliberate: a
file that is not loaded yet should cost its author nothing. An unknown key inside such an entry is
not reported as unknown, because it is not dropped.

The cost decision 29 names is unchanged for everything else. A **local** ref in one of those four lists that names nothing is
still dropped on a save. An unknown field on an entry that does resolve is still dropped, and
reported by `unknown-field`. A bad reference on any other element survives the round trip on that
element.

## Order

Every reader takes the order of its host: files are listed in **code point order of their path**.
The model carries no order hint and no manifest. Lists that gather across files, for example the
consumers of a provider, the files of a set page, a context map across files or a generated
Markdown sidebar, follow that order. Renaming a file can therefore reorder such a list. That is the
price of having no root document to say otherwise. Order inside a file is the file's own, and
unchanged.

## The DSL

`new WorkspaceSet` does not exist; the constructor is private. `WorkspaceSet.fromWorkspaces` joins
workspaces built through the DSL and throws, as the DSL does for any programming error, for a path
that is not canonical, a path given twice, or a workspace that is already in a set. Declare every
workspace before linking any: an element of one workspace may be passed to another's builder, and
the set is where that becomes a file-qualified ref.

`upstreamOf` and `downstreamOf` both store the relationship with the **upstream** context's
workspace: `a.downstreamOf(b)` is `b.upstreamOf(a)`. Across two workspaces that puts it in the
other file. To keep a relationship in the downstream context's file, as the NorthBank team modules
do, call `addRelationship` on the downstream workspace explicitly.

## The twelve files of NorthBank

The NorthBank reference model is a set: twelve team workspaces under `models/northbank/.ods`,
generated from twelve team modules. No single file reaches all twelve through its refs; the one that reaches most reaches eleven. The Markdown
site under `models/northbank/docs` is generated from the set, and each reader opens it through its
own input; see [Pages](../8-pages.md), the [viewer](../6-viewer.md) and the [Markdown
generator](../5-doc/index.md).

## Editing in VS Code

The extension edits through the file that owns the thing being edited, and only that file. It
reads the text of every file of the folder first (the open editor's text when the file is open,
saved or not, else the disk) and builds a fresh set from it each time, so what a ref means is never
decided by an earlier load. What this does and does not promise:

- A file with an open editor is edited **in the editor**. A dirty owning buffer is edited in place
  and **stays unsaved**, so the person keeps control of saving; a clean one is edited and then
  saved. Any other open buffer is only read, never written.
- The extension checks the document's version and a digest of its text immediately before the edit,
  and runs the whole step once more from fresh text if they moved. A second difference is reported
  as `file-changed` and nothing is written. **This check is not atomic.** VS Code's own
  `WorkspaceEdit` was observed (VS Code 1.96.4) to accept an edit prepared against a document
  version that had since moved, and to overwrite the intervening change; it does not reject a
  stale edit for us. It did reject an edit while a keystroke was in flight, which is a different
  observation and is not relied on.
- A save of a clean buffer whose file changed on disk can be refused by VS Code. The change then
  stays in the editor, unsaved, with an action that says to compare and save or revert.
- A file not open in an editor is read and written on disk: read, re-read immediately before the
  write and compared, then written to a temporary file and renamed over the target. **This is not
  compare-and-swap.** A write by someone else that lands between the re-read and the rename is
  overwritten undetected.
- Nothing is read again after the edit: a dependency file changing between the read and the write
  is not noticed. No kernel compare-and-swap and no atomic snapshot of the files is claimed.
- Writing the owning file again drops what [a save drops](#what-a-save-keeps) and keeps the rest,
  including the qualified entries kept raw at their index.
