---
name: ddd-hexagonal
description: Structure code as DDD-layered hexagons. domain/<context> owns the model and the ports, infra/<tech> adapts both sides, entry points compose. Use when creating or moving a module, adding an adapter, store or provider, introducing a bounded context, or answering "where does this code live?". Triggers on domain, port, adapter, repository, bounded context, hexagonal, DDD, composition root.
---

# ddd-hexagonal

The folder graph is the architecture. Every module wears its layer in its path,
and dependencies point inward only: `composition root → infra → domain`.

## Layers

| Layer | Path | Rule |
| --- | --- | --- |
| Domain | `src/domain/<context>/` | one folder per bounded context; contexts meet only through ports and each other's `index.ts` barrel |
| Infrastructure | `src/infra/<tech>/` | named for the technology (`postgres`, `http`, `filesystem`), never for the domain; driving and driven adapters alike |
| UI / delivery | `src/<surface>/` | talks to the domain only through injected ports |
| Composition root | one entry point per runtime surface | the only modules that name concrete infra |

Nothing in `src/domain` imports a framework, platform API, network or filesystem
call, or another layer. Domain code must run in a bare unit test with no mocks
of platform APIs.

## Ports

- **Driving ports** are what callers use: an interface exported from the domain
  folder. UI code receives the interface, never a concrete class.
- **Driven ports** are what the domain needs from the world: also interfaces in
  the domain folder, with a **domain-owned error vocabulary**. Adapters map their
  technology's errors into that vocabulary; the domain never sees an HTTP status,
  a driver exception or a platform error.
- **Failures are values, in the signature.** Use a shared `Result<T, E>` type:

  ```ts
  type Result<T, E> = readonly [value: T, error: undefined] | readonly [value: undefined, error: E];
  const [chat, err] = await store.getChat(id);
  if (err) return report(err);
  ```

  A port never throws its vocabulary. `throw` means the code is wrong (a broken
  invariant), not that the user did something.
- **Absence is not failure.** A lookup miss is `ok(undefined)`. Reserve `NotFound`
  for when absence genuinely stops the caller, and say so at the method.
- Keep pure logic (reducers, policy, formatting) synchronous and port-free.
- Wire with plain constructor or factory injection from the composition root. No
  service locator, no module-level singletons holding infra.

## Composition root duties, and only these

Instantiate concrete infra, inject it into domain services and UI, and own the
runtime concerns of its surface: listeners, lifecycle, scheduling, top-level
error logging.

## Tests per layer

| Layer | Style |
| --- | --- |
| domain | plain unit tests, no platform mocks |
| UI | component tests over a fake port |
| infra | exercise the real technology cheaply (in-memory fake, stubbed transport) and assert the returned error value, never `rejects.toThrow` |
| composition roots | thin enough that an end-to-end smoke test covers them |

## Recipes

- **New bounded context**: new `src/domain/<context>/` with model, ports, error
  vocabulary and tests. Existing infra composes it. Record a decision if the
  boundary is debatable.
- **New driving adapter** (new surface, CLI, keyboard API): calls the existing
  driving ports; no domain change.
- **New store, gateway or provider**: new module in `src/infra/<tech>/`
  implementing the driven port; swap it in the composition root, one line.

## Smells and fixes

| Smell | Fix |
| --- | --- |
| platform or network API imported in `src/domain` | move it behind a port into `src/infra` |
| adapter imports another adapter | both talk to the domain port |
| concrete infra constructed outside a composition root | inject the port interface |
| domain returns or throws a raw infra error | map into the domain vocabulary in the adapter |
| a port throws its own vocabulary | return `Result<T, E>` |
| a caller wraps a port call in `try/catch` | the failure is a tuple member; check it |
| `throw` for something a user can cause | make it a value |
| business rule in a UI component or store | push it through the port into the domain |
| `util`, `common`, `helpers` module | it hides a layer; name the layer or inline it |
| one surface importing another's modules | shared code lives in domain or infra |

## Enforce it

Add an import-boundary lint (for example dependency-cruiser) with rules for:
domain imports nothing outside domain and takes no dependencies; contexts meet
at barrels; infra never imports UI; adapters never import adapters; only roots
construct infra; no cross-surface imports; no cycles. Add a globals scan for
platform APIs that are not imports. Run it before claiming a move is done. A
rule that is not yet true of the tree is a tracked task, not a commented-out
block, and breaking one on purpose is a decision record, not a drive-by.
