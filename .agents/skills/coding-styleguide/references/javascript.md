# JavaScript

- Follow the project's module system, runtime support, formatter, and lint rules.
  Prefer `const`, explicit comparisons, and clear data transformations.
- Use JSDoc types with the existing JavaScript type-checking setup where available;
  this provides static assistance, not runtime enforcement or TypeScript guarantees.
- Validate external values at boundaries. Avoid coercion and ambiguous `null`/false
  sentinels when callers need to distinguish failure from a valid result.
- Return `[value, null]` on success or `[null, error]` on expected failure;
  document the tuple with JSDoc. Do not invent Result wrappers.
- Callers check `error !== null` before using the value. Keep domain error kinds stable
  and add actionable context without exposing secrets.
- Return async outcomes through promises; known dependency rejections may be adapted
  at boundaries. Unknown exceptions/rejections remain visible as bugs.
- Preserve abort signals, cancellation, and resource cleanup. Do not wrap every
  operation in a catch-all or substitute successful-looking defaults.
- Prefer existing validation tools or focused runtime guards; do not add a Result
  library or migrate the project to TypeScript merely to implement this preference.
- Run existing lint/type checks and tests for success and expected failure paths.

Reference: [JavaScript type checking](https://www.typescriptlang.org/docs/handbook/type-checking-javascript-files.html).
