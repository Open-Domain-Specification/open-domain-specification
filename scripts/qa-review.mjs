#!/usr/bin/env node
// QA triage for cards in the review column of every RepoDoc board.
// For each card: unchecked checklist items are findings; journal paths that no
// longer exist are listed as stale (history is kept, files move on). Exit 1
// when any card has a finding, so it can run before a QA round.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const boards = readdirSync(join(root, "boards"), { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name);

const PATH_RE = /(?<![\w/@.-])((?:apps|packages|models|decisions|docs|boards|scripts|\.github)\/[\w./@-]+?)(?=:\d|[\s,;)`>]|$)/g;

let findings = 0;
const rows = [];
for (const board of boards) {
	for (const file of readdirSync(join(root, "boards", board)).sort()) {
		if (!file.endsWith(".md")) continue;
		const text = readFileSync(join(root, "boards", board, file), "utf8");
		const fm = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
		const column = fm.match(/^column:\s*(\S+)/m)?.[1];
		if (column !== "review") continue;
		const title = text.match(/^# (.+)$/m)?.[1] ?? file;
		const unchecked = (text.match(/^- \[ \] /gm) ?? []).length;
		const swept = /^clean-code-swept:\s*true/m.test(fm);
		const paths = new Set();
		for (const m of text.matchAll(PATH_RE)) paths.add(m[1].replace(/[.,]$/, ""));
		const missing = [...paths].filter((p) => !existsSync(join(root, p)));
		const problems = [];
		if (unchecked) problems.push(`${unchecked} unchecked`);
		if (problems.length) findings++;
		rows.push({ board, file, title, problems, missing, refs: paths.size });
	}
}

for (const r of rows) {
	const flag = r.problems.length ? "!!" : "ok";
	console.log(`${flag} ${r.board}/${r.file} — ${r.title} [${r.refs} refs]${r.problems.length ? "\n     " + r.problems.join("; ") : ""}`);
	if (r.missing.length) console.log(`     stale refs (files since moved or removed): ${r.missing.join(", ")}`);
}
console.log(`\n${rows.length} cards in review, ${findings} with findings`);
process.exit(findings ? 1 : 0);
