---
column: doing
labels: [backend, ddd]
priority: high
agent: developer
live: true
updatedAt: 2026-09-29T15:10:00.000Z
---
# Every validator rule has the smallest model that trips it and the nearest model that must stay clean, starting with the boundary, caller and answer-routing rules

Issue #57, a child of epic #60. Every rule has a fixture that trips it, pinned by the catalogue test, and sixteen review rounds probed the rules from outside; what is missing is the deliberate near-miss for each rule, the model that comes close and must stay clean, so that a change that widens or narrows a rule fails a test rather than a review round. The epic's acceptance is that every validator rule has its specified trigger and nearest-valid case, with reference-model diagnostics preserved or changed only with an explicit semantic justification.

This card is delivered in slices, one rule family at a time. Slice 1 is the boundary and borrowing family and the callers and answer-routing family, the rules the recent cards (126 to 135) changed. Slice 1 is progress, not completion of #57: the issue stays open until the checklist below is all checked.

How a pair is written: `packages/core/src/rule-cases.<family>.test.ts` holds one builder per pair, taking `hostile`. The hostile model trips the rule and the test pins every rule it trips, so the fixture is known to be the smallest that does; the near-miss differs by the one thing the rule is about and must validate with no diagnostic at all. `packages/core/src/rule-cases.families.ts` maps every catalogue rule to its family and status, and `rule-cases.test.ts` fails when the catalogue and the map disagree, so no rule is dropped silently.

## Coverage

Slice 1 borderline calls. `role-coherence` is in callers and answer routing because what it asks depends on who calls whom across the boundary (decisions 21 and 28). `reaction-cycle` is there because re-entry while alive walks the same answer routing (decision 23). `consumable-kind` is there because its answer clause is routing itself. `identifies-entity` is in boundary and borrowing because its recent changes are boundary-only and external identity targets (decisions 14 and 28). The process and policy rules that only say where a reactor lives (`process-in-context`, `policy-in-context`, `process-starts`) are left to their own family, so the slice stays what was changed.

- boundary-and-borrowing: 13 of 13 covered
- callers-and-answer-routing: 10 of 10 covered
- file-and-loading: 0 of 3 covered
- aggregates-and-identity: 0 of 9 covered
- value-objects-and-specialisation: 0 of 6 covered
- invariants: 0 of 6 covered
- relationships-and-roles: 9 of 9 covered
- processes-and-policies: 0 of 5 covered
- events-and-raising: 0 of 5 covered
- documentation-and-strategy: 0 of 4 covered

