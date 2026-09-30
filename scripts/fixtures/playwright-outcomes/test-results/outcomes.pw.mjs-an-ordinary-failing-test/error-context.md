# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: outcomes.pw.mjs >> an ordinary failing test
- Location: scripts/fixtures/playwright-outcomes/outcomes.pw.mjs:10:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 2
Received: 1
```

# Test source

```ts
  1  | // Run by check-real-host-results.test.mjs through a real Playwright, to get a
  2  | // JSON report with each outcome the checker must tell apart. Not a test of this
  3  | // repository: it needs no browser.
  4  | import { expect, test } from "@playwright/test";
  5  | 
  6  | test("an ordinary passing test", () => {
  7  | 	expect(1).toBe(1);
  8  | });
  9  | 
  10 | test("an ordinary failing test", () => {
> 11 | 	expect(1).toBe(2);
     |            ^ Error: expect(received).toBe(expected) // Object.is equality
  12 | });
  13 | 
  14 | test("an expected failure that fails, as test.fail() declares", () => {
  15 | 	test.fail();
  16 | 	expect(1).toBe(2);
  17 | });
  18 | 
  19 | test.fixme("a fixme test", () => {});
  20 | 
```