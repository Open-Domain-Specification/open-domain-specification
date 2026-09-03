---
column: done
labels: [ddd, docs]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-09-03T13:20:00.000Z
---
# Reference domain models: a balanced canonical example plus fake-org stress tests

The petstore workspace is the canonical reference. Rework it to balance completeness and demonstration: every feature of the model appears at least once (domains and classified subdomains, contexts with relationships of every type and roles, teams, aggregates with root, entities, value objects, attributes with identity, relations with cardinality, invariants, events and operations with schemas and patterns, consumptions with protection, services of both kinds, policies, glossary terms), but nothing is repeated just for bulk, and descriptions explain why a choice was made rather than listing everything. Then add separate workspaces for fake versions of real complex organisations, such as an online retailer like Amazon, a streaming service like Netflix, and one more of a different shape (a bank or an airline), each large enough to stress the pages, the diagrams and the validation: many contexts, cross-context consumption, a big ball of mud, shared kernels, deep aggregates, and a few deliberate structural problems so diagnostics have something to show. All authored with the TypeScript DSL in `packages/ods-example-ws/src`, generated into `.ods/*.json`, validated in the package tests, and picked up by the viewer, the export and Storybook fixtures.

## Checklist

- [x] Petstore reworked as the demonstration reference, with a short guide comment per file explaining what the section shows
- [x] Fake online retailer workspace (marketplace, fulfilment, payments, ads, logistics, customer service)
- [x] Fake streaming service workspace (catalogue, playback, recommendations, billing, studios, devices)
- [x] Third workspace of a different shape (bank or airline)
- [x] A BRIEF.md per company (who they are, what they do, what makes them unique, where the challenges are, how teams are organised)
- [x] A DISCOVERY.md per company recording the contractor-style process: interview summaries by role, event-storming capture, language collisions, classification reasoning, context map reasoning, what was left out; the model traceable to it
- [x] Every workspace generates, validates and renders every page in the e2e and unit fixtures
- [x] Docs page updated to introduce the reference models

## Gates

- [x] clean-code-swept — reviewer sweep of the four DSL models, generator and tests; the one finding (money value-object builder copied in three files) fixed with a shared helper; 37 example tests, 241 pages tests green (claude, 2026-09-03T00:00:00.000Z)
- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T21:40:00.000Z): Raised from the session request for fake Amazon, fake Netflix and similar. Delegated authoring to a subagent; the pages fixtures gain a second workspace for the picker and stress tests once the models exist.
- **claude** (2026-09-03T00:00:00.000Z): Delivered by a Fable subagent with a discovery-first process. Four workspaces under packages/ods-example-ws/src: petstore reworked as the demonstration (packages/ods-example-ws/src/petstore/workspace.ts:1-853, validates clean, every feature once), and RiverMart, StreamLine and NorthBank (workspace.ts of 2026, 1683 and 2208 lines). Each organisation has a BRIEF.md and a DISCOVERY.md with role-voiced interview summaries, event storming, language collisions, classification and context-map reasoning, and the deliberate validation findings; workspace comments of the form "DISCOVERY: <role>" trace elements back. The nine deliberate diagnostics cover every rule in the catalogue and are asserted by id in packages/ods-example-ws/src/workspace.test.ts. packages/ods-example-ws/src/index.ts loops the four into .ods/<id>.json and docs/<id>/. The shared Money builder is packages/ods-example-ws/src/dsl-helpers.ts:1-17. The pages fixtures include the three organisations and packages/pages/src/lib/Page.test.ts:30-50 renders every page of all four. README at packages/ods-example-ws/README.md:1-25 and a Reference models section in apps/docs/docs/3-core/index.md. Note for follow-up: packages/skill/skill/examples/petstore.md quotes excerpts of the old petstore shape; the skill tests still pass, but the excerpts deserve a refresh.
- **claude** (2026-09-03T00:40:00.000Z): Peer review round. Updated the AGY CLI (1.1.22 to 1.1.24) and ran Gemini 3.8 Flash (high) in read-only plan mode over each organisation's brief, discovery record and model as a sceptical DDD peer. A Fable subagent is triaging the four reviews, applying the accepted findings and recording the round as section 9 of each DISCOVERY.md.
- **claude** (2026-09-03T02:00:00.000Z): Peer review round closed. Gemini 3.8 Flash raised 90 findings across the four organisations; a Fable subagent accepted 35, partially accepted 21 and rejected 34 with reasons, each recorded in section 9 of the matching DISCOVERY.md. Headline changes: petstore's orphaned pending status now has a lifecycle through Catalog open-host operations driven by Sales policies and its cross-context invariant was corrected (packages/ods-example-ws/src/petstore/workspace.ts); RiverMart cancellation now reaches the warehouse and ads charge per click; StreamLine's billing contradiction was resolved at the narrative and inert consumptions wired; NorthBank gained authorisation holds and a real shared kernel through a LedgerAccount value object. All DELIBERATE problems untouched; petstore still validates clean; 37 example tests and every page of all four workspaces render.
