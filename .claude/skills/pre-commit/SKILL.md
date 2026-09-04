---
name: pre-commit
description: Mandatory quality gate before every git push. Review the change, run clean-code-review, clear high-scored markers, verify, repeat until clean. No exceptions.
---

# pre-commit

Run before every push. Loop until clean.

1. **Review the outgoing change** for correctness, unhappy paths and test
   coverage. Read the diff adversarially: what input, state or environment
   breaks it? Any bug or missing test blocks the push. Fix it.
2. **Run `clean-code-review`** on the same change. It tags violations as
   `// TODO: clean-code - <score> - <CATEGORY>: ...` markers.
3. **Scan for markers.** Any scoring above 0.5 blocks the push. Fix them, or run
   `refactor` to clear the highest-scored one at a time.
4. **Lint, typecheck and test** after every fix.
5. **Repeat from step 1** until the review is clean and no marker above 0.5
   remains.

Only then push.
