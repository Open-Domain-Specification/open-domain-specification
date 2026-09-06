---
column: done
labels: [backend, bug]
priority: high
agent: senior-dev
live: false
clean-code-swept: true
updatedAt: 2026-09-08T09:10:00.000Z
---
# The scoped context map keeps a declared relationship only where it would otherwise imply an edge

Card 78 made `ODSContextMap.fromScope` keep a declared relationship whenever the consumption and identity walks reach both its ends. That is wider than the bug it fixed: a relationship between two neighbours of the scoped context that exchange nothing the walk draws, Catalog and Inventory's shared kernel on the Sales context map, now appears too, and because that kernel is marked for refactoring the Sales map gained a warning badge. The pages e2e `diagrams-context.spec.ts` caught it on develop. The right rule: keep a declared relationship involving an in-scope context as before, and keep one between two reached contexts only when the walk found a crossing between them, a consumption or an identity, so that the declared edge replaces the implied edge it would otherwise have drawn and nothing else is added.

## Checklist

- [x] `fromScope` keeps an out-of-scope pair's relationship only when a consumption or identity crossing exists between those two contexts in the walk; the petstore Fulfilment subdomain test from card 78 still passes (Catalog to Sales declared, not implied); a new core test shows the Sales context map without the Catalog and Inventory shared kernel
- [x] `npx playwright test e2e/diagrams-context.spec.ts` green inside `packages/pages` after `npm run build` in core and pages
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — the change swaps one private helper for another of the same shape: `ODSContextMap.reached`, which returned the set of contexts on the map, becomes `ODSContextMap.crossedPairs`, which returns the set of `pairKey`s the walk crossed, built from the same two loops (consumptions, `identityCrossings`) and keyed by the `pairKey` the constructor already uses for `declared`. `fromScope`'s predicate stays one line per clause with the reason in the comment above it; no new export, no new type, nothing else in the file touched. Biome check clean on both files touched, run file by file, never `--write` on a directory (senior-dev, 2026-09-08T09:10:00.000Z)

## Comments

- **lead** (2026-09-08T08:20:00.000Z): the senior developer, now; `fix`. Develop's e2e job is red on this until it lands.

- **senior-dev** (2026-09-08T09:10:00.000Z): Done on `agent-a3153df6e9134f15f`, off `develop` at `d425b7b` (card 87 dispatched).

  **The rule.** `ODSContextMap.fromScope` (`packages/core/src/context-map.ts`) no longer asks whether both ends of a declared relationship are *on* the map. It asks whether the walk found a crossing *between* those two ends: a consumption from one to the other, or an identity in one naming the other's entity. `crossedPairs` collects exactly the pairs the constructor's own two loops would draw as implied — same `pairKey`, same self-pair skip, same `identityCrossings(contexts)` — so the kept declaration always replaces an implied edge and never adds one. A relationship touching an in-scope context is kept as before, unchanged.

  That is the difference the card asked for. On the Sales context map, Catalog and Inventory are both reached (Sales consumes from Catalog; Inventory's projection consumes Sales' order events) but nothing crosses between *them*, so their `shared-kernel` — which carries `disposition: refactor` and so painted a warning badge — is a piece of a neighbouring map and is now left off. On the Fulfilment subdomain map the walk does cross Catalog to Sales, so card 78's declared `customer-supplier` edge is kept, still `implied: false`.

  **Reproduced before fixing.** The new petstore test failed against the unfixed core build with the shared-kernel edge present (`toEqual([])` got a one-element array), and passes against the fixed one. I reverted `context-map.ts`, rebuilt `packages/core`, ran the test to watch it fail, then restored and rebuilt.

  **Tests.** `models/petstore/src/workspace.test.ts` gains "leaves out a declared relationship between two contexts it only reaches": `ODSContextMap.fromBoundedContext(sales_bc)` has nodes for both `catalog_bc` and `inventory_bc` and no edge between them. It sits next to card 78's Fulfilment test, which still passes untouched — the two are the pair the rule has to satisfy at once. Petstore is now 20 tests.

  **`npx playwright test e2e/diagrams-context.spec.ts` inside `packages/pages`, after `npm run build` in core and pages:**

  ```
  Running 4 tests using 1 worker
    ✓  1 the interactive context map draws context nodes with stereotypes and roles (529ms)
    ✓  2 a marked badge on the Sales context map opens the relationship detail in place (376ms)
    ✓  3 the shared kernel the model wants refactored is marked on the workspace map (299ms)
    ✓  4 every badge that discloses evidence takes the pointer where it is drawn (198ms)
    4 passed (6.7s)
  ```

  Test 2 is the one develop was red on: the Sales map's legend now names "outlined badge" and not "warning badge", because the only warning on it was the kernel that no longer belongs there. Test 3 confirms the kernel is still marked on the *workspace* map, where it does belong — the fix narrows the scoped map without hiding anything from the map that owns it.

  **`bash scripts/verify-all.sh` from the worktree root, green end to end (exit 0):**

  ```
  === verify-all summary ===
  core: 433 tests passed
  graphviz: 25 tests passed
  doc: 31 tests passed
  skill: 26 tests passed
  northbank: 3 tests passed
  schema comparison (petstore vs core dist): match
  petstore: 20 tests passed
  rivermart: 3 tests passed
  streamline: 3 tests passed
  models/_shared: 9 tests passed
  pages: 745 tests passed
  apps/docs: 23 tests passed
  apps/ods-vscode: 13 tests passed
  pages e2e (diagram-panel-fit): passed
  ```

  `npx tsc --noEmit` clean in `packages/core`. No model's diagnostics move: the rule only decides which declared relationships a *scoped map* draws, and validation walks the workspace, not the map.
