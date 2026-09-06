# Rust

- Borrow inputs (`&str`, `&[T]`, `&T`) unless ownership is required; return owned
  values when appropriate. Narrow borrows before cloning; use shared ownership deliberately.
- Prefer enums for alternatives, newtypes for domain distinctions, and exhaustive
  matching when adding a variant should require callers to act.
- Return `Result<T, E>` for expected failure and `Option<T>` for normal absence;
  propagate with `?`. Prefer typed library errors with useful context and source chains.
- Use existing `thiserror`/`anyhow` conventions when suitable; do not add crates by default.
- Reserve `unwrap`, `expect`, and `panic!` for tests or proven invariants; explain
  invariant assumptions. Expected input or operational failures must remain return values.
- Prefer safe Rust. Keep unavoidable `unsafe` minimal, encapsulated, and justified
  with explicit safety invariants; never introduce it merely to satisfy the borrow checker.
- Prefer slices/iterators in APIs, `From` for infallible conversions, and `TryFrom`
  for fallible ones. Choose loops when clearer than iterator chains.
- Follow ecosystem naming and visibility conventions; expose APIs deliberately and
  document meaningful contracts. Avoid needless lifetime parameters and abstractions.
- Use the project's formatter, Clippy configuration, and relevant Cargo tests.
  Address applicable warnings without unrelated lint churn or blanket allowances.

Reference: [Rust error handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html).
