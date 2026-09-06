---
column: todo
labels: [docs]
priority: high
agent: developer
live: true
updatedAt: 2026-09-11T03:20:00.000Z
---
# The generator and the playbook say what the validator does; three more costs on the list

The architect's fourteenth round found two hand-written sentences that contradict the validator and slipped past card 129's drift test: `packages/skill/scripts/generate.mts` writes "A ref that points at nothing makes the whole file fail to load" into the generated model reference, the opposite of decision 29; and the interview playbook says an invariant's guard is "only an operation of the same aggregate", which decision 19 widened to any service of the context, and fourteen lines later tells the author to name the front that fetched the fact. Five rows of the validation table lag their rules (`shared-kernel-backed` omits operations, `consumption-by-resolves` omits processes, `aggregate-root`, `root-identity` and `context-serves-subdomain` omit their exemptions) and the docs index still says four model packages. Three costs to add to the leaves-out list and `preferences.md`: roles are restated on every crossing exchange and again on the relationship (decision 03); partners share a shape only through a shared kernel declared beside the partnership (decision 16); there is no extension field, an unknown key is a diagnostic and is dropped on save, and comments live on four seams only (decision 15). Runs in parallel with card 130, which touches the validator; the validation table rows for 130's rules are 130's.

## Checklist

- [ ] `generate.mts`'s sentence says a dangling ref is an `unresolved-ref` diagnostic and the rest of the file loads; the playbook's guard sentence says any service of the context may guard, and the two passages agree; the drift test in `packages/skill` reads the generated reference and the playbook for these sentences too
- [ ] The five validation table rows say what the rules do now; the docs index says five model packages and names the clinic
- [ ] The three costs added to the docs' leaves-out list and to `preferences.md`, with their decisions
- [ ] `bash scripts/verify-all.sh` green

## Comments