| Rule | Family | Trigger test | Nearest-valid test | Existing pair, for reference | Status |
| --- | --- | --- | --- | --- | --- |
| `cross-context-relation` | boundary-and-borrowing | `rule-cases.boundary`: an entity references a root of another context (vs holds its identity); a value object borrowed with no route (vs a conformist) | `rule-cases.boundary`: the same two models, near-miss side | `validate.test.ts` "a relation to a value object of another context" | covered |
| `identifies-entity` | boundary-and-borrowing | `rule-cases.boundary`: identity of an ordinary context / of its schema | `rule-cases.boundary`: the same context marked boundaryOnly | `validate.test.ts` boundary-only-is-boundary, external-is-boundary blocks | covered |
| `specialisation-in-boundary` | boundary-and-borrowing | `rule-cases.boundary`: VO kind of another context's VO; entity kind of an entity of another aggregate | `rule-cases.boundary`: the VO across a shared kernel that holds Money; the entity in its own aggregate | `validate.test.ts` "specialisation" | covered |
| `valueobject-context` | boundary-and-borrowing | `rule-cases.boundary`: Total typed by another context's Money with no route; with a partnership only | `rule-cases.boundary`: conformist, customer-supplier customer, shared kernel | `validate.test.ts` "valueobject-context" | covered |
| `schema-context` | boundary-and-borrowing | `rule-cases.boundary`: an internal operation carries Up's schema, no route | `rule-cases.boundary`: the same with Down a conformist of Up | `validate.test.ts` "valueobject-context" neighbours, `rule-catalog.test.ts` | covered |
| `separate-ways` | boundary-and-borrowing | `rule-cases.boundary`: a consumption across a declared separate ways | `rule-cases.boundary`: separate ways declared, nothing exchanged | `validate.test.ts` "separate-ways and policies", "...what a context holds of another's" | covered |
| `internal-consumable` | boundary-and-borrowing | `rule-cases.boundary`: Down consumes Up's internal operation | `rule-cases.boundary`: the same operation offered with open-host-service | `rule-catalog.test.ts` | covered |
| `aggregate-not-public` | boundary-and-borrowing | `rule-cases.boundary`: Down consumes an aggregate's operation of Up | `rule-cases.boundary`: Up and Down share a kernel | `validate.test.ts` "aggregate-not-public and domain-service-internal" | covered |
| `aggregate-consumes-inside` | boundary-and-borrowing | `rule-cases.boundary`: an aggregate consumes Up's operation; consumes a sibling aggregate's | `rule-cases.boundary`: an application service makes the call (`by`) | `validate.test.ts` "aggregate-consumes-inside" | covered |
| `domain-service-consumes-inside` | boundary-and-borrowing | `rule-cases.boundary`: a domain service consumes Up's operation | `rule-cases.boundary`: the application service makes the call | `validate.test.ts` "domain-service-consumes-inside" | covered |
| `domain-service-internal` | boundary-and-borrowing | `rule-cases.boundary`: Down calls a domain service's operation | `rule-cases.boundary`: the same service typed application | `validate.test.ts` "aggregate-not-public and domain-service-internal" | covered |
| `external-is-boundary` | boundary-and-borrowing | `rule-cases.boundary`: an external context declares an aggregate; is also a big ball of mud | `rule-cases.boundary`: it publishes a schema instead; external alone | `validate.test.ts` "external-is-boundary" (many) | covered |
| `boundary-only-is-boundary` | boundary-and-borrowing | `rule-cases.boundary`: a boundary-only context declares an aggregate; is also a big ball of mud | `rule-cases.boundary`: it publishes a schema instead; boundaryOnly alone | `validate.test.ts` "boundary-only-is-boundary" | covered |
| `consumption-once` | callers-and-answer-routing | `rule-cases.boundary`: two consumptions of one operation both naming `Act` | `rule-cases.boundary`: the second names another caller | `validate.test.ts` "consumption-once" | covered |
| `consumption-by-resolves` | callers-and-answer-routing | `rule-cases.boundary`: `by` names Up's operation | `rule-cases.boundary`: `by` names Down's own operation | `rule-catalog.test.ts` | covered |
| `consumption-by-operation` | callers-and-answer-routing | `rule-cases.boundary`: `by` names the policy | `rule-cases.boundary`: `by` names the operation the policy issues | `validate.test.ts` "consumption-by-operation" (same shape) | covered |
| `consumption-by-reactor` | callers-and-answer-routing | `rule-cases.boundary`: `by` of an event consumption names an operation | `rule-cases.boundary`: `by` names the policy that reacts | `validate.test.ts` "consumption-by-reactor" (same shape) | covered |
| `consumption-by-required` | callers-and-answer-routing | `rule-cases.boundary`: two operations, no `by`; no operation at all | `rule-cases.boundary`: `by` names the caller; one operation added | `validate.test.ts` "consumption-by-required" | covered |
| `subscription-consumed` | callers-and-answer-routing | `rule-cases.boundary`: a policy on Up's event with no consumption | `rule-cases.boundary`: the consumption exists (`by` the policy) | `validate.test.ts` "subscription-consumed" | covered |
| `subscription-backed` | callers-and-answer-routing | `rule-cases.boundary`: a consumed event with no policy or process reacting | `rule-cases.boundary`: a policy reacts to it | `validate.test.ts` "subscription-backed" | covered |
| `consumable-kind` | callers-and-answer-routing | `rule-cases.boundary`: a process started by `Abandon` waits on the answer of a call `Submit` made; a policy reacts to an operation | `rule-cases.boundary`: the process starts on `Submit`; the policy reacts to events only | `validate.test.ts` "a process hears the answer of the call its start made", "waiting on an answer" | covered |
| `role-coherence` | callers-and-answer-routing | `rule-cases.boundary`: an ordinary consumer takes a fact without a downstream role; an operation with no upstream role | `rule-cases.boundary`: the consumer is boundaryOnly; the role declared | `validate.test.ts` "role-coherence and a consumer we do not model inside", "role-coherence and symmetric relationships" | covered |
| `reaction-cycle` | callers-and-answer-routing | `rule-cases.boundary`: a policy's operation raises the event it reacts to; a process starts on and issues one operation | `rule-cases.boundary`: the operation raises another event; the process also waits on the start | `validate.test.ts` "reaction-cycle", "...a ring closed by a process's own start" | covered |
| `ods-version` | file-and-loading | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `unresolved-ref` | file-and-loading | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `unknown-field` | file-and-loading | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `aggregate-root` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `cross-aggregate-reference` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `root-identity` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `entity-identity` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `identity-not-optional` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `aggregate-tree` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `specialisation-cycle` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `specialisation-not-root` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `specialisation-redeclares` | aggregates-and-identity | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `value-object-shape` | value-objects-and-specialisation | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `attribute-relation-coherence` | value-objects-and-specialisation | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `relation-for-resolves` | value-objects-and-specialisation | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `attribute-one-shape` | value-objects-and-specialisation | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `returns-on-operation` | value-objects-and-specialisation | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `rejects-on-operation` | value-objects-and-specialisation | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `invariant-in-value-object` | invariants | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `invariant-in-aggregate` | invariants | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `invariant-in-context` | invariants | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `context-invariant-is-checked` | invariants | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `precondition-names-operation` | invariants | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `postcondition-names-operation` | invariants | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `relationship-roles-backed` | relationships-and-roles | `rule-cases.relationships`: an upstream role (published-language) declared that nothing offered carries | `rule-cases.relationships`: only the role Ping carries | `validate.test.ts` "relationship-roles-backed", "...and published languages" | covered |
| `consumption-agreement` | relationships-and-roles | `rule-cases.relationships`: a consumption across two named agreements names none; names one that joins other contexts | `rule-cases.relationships`: it names the agreement that joins the pair | `validate.test.ts` "consumption-agreement" | covered |
| `relationship-declared` | relationships-and-roles | `rule-cases.relationships`: a call from Down to Up with no relationship | `rule-cases.relationships`: the relationship declared | `validate.test.ts` "relationship-declared" | covered |
| `relationship-duplicate` | relationships-and-roles | `rule-cases.relationships`: two unnamed upstream-downstream relationships, Up to Down | `rule-cases.relationships`: the two named | `validate.test.ts` "relationship-duplicate" | covered |
| `relationship-cycle` | relationships-and-roles | `rule-cases.relationships`: X and Y each call the other on conformist terms | `rule-cases.relationships`: one direction behind an anti-corruption layer | `validate.test.ts` "relationship-cycle" | covered |
| `partnership-backed` | relationships-and-roles | `rule-cases.relationships`: partners with nothing crossing | `rule-cases.relationships`: Down calls Up's operation | `validate.test.ts` "partnership-backed" | covered |
| `shared-kernel-backed` | relationships-and-roles | `rule-cases.relationships`: a shared kernel with nothing in it | `rule-cases.relationships`: Down calls Up's operation | `validate.test.ts` "shared-kernel-backed" | covered |
| `conformist-backed` | relationships-and-roles | `rule-cases.relationships`: a declared conformist that consumes nothing of its upstream | `rule-cases.relationships`: it consumes Up's operation | `validate.test.ts` "...conformist" tests in "role-coherence" blocks | covered |
| `mud-needs-acl` | relationships-and-roles | `rule-cases.relationships`: a consumption out of a big ball of mud as conformist | `rule-cases.relationships`: the same behind an anti-corruption layer | `validate.test.ts` "mud-needs-acl" | covered |
| `process-in-context` | processes-and-policies | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `process-has-ends` | processes-and-policies | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `process-starts` | processes-and-policies | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `policy-in-context` | processes-and-policies | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `policy-complete` | processes-and-policies | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `raises-in-context` | events-and-raising | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `raises-in-aggregate` | events-and-raising | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `raises-restated` | events-and-raising | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `rejection-raised` | events-and-raising | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `event-unraised` | events-and-raising | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `term-in-context` | documentation-and-strategy | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `context-serves-subdomain` | documentation-and-strategy | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `comments-required` | documentation-and-strategy | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |
| `disposition-needs-comment` | documentation-and-strategy | `rule-catalog.test.ts` fixture; per-rule tests in `validate.test.ts` not yet mapped | not yet written | | todo |

