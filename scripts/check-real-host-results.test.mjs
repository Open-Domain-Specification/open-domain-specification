import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	ALLOWED_SKIPS,
	checkResults,
	loadResults,
	playwrightTests,
	renderSummary,
	VSCODE_TEST_CONFIGS,
} from "./check-real-host-results.mjs";

const pass = (fullTitle) => ({ title: fullTitle, fullTitle, retries: 0 });
const mocha = ({ passes = ["a test"], pending = [], failures = [] } = {}) => ({
	passes: passes.map(pass),
	pending: pending.map(pass),
	failures: failures.map(pass),
	retried: [],
});
const screenshots = ALLOWED_SKIPS.petstore;

const goodVscode = () => ({
	petstore: mocha({ passes: ["p1", "p2"], pending: screenshots }),
	"hostile-links": mocha(),
	"cross-surface": mocha(),
	writer: mocha(),
	multi: mocha(),
});
const RESULTS = {
	expected: [{ status: "passed" }],
	unexpected: [{ status: "failed" }],
	flaky: [{ status: "failed" }, { status: "passed" }],
	skipped: [{ status: "skipped" }],
};
const spec = (title, status) => ({
	title,
	tests: [
		{
			status,
			expectedStatus: status === "skipped" ? "skipped" : "passed",
			results: RESULTS[status],
		},
	],
});
const goodKeyboard = () => ({
	suites: [
		{
			title: "smoke.spec.ts",
			suites: [{ title: "group", specs: [spec("one", "expected")] }],
		},
		{ title: "journeys.spec.ts", specs: [spec("two", "expected")] },
	],
	errors: [],
});
const good = () => ({ vscode: goodVscode(), keyboard: goodKeyboard() });

describe("the labels .vscode-test.mjs defines", () => {
	it("are all required, so a config that never reports cannot pass unnoticed", () => {
		expect([...VSCODE_TEST_CONFIGS].sort()).toEqual([
			"cross-surface",
			"hostile-links",
			"multi",
			"petstore",
			"writer",
		]);
	});

	for (const label of ["writer", "multi"]) {
		it(`refuses a run in which ${label} wrote no results`, () => {
			const input = good();
			input.vscode[label] = undefined;
			const r = checkResults(input);
			expect(r.ok).toBe(false);
			expect(r.problems).toEqual([
				`vscode-test ${label}: no results (VS Code did not download, start or finish)`,
			]);
		});

		it(`refuses ${label} with zero tests executed`, () => {
			const input = good();
			input.vscode[label] = mocha({ passes: [] });
			expect(checkResults(input).problems).toEqual([
				`vscode-test ${label}: zero tests executed`,
			]);
		});

		it(`refuses ${label} with a failing test`, () => {
			const input = good();
			input.vscode[label] = mocha({ failures: ["a failing test"] });
			expect(checkResults(input).problems).toEqual([
				`vscode-test ${label}: failed: a failing test`,
			]);
		});

		it(`refuses a skip in ${label}, which allows none`, () => {
			const input = good();
			input.vscode[label] = mocha({ pending: ["a skipped test"] });
			expect(checkResults(input).problems).toEqual([
				`vscode-test ${label}: unexpected skip: a skipped test`,
			]);
		});

		it(`does not let a petstore screenshot title excuse a skip in ${label}`, () => {
			const input = good();
			input.vscode[label] = mocha({ pending: [screenshots[0]] });
			expect(checkResults(input).problems.join("\n")).toContain(
				`vscode-test ${label}: unexpected skip`,
			);
		});
	}

	it("reports writer and multi in the totals alongside the others", () => {
		const input = good();
		input.vscode.writer = mocha({ passes: ["w1", "w2", "w3"] });
		input.vscode.multi = mocha({ passes: ["m1"] });
		const r = checkResults(input);
		expect(r.ok).toBe(true);
		expect(r.summary.vscode.writer).toMatchObject({ executed: 3, skipped: 0 });
		expect(r.summary.vscode.multi).toMatchObject({ executed: 1, skipped: 0 });
		expect(r.summary.allowedSkips).toHaveLength(4);
		const md = renderSummary(r);
		expect(md).toContain("| vscode-test | writer | 3 | 3 | 0 | 0 |");
		expect(md).toContain("| vscode-test | multi | 1 | 1 | 0 | 0 |");
	});
});

