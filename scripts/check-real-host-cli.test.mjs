import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
	ALLOWED_SKIPS,
	VSCODE_TEST_CONFIGS,
} from "./check-real-host-results.mjs";

const script = join(import.meta.dirname, "check-real-host-results.mjs");
const run = (args, env = {}) =>
	spawnSync(process.execPath, [script, ...args], {
		encoding: "utf8",
		env: { ...process.env, GITHUB_STEP_SUMMARY: "", ...env },
	});
const tmp = () => mkdtempSync(join(tmpdir(), "ods-results-"));
const entry = (fullTitle) => ({ title: fullTitle, fullTitle });

describe("check-real-host-results.mjs on the command line", () => {
	it("exits 1 and names the problem when the results directory is empty", () => {
		const r = run([tmp()]);
		expect(r.status).toBe(1);
		expect(r.stderr).toContain("::error::keyboard: no results");
		expect(r.stdout).toContain("Result: **failed**.");
	});

	it("exits 0 for a complete run and writes the step summary", () => {
		const dir = tmp();
		for (const label of VSCODE_TEST_CONFIGS)
			writeFileSync(
				join(dir, `vscode-test-${label}.json`),
				JSON.stringify({
					passes: [entry("a test")],
					pending: (ALLOWED_SKIPS[label] ?? []).map(entry),
					failures: [],
				}),
			);
		writeFileSync(
			join(dir, "keyboard.json"),
			JSON.stringify({
				suites: [{ specs: [{ title: "t", tests: [{ status: "expected" }] }] }],
				errors: [],
			}),
		);
		const summary = join(dir, "summary.md");
		const r = run(
			[dir, "--vscode-outcome=success", "--keyboard-outcome=success"],
			{
				GITHUB_STEP_SUMMARY: summary,
				ImageOS: "ubuntu24",
				ImageVersion: "1.2",
			},
		);
		expect(r.status).toBe(0);
		expect(readFileSync(summary, "utf8")).toContain(
			"Runner image: ubuntu24 1.2",
		);
	});

	it("exits 1 when a suite's own step failed", () => {
		expect(run([tmp(), "--vscode-outcome=failure"]).stderr).toContain(
			"the vscode suite step ended failure",
		);
	});

	it("exits 2 without a results directory", () => {
		expect(run([]).status).toBe(2);
	});
});
