---
name: coding-styleguide
description: Write or review ecosystem-idiomatic code with strong types, strict checks, explicit expected-error handling, and DDD/hexagonal boundaries. Includes language-specific references.
---

# Coding Styleguide

Read neighboring code, supported language versions, and project checks first.
Apply these defaults to the requested change; preserve required framework contracts
and avoid unrelated API migrations, dependency additions, or configuration churn.

- Prefer idiomatic standard-library patterns and the strongest practical type safety.
  Model distinct states explicitly; validate external data before trusting its type.
- Preserve strict checking. Do not silence errors with unsafe casts, `any`, ignored
  diagnostics, or fallback values that disguise failure as success.
- Use a language/standard-library `Result` where provided; otherwise prefer
  Lua/Go-style `(value, error)` returns. Do not invent Result wrappers or add Result
  libraries. Check, handle, or propagate the error before consuming the value.
- Reserve throws/panics for unexpected bugs and broken invariants, not validation,
  business rejection, or foreseeable operational failures. Preserve checked-error APIs.
- At dependency boundaries, translate known exceptions into expected outcomes with
  useful context and causes. Let unknown bugs escape; preserve cancellation and cleanup.
- Verify success, relevant expected failures, and propagation using existing checks.

## Architecture

When using DDD/hexagonal architecture, preserve the project's layout and keep dependencies inward:

- Domain owns models, policies, errors, and ports; no framework, platform, I/O, or outer-layer dependencies.
  Contexts communicate through ports and public APIs. Keep pure logic synchronous and port-free.
- Driving ports expose use cases; driven ports describe external needs. Technology-named adapters
  implement ports and translate known failures into domain errors using the return conventions above.
  Normal lookup absence is a successful absent value; distinguish it from an operation-blocking `NotFound`.
- UI/delivery calls injected ports. Composition roots construct adapters and own lifecycle,
  listeners, scheduling, and top-level logging. Prefer constructor/factory injection over service locators or globals.
- New surfaces reuse driving ports; new providers implement driven ports. Keep business rules in
  domain and shared code in its owning layer; avoid catch-all `util`/`common` modules.
- Test domain with plain units, UI with fake ports, adapters at technology boundaries including
  returned errors, and composition roots with smoke tests.
- Check imports and platform globals for isolation, public context boundaries, cycles, cross-surface
  or adapter coupling, and construction outside roots. Run existing boundary checks after moves;
  document debatable boundaries and intentional exceptions. Add enforcement only when in scope.

## Languages

Read only the references matching the code being changed:

| Language | Reference |
| --- | --- |
| Rust | [Rust](references/rust.md) |
| TypeScript | [TypeScript](references/typescript.md) |
| JavaScript | [JavaScript](references/javascript.md) |
| Go | [Go](references/go.md) |
| Lua | [Lua](references/lua.md) |
| Python | [Python](references/python.md) |

For other languages, apply the common principles through their native idioms.
