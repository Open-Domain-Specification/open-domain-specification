---
name: clean-code-review
description: Clean-code audit of a change against SRP, DRY, naming, coupling, dead code, KISS, boundaries and panic safety. Tags violations in place as scored TODO markers. Use after implementing a change and before pre-commit.
---

# clean-code-review

## Proportionality gate

Check the diff size first.

- More than 50 lines changed or more than 3 files touched: full audit, one
  parallel sub-agent per principle if the harness supports it.
- Otherwise: one inline pass over the same principles, no sub-agents.

Scope is the files touched by the change plus their immediate surroundings.
Ignore test boilerplate, framework-mandated patterns and pre-existing issues
outside the diff.

## Principles

1. **SRP**: functions doing two jobs, classes with several reasons to change, mixed I/O and logic.
2. **DRY**: copy-pasted blocks, duplicated constants, near-identical functions, repeated conditionals.
3. **NAMING**: unclear or misleading names, generic names (manager, handler, processor), no intent revealed.
4. **COUPLING**: concrete dependencies constructed inline, shared mutable state.
5. **DEAD**: unused functions, unreachable branches, commented-out code, stale imports.
6. **KISS**: unnecessary complexity, over-engineered abstractions, premature generalisation. Ask five whys per finding; if it cannot be justified it is a violation.
7. **BOUNDARY**: implementation coupling across a module or system seam. A consumer importing another module's internals instead of its published face; signatures or wiring naming a concrete implementation where the contract belongs; a remote dependency built against a specific node or version instead of its gateway; a foreign bounded-context model used raw with no translation; dependencies pointing toward the more volatile side.
8. **PANIC**: production paths that abort on reachable input. Unchecked unwraps, unguarded indexing, overflowing arithmetic, `unreachable`/`todo` on a live path. Every error path must propagate, fall back or guard.

## Gates on the last two

- **BOUNDARY** fires only where a real seam exists: a cross-system or cross-context call, a trust perimeter, or a swap that is actual or credibly imminent. Each finding must name the decision the boundary lets change independently. Cannot name one: do not flag, since flagging it is itself a KISS violation.
- **PANIC** fires only when the failing case is reachable from real input (external data, I/O, parsing, user files, environment). An unwrap made safe by an invariant established just above is not a violation, though the invariant deserves a comment. Test code is exempt. Name the input that triggers each flagged panic; cannot name one: do not flag.

## Report and tag

Each finding: file, line range, description, severity from 0 to 1.

For every finding scoring above 0.5, add a marker at the violation site:

```
// TODO: clean-code - <score> - <SRP|DRY|NAMING|COUPLING|DEAD|KISS|BOUNDARY|PANIC>: <description>
```

Violations you introduced in this session scoring above 0.5: fix immediately
instead of tagging.
