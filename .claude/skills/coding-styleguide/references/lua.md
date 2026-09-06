# Lua

- Match the project's Lua version and embedding environment; prefer locals and
  explicit module interfaces. Avoid accidental globals and coercion-dependent logic.
- Lua is dynamically typed. Use the project's annotations/checker when available
  and validate boundary values at runtime; annotations alone enforce nothing.
- Return expected failures as `nil, err` and success as `value, nil`, with stable
  structured error kinds where callers need to branch.
- Check `err ~= nil`, not the value's truthiness: nil or false may be valid success
  values. Keep failure errors non-nil; do not introduce Result wrapper tables.
- Preserve multiple return values when forwarding outcomes; remember assignment
  and expression position can discard extra results.
- Reserve `error`/failing `assert` for bugs and violated invariants. Do not assert
  success for expected I/O or validation failures that callers must handle.
- Use `pcall`/`xpcall` at deliberate throwing boundaries, adapting only recognizable
  expected failures and preserving unknown errors and useful diagnostic context.
- Follow host cleanup/cancellation conventions; use version-supported resource
  mechanisms. Run existing lint/checker and tests without claiming static guarantees.

Reference: [Lua manual](https://www.lua.org/manual/5.4/manual.html).