## Checklist

- [x] The rule-family map for all 70 catalogue rules, with a test that keeps it whole
- [x] Boundary and borrowing (13 rules): cross-context-relation, identifies-entity, specialisation-in-boundary, valueobject-context, schema-context, separate-ways, internal-consumable, aggregate-not-public, aggregate-consumes-inside, domain-service-consumes-inside, domain-service-internal, external-is-boundary, boundary-only-is-boundary
- [x] Callers and answer routing (10 rules): consumption-once, consumption-by-resolves, consumption-by-operation, consumption-by-reactor, consumption-by-required, subscription-consumed, subscription-backed, consumable-kind, role-coherence, reaction-cycle
- [ ] File and loading (3 rules)
- [ ] Aggregates and identity (9 rules)
- [ ] Value objects, attributes and relations (6 rules)
- [ ] Invariants and contracts (6 rules)
- [x] Relationships and roles (9 rules): relationship-roles-backed, consumption-agreement, relationship-declared, relationship-duplicate, relationship-cycle, partnership-backed, shared-kernel-backed, conformist-backed, mud-needs-acl
- [ ] Processes and policies (5 rules)
- [ ] Events and raising (5 rules)
- [ ] Documentation and strategy (4 rules)

## Gates

- [ ] `npx @biomejs/biome check` clean on every file touched
- [ ] `bash scripts/verify-all.sh` green end to end

