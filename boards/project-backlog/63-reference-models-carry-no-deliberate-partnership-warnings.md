---
column: done
labels: [models, tests]
priority: medium
agent: tester
live: false
clean-code-swept: true
updatedAt: 2026-09-05T12:10:00.000Z
---
# Reference models carry no deliberate partnership warnings

RiverMart and StreamLine each keep a `partnership-backed` warning in their `deliberate` arrays because the honest fix, demoting a one-way partnership to customer-supplier, would break the shared stress assertion that every model shows all five relationship types. A reference model that bends to a test is not a reference. The assertion changes and the models tell the truth.

**Ruling changed mid-card (see journal).** An architect review found the rule, not the models, to be the thing over-claiming: Evans's partnership is mutual dependence of two teams' success on one release train, and it does not require consumption in both directions. The one-way partnerships are truthful and stay. `partnership-backed` is being relaxed to "traffic in at least one direction" under decision 20's amendment; that core change is not this card's. The two `partnership-backed` entries stay in the `deliberate` arrays until it lands, and disappear with it.

## Checklist

- [x] `models/_shared/src/index.ts`: the five-types assertion becomes a check that the four models together show all five types (a shared test in `models/_shared` or the lead's choice), so no single model has to invent a relationship type
- [x] RiverMart and StreamLine: each one-way partnership becomes what its prose supports, a customer-supplier with the roles the traffic implies, or gains the traffic its description already claims; the `partnership-backed` entries leave the `deliberate` arrays; DISCOVERY.md section 7 updated — **superseded by the new ruling**: both partnerships kept and unchanged as model, their comments and DISCOVERY.md section 7 rewritten to say why they are true and that the rule is being relaxed; the `deliberate` entries stay until the core change lands
- [x] Every remaining `deliberate` entry across the four models re-read: each must be a planted teaching example with a sentence in DISCOVERY.md saying what it teaches, or it is fixed
- [x] All four models build with exactly their `deliberate` lists and pass; `.ods/` regenerated; pages fixture tests green

## Gates

- [x] qa-automated — core, graphviz and doc built; all four models `npm run build` printing exactly their `deliberate` lists and `npx vitest run` green (NorthBank 3, RiverMart 3, StreamLine 3, Petstore 18); `models/_shared` 9 tests green; pages `npm run build` and 668 tests over 94 files green; both new assertions shown to fail when the property breaks (tester, 2026-09-05T12:10:00.000Z)
- [x] clean-code-swept — sweep over the diff (SRP/KISS, DRY/dead, naming); one finding fixed, a third test in `relationship-types.test.ts` that asserted the union a second time with a better message, collapsed into a single `it.each` over the five types; no TODOs left; biome clean on all seven touched source files (tester, 2026-09-05T12:10:00.000Z)

## Journal

- **tester** (2026-09-05T12:10:00.000Z): Started on the card as written. Read decision 20's partnership ruling, the `partnership-backed` and `relationship-cycle` rules, and both models' prose. Both partnerships state plainly that traffic runs one way, so under decision 20 as it then stood the fix was demotion, and I made it: RiverMart's Search→Advertising to customer-supplier with open-host-service/conformist, StreamLine's Playback→Devices to customer-supplier with published-language/conformist. Both consumables and consumptions already carried matching patterns, so `role-coherence` and `relationship-roles-backed` stayed quiet and neither demotion created a call ring.
- **tester** (2026-09-05T12:10:00.000Z): Ruling changed by the lead mid-card, on an architect review: a partnership is mutual dependence of two teams' success and a joint release train, not a two-way consumption, so the two declarations are true and `partnership-backed` over-claims. Reverted both demotions with `git checkout` — the models are byte-identical to develop in everything the schema captures, which is why no `.ods/` or `docs/` output changed. Kept the partnerships and rewrote their DELIBERATE comments, their test docstrings and DISCOVERY.md section 7 to say the declaration is true, that the rule is being relaxed under decision 20's amendment, and that the entry stays only because these lists state what `validate()` prints today.
- **tester** (2026-09-05T12:10:00.000Z): The five-types assertion in `assertStressTestWorkspace` is now a floor of three types per model, with the message naming the model and the types it does show. Coverage of all five moved to `models/_shared/src/relationship-types.test.ts`, which imports the four workspaces by relative path — not by package name, because the model packages depend on `_shared` and naming them in its `dependencies` would make the workspace graph a cycle with no build order. Added a `test` script to `models/_shared/package.json`; it had none.
- **tester** (2026-09-05T12:10:00.000Z): Re-read all ten `deliberate` entries. NorthBank's three and StreamLine's other three each have a DELIBERATE comment and a sentence in DISCOVERY.md section 7 that says what they teach; Petstore validates clean and says so. Two stale claims found and fixed: RiverMart's DISCOVERY.md section 7 promised "four diagnostics" and still described a `role-coherence` finding retired on card 47, and both models' file-header comments listed the wrong deliberate rules (RiverMart named `role-coherence`, StreamLine said three where there are four).
- **tester** (2026-09-05T12:10:00.000Z): Both new assertions proved to bite before being trusted — a bogus sixth relationship type fails the union test naming it, and raising the per-model floor fails with `RiverMart shows only 5 relationship type(s): ...`. No assertion was weakened to make anything pass.

## Comments

- **lead** (2026-09-07T09:00:00.000Z): the tester; no core change. Runs in parallel with card 58, which touches attributes in the same model files; keep your edits to relationships and DISCOVERY.md so the merge stays clean.
- **lead** (2026-09-05T11:55:00.000Z): Ruling change: `partnership-backed`'s spec becomes "traffic in at least one direction". Do not demote the one-way partnerships; keep them, leave their `deliberate` entries with a comment saying the rule is being relaxed, and note that those two entries disappear when the core change lands.
- **tester** (2026-09-05T12:10:00.000Z): Done and ready for review. Nothing the schema captures changed, so no `.ods/` or `docs/` regeneration was needed and the diff is confined to comments, docstrings, DISCOVERY.md prose, the `_shared` assertion and one new test file — it should not collide with card 58's attribute work. **Follow-up for the lead:** when the `partnership-backed` relaxation lands, the `deliberate` arrays in `models/rivermart/src/workspace.test.ts` and `models/streamline/src/workspace.test.ts` each drop their `partnership-backed` entry, the two DELIBERATE comments and both DISCOVERY.md section 7 bullets come out, and the two file-header comments go back to "two deliberate findings" and "three deliberate findings". That is a card, not a leftover; I have not written it, as cards are yours.
