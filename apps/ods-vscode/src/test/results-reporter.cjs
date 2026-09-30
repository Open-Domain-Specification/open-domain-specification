// The spec reporter, plus a JSON record of what ran, for CI to read. Written
// only when `reporterOptions.output` names a file (see `.vscode-test.mjs`), so a
// local `npm run test:vscode` prints exactly what it always did. The record is
// what `scripts/check-real-host-results.mjs` reads to refuse a run that executed
// nothing, skipped something it should not have, or passed only on a retry.
//
// Plain CommonJS and not compiled: `scripts/` tests run it under a real Mocha
// without a build. A test a hook skips with `this.skip()` is reported through
// `pending`, so the pending list is the real list of skips. Mocha emits `retry`,
// not `fail`, for an attempt it will repeat, so retries are recorded on their
// own (`retried`) and as `retries` on each pass.
const { dirname } = require("node:path");
const { mkdirSync, writeFileSync } = require("node:fs");

// The Mocha this runs under is the one @vscode/test-cli bundles (11.x, CommonJS);
// the `mocha` the extension lists is 12, an ES module the extension host cannot
// `require`. Take the spec reporter from the runner's own copy.
const testCli = require.resolve("@vscode/test-cli");
const Spec = require(
	require.resolve("mocha/lib/reporters/spec.js", { paths: [dirname(testCli)] }),
);

module.exports = class ResultsReporter extends Spec {
	constructor(runner, options) {
		super(runner, options);
		const output = options?.reporterOptions?.output;
		if (!output) return;
		const passes = [];
		const pending = [];
		const failures = [];
		const retried = [];
		const entry = (test, err) => ({
			title: test.title,
			fullTitle: test.fullTitle(),
			retries: test.currentRetry(),
			...(err ? { err: err.stack ?? String(err) } : {}),
		});
		runner.on("pass", (test) => passes.push(entry(test)));
		runner.on("pending", (test) => pending.push(entry(test)));
		runner.on("fail", (test, err) => failures.push(entry(test, err)));
		runner.on("retry", (test, err) => retried.push(entry(test, err)));
		runner.once("end", () => {
			mkdirSync(dirname(output), { recursive: true });
			writeFileSync(
				output,
				JSON.stringify(
					{
						stats: {
							passes: passes.length,
							pending: pending.length,
							failures: failures.length,
							retried: retried.length,
						},
						passes,
						pending,
						failures,
						retried,
					},
					null,
					2,
				),
			);
		});
	}
};
