---
column: todo
labels: [backend, dsl, breaking]
priority: low
agent: bumblebee
updatedAt: 2026-09-07T09:00:00.000Z
---
# The policy DSL's `then` becomes `issues`

`Policy.then(...)` in the DSL is the only thing biome flags in core (`noThenProperty`, twice): an object with a `then` method is treated as a thenable by every `await`, which is a real hazard, not a style point. The schema key `then` stays, because it reads well in JSON and is not a method; the DSL method is renamed.

## Checklist

- [ ] `Policy.then(...)` becomes `Policy.issues(...)` in `packages/core/src/workspace.ts`; `toSchema` still writes `then`; every caller in the four models, the core fixture, the docs app examples and the skill's DSL reference and examples moves
- [ ] The same for `Process`: `.then(...)` becomes `.issues(...)`, and the attribute form's option key is `issues` too (`bc.addProcess(name, { starts, on, issues, ends })`, `bc.addPolicy(name, { on, issues })`), mapped to the schema key `then` in `toSchema`/`fromSchema`; the four `biome-ignore noThenProperty` comments card 60 added come out
- [ ] biome clean on `packages/core` with no suppression; decision 23's DSL line and the skill's DSL reference say `issues`
- [ ] Root suites green inside each package in build order

## Comments

- **optimus-prime** (2026-09-07T09:00:00.000Z): Bumblebee, after card 62 lands (the lead will say); `feat!` for the DSL.