describe("checkResults", () => {
	it("passes a run that executed everything and skipped only the screenshots", () => {
		const r = checkResults(good());
		expect(r.problems).toEqual([]);
		expect(r.ok).toBe(true);
		expect(r.summary.vscode.petstore).toEqual({
			executed: 2,
			passed: 2,
			failed: 0,
			skipped: 4,
		});
		expect(r.summary.keyboard).toMatchObject({ executed: 2, passed: 2 });
		expect(r.summary.allowedSkips).toHaveLength(4);
	});

	it("fails when a suite step did not succeed, even with clean results", () => {
		const r = checkResults({ ...good(), outcomes: { keyboard: "failure" } });
		expect(r.ok).toBe(false);
		expect(r.problems).toEqual(["the keyboard suite step ended failure"]);
		expect(
			checkResults({ ...good(), outcomes: { vscode: "cancelled" } }).ok,
		).toBe(false);
		expect(
			checkResults({
				...good(),
				outcomes: { vscode: "success", keyboard: "success" },
			}).ok,
		).toBe(true);
	});

	it("fails when a vscode-test config wrote no results", () => {
		const input = good();
		input.vscode["cross-surface"] = undefined;
		const r = checkResults(input);
		expect(r.ok).toBe(false);
		expect(r.problems.join("\n")).toContain(
			"vscode-test cross-surface: no results",
		);
	});

	it("fails when the keyboard suite wrote no report", () => {
		const r = checkResults({ ...good(), keyboard: undefined });
		expect(r.ok).toBe(false);
		expect(r.problems.join("\n")).toContain("keyboard: no results");
	});

	it("fails on zero vscode-test tests, even with the screenshots skipped", () => {
		const input = good();
		input.vscode.petstore = mocha({ passes: [], pending: screenshots });
		const r = checkResults(input);
		expect(r.ok).toBe(false);
		expect(r.problems).toContain("vscode-test petstore: zero tests executed");
	});

	it("fails on zero keyboard tests", () => {
		const r = checkResults({ ...good(), keyboard: { suites: [], errors: [] } });
		expect(r.problems).toContain("keyboard: zero tests executed");
		const allSkipped = { suites: [{ specs: [spec("x", "skipped")] }] };
		expect(
			checkResults({ ...good(), keyboard: allSkipped }).problems,
		).toContain("keyboard: zero tests executed");
	});

	it("fails on a failing vscode-test test, including a failing hook", () => {
		const input = good();
		input.vscode["hostile-links"] = mocha({
			failures: ['"before all" hook for "x"'],
		});
		const r = checkResults(input);
		expect(r.problems).toEqual([
			'vscode-test hostile-links: failed: "before all" hook for "x"',
		]);
	});

	it("fails on a skipped vscode-test test that is not a screenshot", () => {
		const input = good();
		input.vscode["cross-surface"] = mocha({ pending: ["a real test"] });
		const r = checkResults(input);
		expect(r.problems).toEqual([
			"vscode-test cross-surface: unexpected skip: a real test",
		]);
	});

	it("does not let a screenshot title excuse a skip in another config", () => {
		const input = good();
		input.vscode["hostile-links"] = mocha({ pending: [screenshots[0]] });
		const r = checkResults(input);
		expect(r.problems.join("\n")).toContain("hostile-links: unexpected skip");
	});

	it("fails when an allowed skip has gone missing, so the list cannot go stale", () => {
		const input = good();
		input.vscode.petstore = mocha({
			passes: ["p"],
			pending: screenshots.slice(1),
		});
		const r = checkResults(input);
		expect(r.ok).toBe(false);
		expect(r.problems).toEqual([
			`vscode-test petstore: allowed skip is missing from the results (renamed or removed?): ${screenshots[0]}`,
		]);
	});

	it("accepts an allowed test that ran and passed (screenshots switched on)", () => {
		const input = good();
		input.vscode.petstore = mocha({ passes: ["p", ...screenshots] });
		expect(checkResults(input).problems).toEqual([]);
	});

	it("fails on keyboard failures, flaky passes, skips and run errors", () => {
		const keyboard = {
			suites: [
				{
					title: "f.spec.ts",
					specs: [
						spec("ok", "expected"),
						spec("bad", "unexpected"),
						spec("shaky", "flaky"),
						spec("skipped", "skipped"),
					],
				},
			],
			errors: [{ message: "global setup blew up" }, {}],
		};
		const r = checkResults({ ...good(), keyboard });
		expect(r.problems).toEqual([
			"keyboard: failed: f.spec.ts > bad",
			"keyboard: flaky (passed only on retry): f.spec.ts > shaky",
			"keyboard: unexpected skip: f.spec.ts > skipped",
			"keyboard: run error: global setup blew up",
			"keyboard: run error: {}",
		]);
		expect(r.summary.keyboard).toEqual({
			executed: 3,
			passed: 1,
			failed: 1,
			flaky: 1,
			other: 0,
			skipped: 1,
		});
	});

	it("rejects allowed skips that name a config that does not exist", () => {
		const r = checkResults({
			...good(),
			allowedSkips: { ...ALLOWED_SKIPS, ghost: ["x"] },
		});
		expect(r.problems).toContain("allowed skips name an unknown config: ghost");
	});

	it("rejects a mocha record that lacks the retry information", () => {
		const input = good();
		input.vscode.petstore = { passes: [pass("p")], pending: [], failures: [] };
		const r = checkResults({ ...input, allowedSkips: {} });
		expect(r.problems[0]).toContain("petstore: unrecognised results file");
	});
});

