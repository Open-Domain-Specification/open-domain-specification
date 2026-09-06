---
column: done
labels: [backend]
priority: medium
agent: developer-lite
live: false
clean-code-swept: true
updatedAt: 2026-09-06T14:10:00.000Z
---
# An unknown field is a diagnostic

The loader drops a field the schema does not know and says nothing: a JSON file with `provides` on a value object, or `modules` or `actors` anywhere, loads clean and loses the field on round trip. Decision 29 says a mistake is a diagnostic. The JSON schema already has `additionalProperties: false`; the loader should report what it dropped.

## Checklist

- [x] The loader reports `unknown-field` (warning) for every field it does not know, with the path and the field name, and still loads the rest; the round trip drops it as now
- [x] Rule catalogue entry with summary, why and fix ("the model has no such element; see what it has instead"); `apps/docs/docs/3-core/4-validation.md` row; tests for a value object with `provides`, a context with `modules`, a workspace with `actors`
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] tests-passing — `bash scripts/verify-all.sh` green end to end: core 714, graphviz 28, doc 31, skill 26, northbank 3, petstore 22 (+schema match), rivermart 6, streamline 3, models/_shared 9, esm builds ok, pages 764, apps/docs 23, apps/ods-vscode 15, pages e2e 297/297 (developer-lite, 2026-09-06T14:08:00.000Z)

## Comments

- **developer-lite** (2026-09-06T14:10:00.000Z): Added `Workspace.unknownFields`/`UnknownField` in `packages/core/src/workspace.ts:92-142` (doc'd like `UnresolvedReference`/card 100's mechanism), a `KNOWN_FIELDS` per-kind field-name table plus `checkUnknownFields` helper in `packages/core/src/workspace-from-schema.ts:86-224`, and wired it into every element the loader constructs from raw JSON (workspace, domain, subdomain, team, bounded context, aggregate, service, entity, value object, process, deadline, policy, glossary term, data schema, invariant, consumable, consumption, attribute) at `packages/core/src/workspace-from-schema.ts:387-1074` and `:1279-1300`. Added the `unknown-field` warning rule to the catalogue in `packages/core/src/validate.ts:4515-4539` and `:4629-4636`, and a table row in `apps/docs/docs/3-core/4-validation.md:15`. Tests: `packages/core/src/workspace-from-schema.test.ts` new `describe("a file that writes a field this metamodel does not know")` block covers a value object with `provides`, a bounded context with `modules`, a workspace with `actors`, and the round-trip drop; `packages/core/src/rule-catalog.test.ts:397` adds `actors` to the mistyped fixture so `unknown-field` is pinned in the catalogue-completeness test. `bash scripts/verify-all.sh` green end to end (see Gates); confirmed the pre-existing `packages/skill` dist-missing gap on a clean `develop` checkout (via `git stash`) before ruling it out of scope for this card.
- Out of scope, left alone: nested list items with no stable id of their own — relations (`EntityRelationSchema`), rejections' `reasons`, `comments`, and context relationships (`ContextRelationshipSchema`) — are not checked for unknown fields; the mechanism only covers the element kinds the loader keys by id. Card 116 (also touching core) was left untouched per the dispatch note: no edits to reaction-walk.ts or existing `validate.ts` rule bodies, only the new catalogue entry.
