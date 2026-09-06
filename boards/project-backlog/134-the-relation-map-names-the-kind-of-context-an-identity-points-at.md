---
column: backlog
labels: [frontend]
priority: low
agent: developer
updatedAt: 2026-09-11T07:40:00.000Z
---
# The relation map names the kind of context an identity points at

The relation map draws an identity whose target is a bounded context as an `external_context` node with the stereotype "external system", whatever flag the context carries, so a big-ball-of-mud target and, since card 132, a boundary-only target are both mislabelled. And `ContextNode.svelte` reuses the class `.stereotype` for a node's own stereotype line, which collides with the edge badge's class; card 132 scoped an e2e selector around it rather than renaming. Noticed by card 132's developer.

## Checklist

- [ ] The relation map draws an identity target that is a context with that context's own stereotype (external system, big ball of mud, boundary only) and node kind; test for each
- [ ] `ContextNode.svelte`'s node stereotype class renamed so it no longer collides with the edge badge; the e2e selector card 132 scoped is simplified back
- [ ] `bash scripts/verify-all.sh` green

## Comments
