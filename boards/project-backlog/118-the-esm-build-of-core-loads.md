---
column: done
labels: [backend]
priority: high
agent: developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T00:00:00.000Z
---
# The ESM build of core loads

`packages/core/dist/index.mjs` fails to import under Node 24: "The requested module 'debug' does not provide an export named 'debug'" (`dist/index.mjs:485`). The CommonJS build is fine, which is why every test and every consumer in this repository passes. Any ESM consumer of the published package hits it on first import. Found by the architect's tenth round in passing.

## Checklist

- [x] The import of `debug` in core uses the package's default export (or an equivalent that both builds resolve); the ESM build imports and runs under `node --input-type=module -e "import('@open-domain-specification/core')"` or the equivalent path import
- [x] A test or a gate step imports `dist/index.mjs` under Node so the regression cannot return; the same check for any other published package with an ESM build
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — smallest fix (default import instead of named import of a CJS-only default export), no unrelated changes (developer, 2026-09-06T00:00:00.000Z)

## Comments

- **developer** (2026-09-06T00:00:00.000Z): Root cause: `debug` is a CommonJS module whose default export carries a self-referencing `debug` property (used for CJS interop convenience only); Node's real ESM loader does not treat that as a named export, so `import { debug as _debug } from "debug"` throws at import time even though it type-checks and bundles fine. Confirmed with `node --input-type=module -e "import { debug } from 'debug'"` → `SyntaxError: Named export 'debug' not found`.
- **developer** (2026-09-06T00:00:00.000Z): Fixed the only two runtime occurrences: `packages/core/src/debug.ts:1` and `packages/graphviz/src/debug.ts:1`, switching to `import _debug, { type Debugger } from "debug"`. `packages/core/src/workspace.ts:1` only imports the `Debugger` type, which is erased at build and needed no change. Rebuilt core and graphviz; `node --input-type=module -e "import('.../packages/core/dist/index.mjs')"` and the graphviz equivalent now both resolve (CJS builds unaffected, still resolve).
- **developer** (2026-09-06T00:00:00.000Z): Audited every other published package with an ESM build (`doc`, `skill`, `pages` — both its `dist/index.mjs` and `dist/site.mjs`) for the same class of bug; none import `debug` or any other CJS-default-only dependency by name, and each `.mjs` entry imports cleanly under Node.
- **developer** (2026-09-06T00:00:00.000Z): Added `scripts/verify-esm-builds.mjs`, which dynamically `import()`s each published package's built ESM entry (`core`, `graphviz`, `doc`, `skill`, `pages/index`, `pages/site`) under a real Node ESM loader — the only way to actually catch a named-import-of-CJS-default regression, since it type-checks and bundles fine. Wired it into `scripts/verify-all.sh:97-103`, right after the `pages` build (the point at which every package's dist is present), so it always runs as part of the landing checklist.
- **developer** (2026-09-06T00:00:00.000Z): `bash scripts/verify-all.sh` green end to end — new gate line reports `esm builds (core, graphviz, doc, skill, pages): import ok`, all package/vitest suites and the pages e2e/Storybook fit spec still pass (see Gates). Moving to review.
