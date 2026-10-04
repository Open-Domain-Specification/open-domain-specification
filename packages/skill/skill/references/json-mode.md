# JSON mode

The workspace files are the artefact. Each `.ods/**/*.json` file is one complete workspace. A
lone file loads with `Workspace.fromSchema`; a folder of them loads together with
`WorkspaceSet.fromSchemas`, which is what the VS Code extension, the viewer and the docs
generator do. See "Several workspace files" below.

## Files

- `.ods/` (or the folder named by the VS Code setting `ods.folder`) at the project root.
- `.ods/schema.json`: the JSON Schema, written by the extension (`ODS: Write schema.json`).
  Never edit it. If it is missing, copy it from
  `node_modules/@open-domain-specification/core/dist/workspace.schema.json`.
- `.ods/<workspace-id>.json`: one workspace per file, at the top of the folder or in any folder
  below it. The file name is not part of the model, but a file's path is its address in a
  `$ref` from another file, so renaming or moving a file breaks every ref into it. The first key is
  `"$schema": "./schema.json"`; the loader ignores it, editors use it for completion.
- Keep the file's `id` equal to its basename, and `odsVersion` equal to the ODS version core
  writes: `"3.0.0"`, which is what the `minimal.ods.json` example carries. A file whose major
  differs from the core reading it, or that states none, gets an `ods-version` error saying so;
  the number is bumped by the decision that breaks the metamodel, never by hand to silence it.

The smallest valid file is `examples/minimal.ods.json`. Copy it when creating a workspace, then
grow it.

## Editing rules

- The schema is strict about what it does not know: unknown fields are rejected.
  `references/model-reference.md` lists what each element requires. A map of elements — a
  context's aggregates, services, policies, processes, invariants, glossary, value objects and
  schemas, an aggregate's entities, either one's `provides`, an entity's or a value object's
  `relations` — is left out when it is empty; writing it empty says the same thing and is
  longer.
- Ids are the raw object keys. Create them as `snake_case` of the name, then never change them.
  Renaming is changing `name`. Keep an authored key verbatim, including an explicit empty key;
  do not put JSON Pointer escaping into the key. When that id appears in a `$ref`, encode the
  complete key as one segment: `~` becomes `~0`, then `/` becomes `~1`. Thus raw key `a/b~c`
  appears as `a~1b~0c`, while raw key `a~1b~0c` is the distinct segment `a~01b~00c`.
- Every `$ref` follows the grammar at the end of `model-reference.md` and points at something
  that exists. A dangling ref does not fail the whole file: it loads, the field it was in is left
  unset, and validation reports it as an `unresolved-ref` diagnostic at the element that wrote it,
  alongside whatever else the rest of the file finds.
- Preserve the key order and two-space indentation of the file so diffs stay readable.
- Prefer several small edits, each followed by validation, over one large rewrite.

## Validation

There is no CLI. Run `examples/validate.mjs` from the project root. Give it the `.ods` folder, so
every file is checked together as one set:

```sh
node .claude/skills/ods-authoring/examples/validate.mjs .ods
```

Or inline, for a folder that holds one file:

```sh
node -e 'const {Workspace}=require("@open-domain-specification/core");const f=process.argv[1];const ws=Workspace.fromSchema(JSON.parse(require("fs").readFileSync(f,"utf8")));for(const d of ws.validate())console.log(`[${d.severity}] ${d.rule}: ${d.message} (${d.ref})`)' .ods/petstore.json
```

A single file given to the script is judged on its own: every ref it writes to another file
reports `unresolved-ref` with the cause that the file is not in the set, which says nothing about
the other file.

If `@open-domain-specification/core` is not installed, prefix with
`npx -p @open-domain-specification/core` or install it as a devDependency. The VS Code Problems
panel shows the same diagnostics (source `ods`, code = rule id) and updates on save.

## Several workspace files

A `.ods` folder may hold several files, at any depth. Each is one complete workspace with an id
of its own, and together they are a set. There is no root file and no manifest listing them: the
folder is the set. The grammar is at the end of `model-reference.md`; what to do with it:

- **Local ids belong to the file.** A ref that starts `#/` is looked up in its own file only, so
  two files may both have a `ledger` context and each file's refs mean its own. Never expect a
  local ref to find an element in another file.
- **Write a ref to another file as the path, then the pointer.** The path is relative to the file
  that holds the ref, with forward slashes and percent-encoding, and has no `#` of its own:
  `{ "$ref": "../payments/team.json#/boundedcontexts/ledger/services/api/provides/post" }`. A
  space is `%20`, `#` is `%23`, `%` is `%25` and a non-ASCII character is its UTF-8 bytes, so
  `team b/ü.json` is `team%20b/%C3%BC.json`. `..` is fine while the result stays inside the
  `.ods` folder; a path that leaves it, is absolute or is a URL resolves to nothing.
- **A file boundary changes no permission.** A file may name another file's value object, schema,
  consumable, identity or subdomain exactly where a context may name another context's, and the
  same rules refuse it where they would refuse it inside one file. Do not look for a "may cross a
  file" list; the rules about contexts are the list.
- **A context lives wholly in one file.** Do not split one, and do not add aggregates to another
  file's context. A domain, a subdomain and a team may be declared in one file and served or
  owned by contexts of others.
- **Put a relationship in the file of the context it is about.** NorthBank's convention is the
  file of the downstream context's team; the model accepts it in either file and the rules read
  both. The DSL's `upstreamOf` and `downstreamOf` place it in the upstream context's file; to put
  it in the downstream's, call `addRelationship` on the downstream's workspace.
- **Give every file a workspace id of its own.** Two files with one id are both loaded and the
  later one gets `workspace-id-unique`. A path the host cannot accept (not relative, not `.json`,
  `schema.json`, given twice) leaves that file out with `file-path-invalid`.
- **Options belong to the file that sets them.** `options.rules.commentsRequired` in one file
  asks nothing of another.
- **Cycles between files are legal.** Two files may refer to each other; only a cycle the model
  forbids is diagnosed, wherever its links sit.
- **Order is the host's.** Files are read in code point order of their path, and a list that
  gathers across files (the consumers of a provider, a set page, a context map) follows that
  order. There is no order hint and no manifest, so renaming a file can reorder such a list.
- **A ref that cannot reach its file is kept, not lost.** In the four lists whose entry is the
  pair it joins (a consumer's `consumes`, `relationships`, an entity's or value object's
  `relations`, a consumption's `by`), an entry whose ref has a path in front of its `#` and
  fails, however it fails, is kept as written at its index and written back untouched, and
  `unresolved-ref` names it. A local ref that names nothing is still dropped on a save, which is
  the cost decision 29 names; an unknown key on an entry that does resolve is still dropped and
  reported by `unknown-field`.
- **A file that is not a workspace is a problem of that file.** The loader takes a
  `WorkspaceSchema` and a JSON file of another shape can make it throw, so a script of yours
  checks the shape first and reports the file, as the extension does with a Problem on that file
  and the rest of the set loaded. `examples/validate.mjs` does the same.
