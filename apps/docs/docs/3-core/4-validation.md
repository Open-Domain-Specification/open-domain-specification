---
sidebar_position: 4
title: Validation
---

# Validation

`workspace.validate()` checks the structural rules that DDD lets us verify
without knowing the business, and returns a list of diagnostics with a
severity, a rule id, a message and the ref of the element concerned.

| Rule | Severity | Checks |
| --- | --- | --- |
| `aggregate-root` | error / warning | exactly one root entity per aggregate |
| `cross-aggregate-reference` | error | relations into another aggregate are `references` to its root |
| `cross-context-relation` | error | a relation never crosses a bounded context; the source holds the other root's identity instead |
| `role-coherence` | warning | consumables and consumptions crossing contexts declare their roles |
| `separate-ways` | error | contexts that declared separate ways do not exchange consumables |
| `internal-consumable` | error | an internal consumable is not consumed, reacted to or issued from another context |
| `returns-on-operation` | error | only an operation declares `returns`; an event has no caller to answer |
| `consumable-kind` | error | policies react to events and issue operations; only operations raise, and only events |
| `policy-complete` | warning | a policy reacts to at least one event and issues at least one operation |
| `context-serves-subdomain` | warning | every context serves a subdomain |

The UI reports the counts when a workspace is loaded and lists the
diagnostics on the home page; the generated docs include them on the
workspace page.

```ts file=../../tests/validation.example.test.ts
```
