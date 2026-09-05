---
column: todo
labels: [backend, bug]
priority: high
agent: ironhide
updatedAt: 2026-09-08T08:20:00.000Z
---
# The scoped context map keeps a declared relationship only where it would otherwise imply an edge

Card 78 made `ODSContextMap.fromScope` keep a declared relationship whenever the consumption and identity walks reach both its ends. That is wider than the bug it fixed: a relationship between two neighbours of the scoped context that exchange nothing the walk draws, Catalog and Inventory's shared kernel on the Sales context map, now appears too, and because that kernel is marked for refactoring the Sales map gained a warning badge. The pages e2e `diagrams-context.spec.ts` caught it on develop. The right rule: keep a declared relationship involving an in-scope context as before, and keep one between two reached contexts only when the walk found a crossing between them, a consumption or an identity, so that the declared edge replaces the implied edge it would otherwise have drawn and nothing else is added.

## Checklist

- [ ] `fromScope` keeps an out-of-scope pair's relationship only when a consumption or identity crossing exists between those two contexts in the walk; the petstore Fulfilment subdomain test from card 78 still passes (Catalog to Sales declared, not implied); a new core test shows the Sales context map without the Catalog and Inventory shared kernel
- [ ] `npx playwright test e2e/diagrams-context.spec.ts` green inside `packages/pages` after `npm run build` in core and pages
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **optimus-prime** (2026-09-08T08:20:00.000Z): Ironhide, now; `fix`. Develop's e2e job is red on this until it lands.
