---
sidebar_position: 2
title: Strategic Design
---

# Strategic Design

The strategic side of the model answers "what do we compete on, who owns
what, and how do the parts relate".

## Problem space and solution space

Domains group **subdomains**, and each subdomain is classified as `core`,
`supporting` or `generic`. That is the problem space. **Bounded contexts**
are the solution space: they belong to the workspace and list the
subdomains they serve, so one context can span several subdomains and one
subdomain can be served by several contexts. `subdomain.addBoundedcontext`
is a shorthand for creating a context that serves that one subdomain.

## Teams

A workspace lists its **teams** and a context may be owned by one. The
context map prints the owner under each context and the generated docs list
what each team owns.

## Context flags

A context is one of three kinds of unknown, or none of them, and the three
answer different questions: who may change the system, and what can be known
of what is inside it. A context may carry at most one of the flags, and a
context carrying two is refused, because every rule that reads one of them
would be left guessing which reading was meant.

A context whose model is not coherent, typically a legacy system, can be
flagged `bigBallOfMud`. It is the enterprise's own, so it may state
aggregates, rules and reactions, and what it cannot be held to is
completeness: it may say what it emits without saying how, and name a cluster
without naming its root. It is drawn as a muddy blob so that neighbours know
to protect themselves with an anti-corruption layer (`mud-needs-acl`).

A context of ours that nobody has interviewed yet — coherent as far as anyone
knows, and simply not written down — can be flagged `boundaryOnly`. This is
the kind incremental adoption meets on its first day: a bank modelling
Payments first still holds a customer id into its own CRM, and with only the
two flags above it had to invent the CRM's entities or call a healthy context
a mess. A boundary-only context is ours in every ordinary way — it serves
subdomains and it has a team — and it states the consumables it offers and
takes, the schemas those carry, its value objects and its glossary.
`boundary-only-is-boundary` refuses aggregates, policies, processes and
context invariants on it; an `identifies` of ours may name the context or one
of its schemas; no rule asks how it reacts or which of its operations calls
out; and nothing consuming it is asked for an anti-corruption layer, because
it is not a mess. It becomes an ordinary context the day somebody interviews
it, and the flag comes off.

A context the enterprise does not own and does not model inside — a card
scheme, a payment provider, a licensor, a regulator, a clock — can be
flagged `external`. It may still provide and consume consumables and take
part in relationships, but it needs no subdomain, no team and no internals:
`external-is-boundary` refuses aggregates, policies and processes on it,
because what happens inside it is not ours to state. What it publishes is a
different matter, and three things stay legal precisely because they are
published rather than invented: its **schemas**, the payload shapes and named
kinds that system documents — a processor's Customer beside its Payment, its
Refund and its Dispute — which an `identifies` attribute of ours may name
directly instead of the context as a whole; its **value objects**, which may
carry the standard's own rules (an IBAN's mod-97 checksum, an ISO 20022 field
rule); and a **context invariant** marked `precondition` or `postcondition` —
a published contract is citable where a rule the machine keeps at rest is not.
Such an invariant names one of that context's own operations and constrains
only the attributes of the shapes that operation carries and the context's own
value objects; or, flagged `postcondition`, it names one of that context's own
events and constrains the attributes of that event's payload, which is how a
provider that only sends — a webhook, a settlement feed — states the contract
of what it sends. Another context's operation or event, or anything outside
what the guarded one carries, is refused.

## Context relationships

Relationships between contexts are declared on the workspace:

| Type | Direction | Meaning |
| --- | --- | --- |
| `upstream-downstream` | directed | the downstream context depends on the upstream one |
| `customer-supplier` | directed | as above, and the downstream team has a say in the upstream's plans |
| `partnership` | symmetric | the two teams plan and release together |
| `shared-kernel` | symmetric | the two contexts share part of their model |
| `separate-ways` | symmetric | the two contexts deliberately do not integrate |

Directed relationships carry the **roles** each side plays: upstream roles
are `open-host-service` and `published-language`, downstream roles are
`conformist` and `anti-corruption-layer`. The same roles appear on
individual consumables and consumptions. A `customer-supplier` downstream is
asked for no role: it negotiated the interface it uses, which is what the
type says, and neither downstream word describes that — a conformist is the
downstream with no say. Write one if it is true, and `role-coherence` does
not ask for it.

A downstream that declares the `conformist` role says it takes the upstream's
model as it stands, so it may name that upstream's schemas and value objects
directly — the one borrowing that runs in a single direction, downstream from
upstream. That is how an external system's formats enter a model without
anybody pretending they are ours, and `conformist-backed` asks in return that
the two contexts really exchange something.

Two contexts sharing a library declare `shared-kernel` directly between
them and borrow one another's value objects and schemas across it — that
pairwise kernel is Evans's shared subset, modelled as such. When several
contexts share one library, model the library as a bounded context of its
own and give each sharer a `shared-kernel` relationship with that context,
rather than one relationship per pair: six contexts sharing a
financial-primitives library are six relationships to one kernel context,
not fifteen among themselves. A kernel context is also the one place for
something a pairwise kernel cannot hold: an entity two contexts jointly own.
A relation and a kind never cross a bounded context, and an entity has one
home, so a Product a manufacturing context and a sales context both change is
an aggregate of a kernel context both consume through its operations, not an
entity duplicated or shared directly between the two.

Where two contexts exchange consumables and no relationship is declared, the
context map draws an **implied** upstream-downstream edge (dashed) with the
roles collected from the consumables involved. An identity attribute naming
another context's entity implies an edge in the same way, marked `«id»` and
carrying no roles, since nothing is exchanged; so does an identity naming an
external context, which is how an id belonging to a system nobody here models
inside still shows as a dependency. Declaring a relationship
replaces the implied edge. `relationship-declared` warns only where a
consumption or a borrowed value object has no relationship behind it; an
identity crossing draws its implied `«id»` edge either way, because nothing
is exchanged for a relationship to describe.

```ts file=../../tests/strategic.example.test.ts
```
