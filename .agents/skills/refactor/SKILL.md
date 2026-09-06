---
name: refactor
description: Clear one clean-code TODO marker per pass. Picks the highest-scored marker, fixes it, verifies, reports, stops. Run repeatedly to work the list down.
---

# refactor

One pass, one fix.

1. Scan for `// TODO: clean-code -` markers.
2. Pick the highest-scored one.
3. Fix it and remove the marker.
4. Run lint, typecheck and tests.
5. Report what changed, where, and the score cleared.
6. Stop.

If there are no markers, or every marker scores 0.5 or below, report "clean"
and stop.
