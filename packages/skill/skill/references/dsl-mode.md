# DSL mode

The TypeScript source is the artefact; the JSON under `.ods/` is generated from it. Edit the
source, run the generator, read the diagnostics it prints.

## Find the generator

Look for a file that imports `Workspace` from `@open-domain-specification/core`, builds the
model, and writes `workspace.toSchema()` to disk. The canonical shape (from the ODS example
package) is:

```ts
import fs from "node:fs";
import { workspace } from "./petstore/workspace.ts";

for (const d of workspace.validate()) {
	console.log(`[${d.severity}] ${d.rule}: ${d.message} (${d.ref})`);
}

fs.mkdirSync(".ods", { recursive: true });
fs.writeFileSync(
	".ods/petstore.json",
	JSON.stringify({ $schema: "./schema.json", ...workspace.toSchema() }, null, 2),
);
```

`package.json` usually has a script for it (`build`, `ods`, `generate`, `model`). Node 24 runs
`.ts` files directly; on older Node use `npx tsx <file>`.

## Loop

1. Edit the model source. Keep the file's existing sections and ordering (domains, teams,
   contexts, then one section per context).
2. Run the generator. It validates and rewrites the JSON.
3. Read every `[error]` and `[warning]` line and explain it to the user with
   `validation-rules.md`.
4. Never hand-edit the emitted JSON; the next run overwrites it. If the user edits it, tell
   them and offer to port the change into the source.

If the generator does not print diagnostics, add the four-line loop above before the write.
`toSchema()` does not emit `$schema`; spread it back in exactly as shown, so editors and the
VS Code extension keep the file associated with `schema.json`.

## Ids and renames

Ids are derived from names with `snake_case` unless `id` is passed. Because ids are the JSON
keys and the ref segments, renaming an element by changing its name silently changes its id
and breaks anything outside the source that points at it (documentation links, bookmarks,
other files). When renaming, pass the old id explicitly:

```ts
// was: catalogBC.addAggregate("Pet", {...})
catalogBC.addAggregate("Listed Pet", { id: "pet", description: "..." });
```

## Conventions from the example

- Name the variables after the element and its kind (`petAgg`, `petRoot`, `categoryVO`,
  `petApp`), so refs read naturally in the code.
- Prefix a variable with `_` when the element is kept only for its side effect on the model
  (an operation nobody references again).
- Create all consumables before the policies and consumptions that point at them.
- Full DSL surface: `dsl-api.md`. Patterns worth copying: `examples/petstore.md`.
