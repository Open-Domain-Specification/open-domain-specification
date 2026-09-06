---
column: done
labels: [backend, bug]
priority: medium
agent: senior-dev
live: false
clean-code-swept: true
updatedAt: 2026-09-09T04:05:00.000Z
---
# `invariant-in-context` refuses a value nobody in the context holds, as its comment says

Card 95 fixed `invariant-in-aggregate` to ask only whether a value object is held inside the boundary. `invariant-in-context` still short-circuits on the value object's own context before the held check, so a context invariant constraining its own value object that no entity or attribute in the context holds validates clean while the rule's comment says it is refused (card 89). Same fix, same test shape, in the other rule.

## Checklist

- [x] `invariant-in-context` asks whether the value object is held anywhere in the context, own or borrowed, and refuses one that is not; comment and catalogue text match; tests for held-own, held-borrowed, unheld-own
- [x] The four models re-read for any context invariant that relied on the gap
- [x] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Gates

- [x] clean-code-swept — swept the diff against the eight principles; nothing above 0.5. The change is one branch: the value-object question is asked first and alone, the declaring-context question only for everything else, which is the shape `invariant-in-aggregate` already has, so the two rules now read the same way down the same page. `contextOf` is still called on every target because the message needs it; the two `where` arms are unchanged. In the test file the borrowing fixture that one test built inline is now a `contextBorrowing()` helper and an `inContext(ws)` reader, both mirroring the `borrowed()`/`inAggregate()` pair in the sibling describe, so the three cases state their own difference and nothing else (senior-dev, 2026-09-09T04:00:00Z)
- [x] verify-all — `bash scripts/verify-all.sh` exit 0: core 540, graphviz 27, doc 31, skill 26, northbank 3, petstore 20, rivermart 3, streamline 3, models/_shared 9, pages 753, apps/docs 23, apps/ods-vscode 15, pages e2e passed, petstore schema matches core dist (senior-dev, 2026-09-09T04:02:00Z)

## Comments

- **lead** (2026-09-09T03:10:00.000Z): the senior developer, now; `fix`. Small and precise.
- **senior-dev** (2026-09-09T03:20:00.000Z): Picked it up; worktree reset to origin/develop at 3b6c679 ("card 96 logged and dispatched"), installed. Reproduced the gap before touching it: a Billing context declaring its own `Discount` that no entity and no value in the context holds, with a context invariant constraining it, validated clean. `invariantInContext` read `contextOf(target) === bc` first, and a value object's context is whichever context declared it, so every value the context owns answered "inside the boundary" before anyone asked whether anything held one — exactly the short-circuit card 95 took out of `invariant-in-aggregate`. The test I wrote for it fails against the old rule (`git stash` on `validate.ts`, one failure, that one) and passes against the new.
- **senior-dev** (2026-09-09T03:35:00.000Z): The fix, in the sibling's shape. A value object is asked one question and no other — does anything in this context hold one, own or borrowed — and only a target that is not a value object is judged by the context it belongs to. `valueObjectsHeldIn` already walks the context's aggregates' entities and follows the values those values hold, so nothing new was needed to answer it; the `where` arms and the message are untouched, so a refused own value reports `a value object of bounded context "Billing" that nothing in "Billing" holds`, the same sentence the aggregate rule prints. Three tests as the card asked: held-borrowed (the existing one, now on a shared fixture), held-own (Invoice holds a `Discount`, the invariant counts its `percent`, clean), unheld-own (nothing holds the `Discount`, refused). The rule's comment now says the held question is the only one asked of any value object and records what it accepted until this card, the way the aggregate rule's does. Catalogue `summary`, `why` and `fix` say the same in the same words, and `packages/skill/skill/references/validation-rules.md` and `apps/docs/docs/3-core/4-validation.md` carry the same text.
- **senior-dev** (2026-09-09T03:50:00.000Z): The four models re-read, by running the rule over them rather than by eye: not one context invariant in NorthBank, Petstore, RiverMart or StreamLine constrains a value object at all, so nothing relied on the gap and no model gains or loses a diagnostic. Diagnostics unchanged, one for one, every one a DELIBERATE. `Swagger Petstore (v3): 0`. `RiverMart: 2` — `[error] aggregate-root` on Wishlist's two roots, `[error] cross-aggregate-reference` on Cart including WishlistItem. `StreamLine: 3` — `[error] internal-consumable` on RecommendationsAPI consuming Playback's internal `BookmarkUpdated`, `[error] schema-context` on `PlaybackStarted` carrying Catalogue's `TitleRef`, `[warning] policy-complete` on "Recertify on SDK release". `NorthBank: 4` — `[warning] relationship-declared` and `[error] separate-ways` on Branch & Contact Centre consuming Credit Decisioning's `Decide`, `[error] consumable-kind` on "Escalate arrears" issuing an event, `[warning] context-serves-subdomain` on Identity & Access.
- **senior-dev** (2026-09-09T04:05:00.000Z): `bash scripts/verify-all.sh` green end to end, exit 0. Summary: core 540 tests passed (538 before, plus the two new cases), graphviz 27, doc 31, skill 26, northbank 3, schema comparison (petstore vs core dist) match, petstore 20, rivermart 3, streamline 3, models/_shared 9, pages 753, apps/docs 23, apps/ods-vscode 15, pages e2e (full suite) 296 passed. `npx tsc --noEmit -p packages/core` clean; biome clean on all four files touched. Ready for your review; nothing pushed.
