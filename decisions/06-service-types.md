---
status: Accepted
date: 2026-09-02
---
# Decision 06 — Services are application or domain services; infrastructure is out of scope

## Current position (2026-09-10)

Stable. `ServiceType` is `application | domain` and repositories and factories are not modelled; nothing has moved either point. What later records added is what each type may do. A domain service is internal: its operations carry no upstream pattern and are consumed by no other context (`domain-service-internal`, decision 17), and it consumes only its own context's consumables (decision 17's second amendment of 2026-09-08, card 92). That rule was argued both ways and stands, with a two-part reopening condition that card 117's blind model did not meet (decision 17, amendment and note of 2026-09-10). An application service is the context's public boundary (decision 17). On an external context the service type is not read at all (decision 28's fourth amendment of 2026-09-10, card 116).

## Context

`ServiceType` allowed `application | domain | infrastructure`. Infrastructure
services are an implementation concern, which contradicts the README's
position that ODS documents the problem space rather than the tech stack.
Repositories and factories were considered as first-class elements. See
board card 10.

## Decision

- `ServiceType` narrows to `application | domain`.
- No backwards compatibility: documents using `infrastructure` must be
  updated by hand.
- Repositories and factories are not modelled. They are mechanisms for
  obtaining aggregates, not domain concepts, and add noise to a map meant for
  business and technical readers alike.

## Consequences

- Breaking for documents that used `infrastructure`.
