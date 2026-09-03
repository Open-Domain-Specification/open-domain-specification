---
status: Accepted
date: 2026-09-02
---
# Decision 01 — Classify subdomains, not domains, as core / supporting / generic

## Context

DDD's strategic classification (core, supporting, generic) applies to
subdomains: the parts of the problem space you compete on versus the parts
you merely need. The ODS schema put `type` on `DomainSchema` and left
`SubdomainSchema` untyped, so a domain with one core and two generic
subdomains could not be expressed. See board card 02.

## Decision

- `SubdomainSchema.type` becomes required, with values `core | supporting | generic`.
- `DomainSchema.type` is removed. A domain is a grouping of subdomains and
  carries no classification of its own.
- No backwards compatibility is provided: documents written against the old
  schema must be updated by hand.

## Consequences

- Breaking schema change; `odsVersion` bumps.
- Doc, Graphviz and UI move the classification badge from the domain page to
  the subdomain page and list.
- Downstream tooling that read `domain.type` must read `subdomain.type`.
