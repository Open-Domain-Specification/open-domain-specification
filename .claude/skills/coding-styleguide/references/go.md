# Go

- Follow `gofmt`, small consumer-facing interfaces, and standard-library conventions.
  Prefer concrete domain types over unstructured maps and unchecked assertions.
- Return `(T, error)` for fallible operations and check `err` promptly. Document
  APIs that intentionally return useful partial data alongside an error.
- Use typed errors for structured details and sentinel errors for stable identities.
  Inspect with `errors.As`/`errors.Is`, not message matching.
- Add context with wrapping where exposing the underlying cause fits the API;
  use `%w` when callers should be able to inspect the wrapped error.
- Return a genuine nil error on success; an interface holding a typed nil pointer
  is not nil. Avoid silently discarded errors and ambiguous zero-value fallbacks.
- Keep expected validation and operational failure out of `panic`/`recover` paths.
  Reserve panics for bugs or broken invariants; recovery belongs at deliberate boundaries.
- Propagate `context.Context` through relevant calls, honor cancellation, and clean
  up resources with appropriate `defer`. Avoid logging the same error at every layer.
- Go's `error` interface does not enumerate all failures or enforce exhaustive
  handling. Use existing analysis tools to catch ignored errors where available.
- Run project tests and configured vet/static analysis; avoid blanket suppressions.

Reference: [Go error wrapping and inspection](https://go.dev/blog/go1.13-errors).