## Comments

- **developer** (2026-09-29T14:30:00.000Z): Read the catalogue (70 rules), the check function of every slice-1 rule and the existing per-rule tests in `packages/core/src/validate.test.ts` before writing a case. Most slice-1 rules already had a trigger and a near-miss somewhere in that file, written as separate scenarios by the card that changed them; the new file states each pair as one builder with one difference, and asserts the exact set of rules the hostile model trips and an empty diagnostic list for the near-miss, which the older tests do not (they filter to the rule under test). The table names the older pair beside each rule.
- **developer** (2026-09-29T14:30:00.000Z): Thirty-four pairs across the 23 rules in slice 1 (69 tests with the coverage-bookkeeping test). Where a fixture cannot trip a rule without tripping a consequence of the same missing line, the consequence is named in `fires` rather than filtered: `partnership-backed` beside a partnership that lets nothing be borrowed, `relationship-declared` beside a value object borrowed with no relationship at all, the three role and conformist warnings beside a policy with no consumption, the duplicated `domain-service-internal` for the upstream role a domain service declares and for being called from outside. Where the near-miss needs a second line to stay wholly clean, it is stated at the line: a shared kernel is reported by `shared-kernel-backed` when nothing is in it, so the specialisation near-miss has Down hold Money.
- **developer** (2026-09-29T14:30:00.000Z): Mutation checks against `packages/core/src/validate.ts`, each reverted after the run. Widening `role-coherence` to ask a boundary-only consumer for a downstream role fails the role-coherence near-miss. Dropping the shared-kernel exemption from `aggregate-not-public` fails its near-miss. Removing `boundaryOnly` from the `identifies-entity` bounded-context exemption fails that near-miss. Making `consumption-by-operation` never fire fails its trigger. Dropping the single-operation exemption from `consumption-by-required` fails the no-operation near-miss and three fixtures that rely on one operation being its own answer.
- **developer** (2026-09-29T14:30:00.000Z): No validator defect found in slice 1: every near-miss validated clean and every trigger fired, without changing a rule, a test assertion or a reference model. Nothing under `models/` was touched. Not exercised in this slice, and named so the next one does not assume it was: the anti-corruption-layer carve-out of `schema-context` (a consumable carrying an upstream shape it translates), a process hearing an answer through a local `by` chain, the one-hop boundary stop, and external invariants that name a contract; the older tests in `validate.test.ts` hold those, and the table points at them.
- **developer** (2026-09-29T15:10:00.000Z): Slice 2, relationships and roles: 10 pairs in `packages/core/src/rule-cases.relationships.test.ts`, all nine rules. The building blocks and the harness moved out of the boundary file into `packages/core/src/rule-cases.support.ts` so every family file is written and run the same way; the boundary pairs are unchanged. Where a rule cannot be tripped without a consequence of the same absence, the consequence is named in `fires`: taking nothing from a conformist upstream also leaves the conformist role undeclared by any consumption (`relationship-roles-backed`); an exchange that names no agreement, or one that joins other contexts, backs neither agreement's roles. Mutation checks, each reverted: widening `partnership-backed` to shared kernels fails the shared-kernel pair; making `conformist-backed` ignore consumptions fails its near-miss and the relationship-cycle pairs, which lean on it; letting any downstream role clear `mud-needs-acl` fails its trigger. No defect found. None of the four behaviours the slice-1 journal names as held only by older tests belongs to this family, so none was added here.
