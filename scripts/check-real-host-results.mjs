#!/usr/bin/env node
// Reads what the two real-VS-Code suites wrote and decides whether the run may
// count as green. A suite's own exit code is not enough: a run that could not
// start, executed nothing, or skipped tests quietly can still exit 0, and a
// green check that tested nothing is worse than a red one.
//
//   node scripts/check-real-host-results.mjs <results-dir> \
//     [--vscode-outcome=<success|failure|...>] [--keyboard-outcome=<...>]
//
// <results-dir> holds what `ODS_RESULTS_DIR` made the suites write:
//   vscode-test-<config>.json   one per `.vscode-test.mjs` config (mocha)
//   keyboard.json               Playwright's JSON report
//
// Exit 0 only when there are no problems. The markdown summary goes to
// $GITHUB_STEP_SUMMARY when that is set, and always to stdout.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const VSCODE_VERSION = "1.96.4";

/** The `.vscode-test.mjs` configs; each must have reported. */
export const VSCODE_TEST_CONFIGS = [
	"petstore",
	"hostile-links",
	"cross-surface",
	"multi",
	"writer",
];

/**
 * The only tests allowed to be skipped, by full title: the marketplace
 * screenshots, which run only with ODS_SCREENSHOTS=1. Each must show up as
 * skipped in its config, so a rename or a removal fails the check and the list
 * cannot go stale without somebody noticing.
 */
export const ALLOWED_SKIPS = {
	petstore: [
		"ODS extension in a real VS Code window marketplace screenshots captures the Workspaces tree beside a page",
		"ODS extension in a real VS Code window marketplace screenshots captures an aggregate page",
		"ODS extension in a real VS Code window marketplace screenshots captures the search spotlight",
		"ODS extension in a real VS Code window marketplace screenshots captures a bounded context and its context map in dark mode",
	],
};

/** Every test in a Playwright JSON report, flattened. */
export function playwrightTests(report) {
	const out = [];
	const walk = (suite, titles) => {
		const here = suite.title ? [...titles, suite.title] : titles;
		for (const spec of suite.specs ?? [])
			for (const test of spec.tests ?? [])
				out.push({
					title: [...here, spec.title].join(" > "),
					status: test.status,
					expectedStatus: test.expectedStatus,
					results: test.results,
				});
		for (const child of suite.suites ?? []) walk(child, here);
	};
	for (const suite of report.suites ?? []) walk(suite, []);
	return out;
}

/**
 * What one Playwright test amounts to. `status` is the outcome against what the
 * test expected, so a `test.fail()` test that fails is "expected" with an
 * `expectedStatus` of "failed"; a journey is a pass only when it was expected to
 * pass and its one attempt did. Anything not recognised is "unrecognised", never
 * a pass.
 */
export function classifyPlaywrightTest(t) {
	if (t.status === "skipped") return "skipped";
	if (t.status === "unexpected") return "failed";
	if (t.status === "flaky") return "flaky";
	if (t.status !== "expected") return "unrecognised";
	if (t.expectedStatus === "failed") return "expected-failure";
	if (t.expectedStatus !== "passed") return "unrecognised";
	if (!Array.isArray(t.results) || t.results.length === 0)
		return "unrecognised";
	if (t.results.length > 1) return "flaky";
	return t.results[0]?.status === "passed" ? "passed" : "unrecognised";
}

const KEYBOARD_REASON = {
	failed: "failed",
	flaky: "flaky (passed only on retry)",
	"expected-failure": "an expected failure (test.fail) is not a pass",
	skipped: "unexpected skip",
	unrecognised: "unrecognised result, not counted as a pass",
};

const isEntryList = (list) =>
	Array.isArray(list) &&
	list.every(
		(e) => e && typeof e === "object" && typeof e.fullTitle === "string",
	);

/**
 * @param {{
 *   vscode: Record<string, object | undefined>,
 *   keyboard: object | undefined,
 *   outcomes?: { vscode?: string, keyboard?: string },
 *   allowedSkips?: Record<string, string[]>,
 *   configs?: string[],
 * }} input  Parsed reports; a missing one is `undefined`.
 */
