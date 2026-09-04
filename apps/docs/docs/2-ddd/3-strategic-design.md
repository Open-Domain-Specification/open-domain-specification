---
sidebar_position: 3
title: Strategic Design Drawing the Boundaries
content_guide:
  purpose: To introduce DDD’s strategic tools, showing how Bounded Contexts and relationship patterns reveal the health of a system’s design.
  audience:
    - Developers working in large systems
    - Architects managing multiple teams or domains
    - Product leaders needing system-level clarity
  tone: Insightful, strategic, and diagnostic
  emotion:
    - “Aha!” realization that domains need boundaries
    - Confidence that system health can be evaluated
    - Clarity about why relationships matter as much as models
  takeaway:
    - Large systems need boundaries — DDD provides Bounded Contexts.
    - Relationships between contexts vary in type and quality.
    - Strategic design lets teams see both the map and the health of the connections.
---

# 🗺 Strategic Design: Drawing the Boundaries

So far, we’ve looked at how Domain-Driven Design (DDD) helps align software and business with a **shared language** and **clear building blocks**.

But what happens when systems get big?

When dozens of teams, features, and models start colliding?

That’s where **strategic design** comes in.

---

### The Problem of Scale

* A single universal model won’t survive in a large organization.
* Words start to drift: “Customer” means one thing in billing, another in support.
* Without boundaries, everything leaks into everything else — and complexity explodes.

---

### Bounded Contexts

DDD solves this with a key idea: **Bounded Contexts**.

A Bounded Context is a clear border around a model where terms have an exact meaning.

Inside a context, words are precise and consistent.

Outside, they may mean something else — and that’s okay.

Instead of one fragile “big model,” you get multiple strong models, each with its own clear boundary.

---

### A Context Acts Through Its Own Boundary

What an aggregate offers stays inside its context. An aggregate is a
consistency boundary, not an integration one, and the same goes for a domain
service: both are the inside of the model. What a context offers outward is
provided by its **application service**, so there is one place to look for the
promises a context makes and one door every caller comes through.

The same holds in the other direction. A policy reacts to another context's
published event — that is how contexts integrate — but it issues operations of
its own context only. To act on a neighbour, a context calls it from an
operation of its own, and the dependency then reads where it belongs: as a
consumption on the consumable map.

---

### Relationships Between Contexts

Boundaries don’t live in isolation. Contexts interact.

And the **type of relationship** matters:

* Some contexts share concepts closely.
* Some depend directly on another’s definitions.
* Some protect themselves by translating at the boundary.

These patterns make visible whether a connection is **healthy or risky**.

It’s not just about knowing two systems talk — it’s about knowing if the way they talk helps or hurts.

---

### Relationship Patterns

ODS names nine patterns, and every surface — the diagram legend, the hover summaries, the generated documentation, the authoring skill — explains them in exactly these words. They come from one table in the core package, `PATTERNS`, so a diagram and an agent can never tell you different stories about the same edge.

Five describe **the relationship itself**, and are what a context map draws on the line between two contexts:

| Pattern | Mark | In one line |
|---|---|---|
| Upstream/Downstream | `U/D` | One context depends on another; the upstream does not plan around the downstream. |
| Customer/Supplier | `C/S` | Upstream plans for and prioritizes downstream requirements. |
| Partnership | `P` | Mutual co-operation where teams coordinate development and releases. |
| Shared Kernel | `SK` | A shared subset of domain model and code, co-owned by both teams. |
| Separate Ways | `SW` | A deliberate decision to forego integration and develop independently. |

Four describe **the role one side plays** on that relationship, and are drawn as a badge at the end of the line:

| Pattern | Mark | Side | In one line |
|---|---|---|---|
| Open Host Service | `OHS` | upstream | A public, stable protocol or API provided by an upstream context. |
| Published Language | `PL` | upstream | A well-documented shared interchange format. |
| Conformist | `CF` | downstream | Downstream adopts the upstream domain model without translation. |
| Anti-Corruption Layer | `ACL` | downstream | A translating boundary isolating a downstream model from external concepts. |

#### What each one costs you

No pattern is free, and choosing one is choosing its bill.

**Upstream/Downstream (U/D)** — A directed dependency with no customer commitment: the upstream evolves on its own schedule and the downstream adapts through its roles.

- ✅ Upstream keeps full autonomy
- ⚠️ Downstream carries the integration risk

**Customer/Supplier (C/S)** — An asymmetric relationship where downstream needs act as customer requirements and upstream delivery commitments factor in downstream deadlines.

- ✅ Predictable alignment between collaborating teams
- ⚠️ Upstream velocity can be constrained by downstream dependencies

**Partnership (P)** — Two contexts succeed or fail together. Features spanning both are planned, co-designed, and released in synchronized cycles.

- ✅ Tight strategic cohesion across organizational boundaries
- ⚠️ Requires close communication and joint release cadences

**Shared Kernel (SK)** — A strictly bounded shared library, schema, or database subset. Neither team alters the kernel without joint consultation and continuous test verification.

- ✅ Prevents duplicate modeling and translation costs
- ⚠️ High coordination friction; degrades autonomy if it grows beyond a small subset

**Separate Ways (SW)** — Both contexts solve their requirements without technical links, accepting possible domain overlap to keep complete operational independence.

- ✅ Maximum operational autonomy with no cross-team dependencies
- ⚠️ Possible duplication of data and business logic

**Open Host Service (OHS)** — The upstream context commits to maintaining a standardized, backward-compatible interface so multiple downstream subsystems can integrate without bespoke integration logic.

- ✅ Reduces coupling across multiple consumers
- ⚠️ Increases upstream maintenance overhead and versioning obligations

**Published Language (PL)** — An explicit schema standard (JSON Schema, Protobuf, an industry XML) that expresses domain operations and events independently of either context's internal representation.

- ✅ Enables polyglot integrations and widespread consumption
- ⚠️ Requires governance over schema evolution

**Conformist (CF)** — The downstream team accepts the upstream model as-is, dropping translation layers when the upstream model fits well or translation overhead is unjustified.

- ✅ No translation and a simpler codebase
- ⚠️ Exposed to breaking upstream schema changes

**Anti-Corruption Layer (ACL)** — A translating mechanism (adapters, facades, mappers) that keeps foreign domain concepts, schema changes, or vendor anomalies from leaking into the downstream model.

- ✅ Maximum isolation and autonomy for the downstream context
- ⚠️ Cost of maintaining translation logic and data mappings

---

### Why This Matters

With strategic design, you can:
- ✅ See the big picture without drowning in detail.
- ✅ Keep models strong by giving them space to breathe.
- ✅ Spot weak spots in the system before they become failures.

---

**In short:**

* **Tactical DDD** gives you the building blocks.
* **Strategic DDD** shows how those blocks fit together at scale — and whether the connections are healthy.

This is what turns DDD from a modeling technique into a way of **navigating complexity**.

---

👉 Next, we’ll explore how the **Open Domain Specification** makes these ideas concrete, discoverable, and usable across your whole organization.