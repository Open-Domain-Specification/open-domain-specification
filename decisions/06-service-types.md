---
status: Accepted
date: 2026-09-02
---
# Decision 06 — Services are application or domain services; infrastructure is out of scope

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
