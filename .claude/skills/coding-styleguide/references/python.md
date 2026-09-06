# Python

- Follow supported Python versions and ecosystem conventions: context managers,
  clear comprehensions, dataclasses for records, and protocols for structural contracts.
- Annotate meaningful boundaries and preserve the existing checker's strict mode.
  Type hints are not runtime enforcement; validate external values before narrowing.
- Prefer precise unions, generics, and domain types over `Any`, unchecked `cast`,
  ignored diagnostics, or dictionaries whose shapes are implicit.
- Return `(value, None)` or `(None, error)` for expected failures in new domain
  boundaries; annotate the tuple alternatives. Do not invent Result wrapper classes.
- Check `error is not None` before using the value. Narrow the success value as
  needed by the checker; do not bypass its limits with casts or ignored diagnostics.
- Python libraries commonly raise exceptions. Preserve required integration contracts
  and adapt narrowly recognized failures into outcomes at the application boundary.
- Keep `try` blocks small; catch specific exceptions. Let unknown programming
  errors propagate rather than treating every `Exception` as an expected failure.
- Preserve cause/context when translating errors. Never swallow process exits,
  interrupts, or cancellation; ensure context-manager cleanup still runs.
- Use existing format/lint/type checks and relevant tests; avoid API-wide Result
  rewrites or new dependencies solely to enforce this preference.

Reference: [Python typing](https://docs.python.org/3/library/typing.html).
