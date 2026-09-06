---
column: todo
labels: [backend]
priority: high
agent: developer
live: true
updatedAt: 2026-09-10T15:40:00.000Z
---
# The ESM build of core loads

`packages/core/dist/index.mjs` fails to import under Node 24: "The requested module 'debug' does not provide an export named 'debug'" (`dist/index.mjs:485`). The CommonJS build is fine, which is why every test and every consumer in this repository passes. Any ESM consumer of the published package hits it on first import. Found by the architect's tenth round in passing.

## Checklist

- [ ] The import of `debug` in core uses the package's default export (or an equivalent that both builds resolve); the ESM build imports and runs under `node --input-type=module -e "import('@open-domain-specification/core')"` or the equivalent path import
- [ ] A test or a gate step imports `dist/index.mjs` under Node so the regression cannot return; the same check for any other published package with an ESM build
- [ ] `bash scripts/verify-all.sh` green

## Comments