export function checkResults(input) {
	const allowed = input.allowedSkips ?? ALLOWED_SKIPS;
	const configs = input.configs ?? VSCODE_TEST_CONFIGS;
	const problems = [];
	const summary = { vscode: {}, keyboard: undefined, allowedSkips: [] };

	for (const [suite, outcome] of Object.entries(input.outcomes ?? {}))
		if (outcome !== undefined && outcome !== "success")
			problems.push(`the ${suite} suite step ended ${outcome || "unknown"}`);

	for (const label of configs) {
		const report = input.vscode[label];
		if (!report) {
			problems.push(
				`vscode-test ${label}: no results (VS Code did not download, start or finish)`,
			);
			continue;
		}
		if (
			![report.passes, report.pending, report.failures, report.retried].every(
				isEntryList,
			) ||
			report.passes.some((p) => !Number.isInteger(p.retries))
		) {
			problems.push(
				`vscode-test ${label}: unrecognised results file (passes, pending, failures or retried missing or malformed)`,
			);
			continue;
		}
		const { pending, failures, retried } = report;
		const retriedTitles = new Set([
			...retried.map((r) => r.fullTitle),
			...report.passes.filter((p) => p.retries > 0).map((p) => p.fullTitle),
		]);
		const passes = report.passes.filter((p) => !retriedTitles.has(p.fullTitle));
		const executed = report.passes.length + failures.length;
		summary.vscode[label] = {
			executed,
			passed: passes.length,
			failed: failures.length + (report.passes.length - passes.length),
			skipped: pending.length,
		};
		if (executed === 0)
			problems.push(`vscode-test ${label}: zero tests executed`);
		for (const f of failures)
			problems.push(`vscode-test ${label}: failed: ${f.fullTitle}`);
		for (const title of retriedTitles)
			if (!failures.some((f) => f.fullTitle === title))
				problems.push(
					`vscode-test ${label}: passed only after a retry: ${title}`,
				);
		const allow = new Set(allowed[label] ?? []);
		const skipped = new Set(pending.map((p) => p.fullTitle));
		for (const title of skipped)
			if (!allow.has(title))
				problems.push(`vscode-test ${label}: unexpected skip: ${title}`);
		for (const title of allow) {
			if (skipped.has(title))
				summary.allowedSkips.push({ config: label, title });
			else if (!passes.some((p) => p.fullTitle === title))
				problems.push(
					`vscode-test ${label}: allowed skip is missing from the results (renamed or removed?): ${title}`,
				);
		}
	}
	for (const label of Object.keys(allowed))
		if (!configs.includes(label))
			problems.push(`allowed skips name an unknown config: ${label}`);

	const kb = input.keyboard;
	if (!kb) {
		problems.push(
			"keyboard: no results (VS Code did not download, start or finish)",
		);
	} else {
		const tests = playwrightTests(kb).map((t) => ({
			...t,
			kind: classifyPlaywrightTest(t),
		}));
		const count = (k) => tests.filter((t) => t.kind === k).length;
		summary.keyboard = {
			executed:
				count("passed") +
				count("failed") +
				count("flaky") +
				count("expected-failure"),
			passed: count("passed"),
			failed: count("failed"),
			flaky: count("flaky"),
			other: count("expected-failure") + count("unrecognised"),
			skipped: count("skipped"),
		};
		if (summary.keyboard.executed === 0)
			problems.push("keyboard: zero tests executed");
		for (const t of tests)
			if (t.kind !== "passed")
				problems.push(`keyboard: ${KEYBOARD_REASON[t.kind]}: ${t.title}`);
		for (const e of kb.errors ?? [])
			problems.push(`keyboard: run error: ${e.message ?? JSON.stringify(e)}`);
	}

	return { ok: problems.length === 0, problems, summary };
}

/** The markdown for $GITHUB_STEP_SUMMARY. */
export function renderSummary(result, env = {}) {
	const { summary, problems } = result;
	const lines = [
		"## Real VS Code suites",
		"",
		result.ok ? "Result: passed." : "Result: **failed**.",
		"",
		`- VS Code: ${env.vscodeVersion ?? VSCODE_VERSION}`,
		`- Runner image: ${env.image ?? "unknown"}`,
		"",
		"| Suite | Config | Executed | Passed | Failed | Skipped |",
		"| --- | --- | ---: | ---: | ---: | ---: |",
	];
	for (const [label, s] of Object.entries(summary.vscode))
		lines.push(
			`| vscode-test | ${label} | ${s.executed} | ${s.passed} | ${s.failed} | ${s.skipped} |`,
		);
	if (summary.keyboard) {
		const k = summary.keyboard;
		lines.push(
			`| keyboard | journeys and smoke | ${k.executed} | ${k.passed} | ${k.failed + k.flaky + k.other} | ${k.skipped} |`,
		);
	}
	lines.push("", "### Allowed skips (optional screenshot tests)", "");
	if (summary.allowedSkips.length === 0) lines.push("None were skipped.");
	for (const s of summary.allowedSkips) lines.push(`- ${s.config}: ${s.title}`);
	if (problems.length > 0) {
		lines.push("", "### Problems", "");
		for (const p of problems) lines.push(`- ${p}`);
	}
	return `${lines.join("\n")}\n`;
}

function readJson(path) {
	if (!existsSync(path)) return undefined;
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch {
		return undefined; // unreadable counts as missing
	}
}

/** Loads the reports a results directory holds. */
export function loadResults(dir, configs = VSCODE_TEST_CONFIGS) {
	const vscode = {};
	for (const label of configs)
		vscode[label] = readJson(join(dir, `vscode-test-${label}.json`));
	return { vscode, keyboard: readJson(join(dir, "keyboard.json")) };
}

function main(argv, env) {
	const flags = Object.fromEntries(
		argv.filter((a) => a.startsWith("--")).map((a) => a.slice(2).split("=")),
	);
	const dir = argv.find((a) => !a.startsWith("--"));
	if (!dir) {
		console.error(
			"usage: check-real-host-results.mjs <results-dir> [--vscode-outcome=..] [--keyboard-outcome=..]",
		);
		return 2;
	}
	const result = checkResults({
		...loadResults(resolve(dir)),
		outcomes: {
			vscode: flags["vscode-outcome"],
			keyboard: flags["keyboard-outcome"],
		},
	});
	const image = [env.ImageOS, env.ImageVersion].filter(Boolean).join(" ");
	const markdown = renderSummary(result, { image: image || undefined });
	process.stdout.write(markdown);
	if (env.GITHUB_STEP_SUMMARY)
		appendFileSync(env.GITHUB_STEP_SUMMARY, markdown);
	for (const p of result.problems) console.error(`::error::${p}`);
	return result.ok ? 0 : 1;
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
	process.exit(main(process.argv.slice(2), process.env));
