import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type Runner, reporters, type Test } from "mocha";

interface Entry {
	title: string;
	fullTitle: string;
	err?: string;
}

/**
 * The spec reporter, plus a JSON record of what ran, for CI to read. Written
 * only when `reporterOptions.output` names a file (see `.vscode-test.mjs`), so a
 * local `npm run test:vscode` prints exactly what it always did. The record is
 * what `scripts/check-real-host-results.mjs` reads to refuse a run that executed
 * nothing or skipped something it should not have.
 *
 * A test a hook skips with `this.skip()` is reported through `pending`, so the
 * pending list here is the real list of skips.
 */
export = class ResultsReporter extends reporters.Spec {
	constructor(
		runner: Runner,
		options: { reporterOptions?: { output?: string } },
	) {
		super(runner, options as never);
		const output = options.reporterOptions?.output;
		if (!output) return;
		const passes: Entry[] = [];
		const pending: Entry[] = [];
		const failures: Entry[] = [];
		const entry = (test: Test, err?: Error): Entry => ({
			title: test.title,
			fullTitle: test.fullTitle(),
			...(err ? { err: err.stack ?? String(err) } : {}),
		});
		runner.on("pass", (test) => passes.push(entry(test)));
		runner.on("pending", (test) => pending.push(entry(test)));
		runner.on("fail", (test, err) => failures.push(entry(test, err)));
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
						},
						passes,
						pending,
						failures,
					},
					null,
					2,
				),
			);
		});
	}
};
