---
name: refactor
description: Pick highest-scored clean-code TODO, fix it, stop. Loop handles repetition.
---

One pass = one fix.

1. Scan for `// TODO: clean-code -` markers.
2. Pick highest-scored.
3. Fix. Remove marker.
4. Lint, typecheck, tests.
5. Report: what, where, score.
6. Stop.

All markers ≤ 0.5 → report "clean", stop.
No markers → report "clean", stop.