describe("playwrightTests", () => {
	it("walks nested suites and titles each test by its path", () => {
		const tests = playwrightTests({
			suites: [
				{
					title: "a.ts",
					suites: [
						{
							title: "outer",
							suites: [{ title: "inner", specs: [spec("t", "expected")] }],
						},
					],
				},
				{ specs: [spec("bare", "skipped")] },
			],
		});
		expect(tests.map((t) => ({ title: t.title, status: t.status }))).toEqual([
			{ title: "a.ts > outer > inner > t", status: "expected" },
			{ title: "bare", status: "skipped" },
		]);
		expect(playwrightTests({})).toEqual([]);
	});
});

describe("renderSummary", () => {
	it("lists counts per suite and config, the allowed skips by name, version and image", () => {
		const md = renderSummary(checkResults(good()), {
			image: "ubuntu24 20260901.1",
		});
		expect(md).toContain("Result: passed.");
		expect(md).toContain("VS Code: 1.96.4");
		expect(md).toContain("Runner image: ubuntu24 20260901.1");
		expect(md).toContain("| vscode-test | petstore | 2 | 2 | 0 | 4 |");
		expect(md).toContain("| keyboard | journeys and smoke | 2 | 2 | 0 | 0 |");
		expect(md).toContain(`- petstore: ${screenshots[1]}`);
		expect(md).not.toContain("### Problems");
	});

	it("lists problems when it failed, and says when nothing was skipped", () => {
		const input = good();
		input.vscode.petstore = mocha({ passes: ["a", ...screenshots] });
		input.keyboard = undefined;
		const md = renderSummary(checkResults(input));
		expect(md).toContain("Result: **failed**.");
		expect(md).toContain("None were skipped.");
		expect(md).toContain("Runner image: unknown");
		expect(md).toContain("- keyboard: no results");
	});
});

describe("loadResults", () => {
	it("reads the files a results directory holds and treats bad or absent ones as missing", () => {
		const dir = mkdtempSync(join(tmpdir(), "ods-results-"));
		mkdirSync(dir, { recursive: true });
		writeFileSync(
			join(dir, "vscode-test-petstore.json"),
			JSON.stringify(mocha()),
		);
		writeFileSync(join(dir, "vscode-test-hostile-links.json"), "{ not json");
		writeFileSync(join(dir, "keyboard.json"), JSON.stringify(goodKeyboard()));
		const r = loadResults(dir);
		expect(Object.keys(r.vscode)).toEqual(VSCODE_TEST_CONFIGS);
		expect(r.vscode.petstore.passes).toHaveLength(1);
		expect(r.vscode["hostile-links"]).toBeUndefined();
		expect(r.vscode["cross-surface"]).toBeUndefined();
		expect(r.vscode.writer).toBeUndefined();
		expect(r.keyboard.errors).toEqual([]);
	});
});
