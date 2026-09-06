# TypeScript

- Prefer strict compiler checking; preserve the project's additional safety checks.
  Enable stricter configuration only within an authorized configuration change.
- Use `unknown` for untrusted values and narrow through validation. Type assertions
  do not validate data; avoid `any`, unchecked casts, and non-null assertions as escapes.
- Model alternatives as discriminated unions, not unrelated optional fields.
  Prefer immutable bindings and readonly contracts where mutation is not intended.
- Return expected failures as typed tuples: `[T, null] | [null, E]`, with non-null
  errors. TypeScript has no native Result; do not introduce wrappers or libraries.
- Give errors distinguishable kinds and useful typed context. Check `error !== null`;
  use a `never` exhaustiveness check where every case must be handled.
- Async operations can return `Promise<[T, null] | [null, E]>`; TypeScript does not type
  rejected promises. Translate only known dependency failures; rethrow unknown ones.
- Preserve abort/cancellation behavior, and avoid catch-all conversions that turn
  programming errors into ordinary outcomes. Respect framework-required throw contracts.
- Prefer inference for local values and explicit public contracts. Use branded types
  only when domain distinctions warrant them; keep runtime validation at boundaries.
- Run the project's typecheck, lint, and relevant tests without bypass diagnostics.

Reference: [TypeScript strict checking](https://www.typescriptlang.org/tsconfig/strict.html).
