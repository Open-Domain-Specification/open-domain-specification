---
status: Accepted
date: 2026-09-02
---
# Decision 01 — Classify subdomains, not domains, as core / supporting / generic

## Current position (2026-09-10)

The record is stable. `SubdomainSchema.type` is required (`core | supporting | generic`) and `DomainSchema` carries no classification; no later amendment or card has moved either point. Every surface reads the classification from the subdomain, and the context map clusters a context under its first subdomain (decision 02; decision 15, "Context maps cluster by primary subdomain").

One consequence did not happen as written: the promised `odsVersion` bump was never made. The field read `1.0.0` from the first commit until decision 29's note of 2026-09-10 (card 114) made the version a constant core writes, `2.0.0`, checked by an `ods-version` diagnostic.

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
