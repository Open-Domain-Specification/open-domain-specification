---
name: clean-code-review
description: Multi-agent clean code audit — each principle gets its own agent
---

## Proportionality gate

Check diff size first:
- **> 50 lines changed OR > 3 files touched** → full sub-agent audit below.
- **Otherwise** → self-scan inline. One pass, same principles, no sub-agents. Tag violations you find.

## Agents (full audit only)

Launch parallel sub-agents, each scanning files touched by the current change + immediate surroundings.

1. **SRP** — functions doing two jobs, classes with multiple reasons to change, mixed I/O and logic.
2. **DRY** — copy-pasted blocks, duplicated constants, near-identical functions, repeated conditionals.
3. **Naming** — unclear/misleading names, generic names (manager/handler/processor), no intent revealed.
4. **Coupling** — concrete deps constructed inline, modules reaching into each other's internals, shared mutable state.
5. **Dead code** — unused functions, unreachable branches, commented-out code, stale imports.
6. **KISS** — unnecessary complexity, over-engineered abstractions, premature generalisation. 5-whys each finding. Can't justify it → violation.

## Each agent

- Reports: file, line range, description, severity (0–1).
- Ignores: test boilerplate, framework-mandated patterns, pre-existing issues outside the diff.

## Consolidation

For each violation scoring **> 0.5**:

```
// TODO: clean-code - <0-1 score> - <SRP|DRY|NAMING|COUPLING|DEAD|KISS>: <description>
```

Add at the violation site. Violations you introduced this session scoring > 0.5 → fix immediately.
