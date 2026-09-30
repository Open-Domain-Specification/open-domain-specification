// Run by check-real-host-results.test.mjs through a real Playwright, to get a
// JSON report with each outcome the checker must tell apart. Not a test of this
// repository: it needs no browser.
import { expect, test } from "@playwright/test";

test("an ordinary passing test", () => {
	expect(1).toBe(1);
});

test("an ordinary failing test", () => {
	expect(1).toBe(2);
});

test("an expected failure that fails, as test.fail() declares", () => {
	test.fail();
	expect(1).toBe(2);
});

test.fixme("a fixme test", () => {});
