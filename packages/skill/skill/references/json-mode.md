# JSON mode

The workspace files are the artefact. Each `.ods/*.json` file is one complete workspace, and
the VS Code extension, the docs generator and anyone else load it with `Workspace.fromSchema`.

## Files

- `.ods/` (or the folder named by the VS Code setting `ods.folder`) at the project root.
- `.ods/schema.json`: the JSON Schema, written by the extension (`ODS: Write schema.json`).
  Never edit it. If it is missing, copy it from
  `node_modules/@open-domain-specification/core/dist/workspace.schema.json`.
- `.ods/<workspace-id>.json`: one workspace per file. The first key is
  `"$schema": "./schema.json"`; the loader ignores it, editors use it for completion.
- Keep the file's `id` equal to its basename, and `odsVersion` equal to the other files' (use
  `"1.0.0"` for a first file).

The smallest valid file is `examples/minimal.ods.json`. Copy it when creating a workspace, then
grow it.

## Editing rules

- The schema is strict about what it does not know: unknown fields are rejected.
  `references/model-reference.md` lists what each element requires. A map of elements — a
  context's aggregates, services, policies, processes, invariants, glossary, value objects and
  schemas, an aggregate's entities, either one's `provides`, an entity's or a value object's
  `relations` — is left out when it is empty; writing it empty says the same thing and is
  longer.
- Ids are the object keys. Create them as `snake_case` of the name, then never change them.
  Renaming is changing `name`.
- Every `$ref` follows the grammar at the end of `model-reference.md` and points at something
  that exists. A dangling ref does not fail the whole file: it loads, the field it was in is left
  unset, and validation reports it as an `unresolved-ref` diagnostic at the element that wrote it,
  alongside whatever else the rest of the file finds.
- Preserve the key order and two-space indentation of the file so diffs stay readable.
- Prefer several small edits, each followed by validation, over one large rewrite.

## Validation

There is no CLI. Run `examples/validate.mjs` from the project root:

```sh
node .claude/skills/ods-authoring/examples/validate.mjs .ods/petstore.json
```

Or inline:

```sh
node -e 'const {Workspace}=require("@open-domain-specification/core");const f=process.argv[1];const ws=Workspace.fromSchema(JSON.parse(require("fs").readFileSync(f,"utf8")));for(const d of ws.validate())console.log(`[${d.severity}] ${d.rule}: ${d.message} (${d.ref})`)' .ods/petstore.json
```

If `@open-domain-specification/core` is not installed, prefix with
`npx -p @open-domain-specification/core` or install it as a devDependency. The VS Code Problems
panel shows the same diagnostics (source `ods`, code = rule id) and updates on save.

## Several workspace files

A `.ods` folder may hold several files. Treat each as its own workspace; refs never cross files.
