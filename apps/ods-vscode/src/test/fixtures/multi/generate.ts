/**
 * Writes `.ods/`, a folder of three team workspaces that the extension reads as
 * one set: file names that need encoding (`a#%.json`, `my team.json`, a nested
 * `ü/é.json`), the same local ids in every file (each has a `ledger` that
 * provides a `post`), and a ring of file-qualified consumptions through all
 * three, so a link that lands on the wrong file shows as the wrong team.
 *
 * Run from the repository root:
 * `node apps/ods-vscode/src/test/fixtures/multi/generate.ts`.
 * The JSON is committed, never edited by hand. Given a folder as its argument,
 * the script writes there instead, which is how `src/multi-fixture.test.ts`
 * checks that the committed JSON is still what this script writes.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Workspace, WorkspaceSet } from "@open-domain-specification/core";

const TEAMS: Array<[file: string, name: string]> = [
	["a#%.json", "Team Hash"],
	["my team.json", "Team Space"],
	["ü/é.json", "Team Accent"],
];

function team(name: string) {
	const ws = new Workspace(name, {
		description: `${name} owns a ledger.`,
		version: "1",
	});
	const sub = ws
		.addDomain("Bank", { description: "" })
		.addSubdomain("Core", { type: "core", description: "" });
	const ledger = sub.addBoundedcontext("Ledger", {
		description: `${name}'s ledger`,
	});
	const payments = ledger.addService("Payments", {
		description: "",
		type: "application",
	});
	const post = payments.provides("Post", {
		description: "",
		type: "operation",
	});
	const account = ledger.addAggregate("Account", { description: "" });
	account.addEntity("Account", { description: "", root: true });
	return { ws, ledger, post, account };
}

const teams = TEAMS.map(([, name]) => team(name));
// Each team's Account consumes the next team's Post, and the last the first's.
teams.forEach((t, i) => {
	t.account.consumes(teams[(i + 1) % teams.length].post, {});
});
const set = WorkspaceSet.fromWorkspaces(
	TEAMS.map(([file], i) => [file, teams[i].ws] as [string, Workspace]),
);

const out =
	process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), ".ods");
for (const [file, schema] of set.toSchemas()) {
	const target = join(out, ...file.split("/"));
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, `${JSON.stringify(schema, null, "\t")}\n`);
}
