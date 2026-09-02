# Reference Workspaces

Four Open Domain Specification workspaces authored with the TypeScript DSL and generated into
`.ods/*.json`, which the VS Code extension, the viewer and the static export open directly.

| Workspace | File | Purpose |
|---|---|---|
| Swagger Petstore (v3) | `.ods/petstore.json` | The canonical demonstration: every feature of the model once, with comments saying what each section shows. Validates clean. |
| RiverMart | `.ods/rivermart.json` | A fictional online marketplace in the shape of a large retailer. Stress test: many contexts, shared kernel, partnership, legacy big ball of mud, deep aggregates, three deliberate problems. |
| StreamLine | `.ods/streamline.json` | A fictional streaming service. Stress test with a licensing and encoding pipeline, playback, recommendations and billing. |
| NorthBank | `.ods/northbank.json` | A fictional retail bank, heavy on invariants and value objects (money, IBAN, consent). |

Each fictional organisation has a `BRIEF.md` (who they are, what they do, what makes them
different, where the challenges are, how teams are organised) and a `DISCOVERY.md` recording
the modelling engagement: interview summaries by role, event storming, language collisions,
classification and context-map reasoning, the validation findings kept on purpose, and what
the model leaves out. The workspace files point back to those records in comments.

```bash
npm run build   # regenerate .ods/*.json and docs/<workspace>/
npm test        # each workspace builds, validates as expected and round-trips
npm run serve   # docsify site for the petstore docs
```
