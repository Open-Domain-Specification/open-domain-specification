---
status: Accepted
date: 2026-09-02
---
# Decision 02 — Bounded contexts belong to the workspace and link to subdomains

## Context

Subdomains are problem space; bounded contexts are solution space. One
context may serve several subdomains and one subdomain may be served by
several contexts. The original schema nested contexts one-to-many under a
subdomain, and every context-owned ref (`#/domains/d/subdomains/s/boundedcontexts/b/...`)
embedded that nesting, so the relationship could not be many-to-many and any
rename above the context broke every ref beneath it. See board card 01.

## Decision

- `WorkspaceSchema.boundedcontexts` holds every context, keyed by id.
- `BoundedContextSchema.subdomains` is an array of `{ $ref }` to the
  subdomains the context serves (zero or more).
- `SubdomainSchema.boundedcontexts` is removed. In the TypeScript model
  `Subdomain.boundedcontexts` remains as a derived, read-only view.
- Context-owned refs shorten to `#/boundedcontexts/<id>/...`.
- The DSL keeps `subdomain.addBoundedcontext(...)` as a convenience that
  creates the context on the workspace and links it; the primary API is
  `workspace.addBoundedContext(name, { subdomains: [...] })`.
- No backwards compatibility is provided for the old nested shape.
- For visual namespacing (context map clusters, breadcrumbs) a context is
  shown under its first linked subdomain, its *primary* subdomain.

## Consequences

- Breaking schema change; `odsVersion` bumps.
- UI routes and doc output paths for contexts become `/boundedcontexts/<id>/...`.
- Sidebars list a context under every subdomain it serves.
- Stable refs for everything below a context no longer depend on domain or
  subdomain names, which partly addresses board card 15.
