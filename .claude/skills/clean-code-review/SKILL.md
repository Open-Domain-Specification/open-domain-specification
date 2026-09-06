---
name: clean-code-review
description: Clean-code audit of a change against SRP, DRY, naming, coupling, dead code, KISS, boundaries and panic safety. Tags violations in place as scored TODO markers. Use after implementing a change and before pre-commit.
---

# clean-code-review

## Proportionality gate

- More than 50 lines changed or more than 3 files touched: full audit, one parallel sub-agent per principle if supported.
- Otherwise: one inline pass over the same principles, no sub-agents.

Review changed files and immediate surroundings. Ignore test boilerplate, framework-mandated patterns and pre-existing issues outside the diff.

## Principles

1. **SRP**: functions doing two jobs, classes with several reasons to change, mixed I/O and logic.
2. **DRY**: copy-pasted blocks, duplicated constants, near-identical functions, repeated conditionals.
3. **NAMING**: unclear or misleading names, generic names (manager, handler, processor), no intent revealed.
4. **COUPLING**: concrete dependencies constructed inline, shared mutable state.
5. **DEAD**: unused functions, unreachable branches, commented-out code, stale imports.
6. **KISS**: unnecessary complexity, over-engineered abstractions, premature generalisation. Ask five whys per finding; if it cannot be justified it is a violation.
7. **BOUNDARY**: coupling across a real seam: importing internals, concrete signatures or wiring instead of contracts, binding to a remote node/version instead of its gateway, untranslated foreign-context models, or dependencies toward the more volatile side.
8. **PANIC**: production aborts on reachable input: unchecked unwraps, indexing, overflow or live `unreachable`/`todo`. Error paths must propagate, fall back or guard.

## Gates on the last two

- **BOUNDARY** requires a cross-system/context call, trust perimeter or actual/credibly imminent swap. Name the decision that can change independently; otherwise do not flag (KISS).
- **PANIC** requires a named triggering input from external data, I/O, parsing, user files or environment; otherwise do not flag. Test code is exempt. An unwrap protected by an invariant established just above is safe; comment the invariant.

## Report and tag

Report file, line range, description and severity (0–1). For findings above 0.5: fix violations introduced this session immediately; tag remaining findings at the violation site:

```
// TODO: clean-code - <score> - <SRP|DRY|NAMING|COUPLING|DEAD|KISS|BOUNDARY|PANIC>: <description>
```
