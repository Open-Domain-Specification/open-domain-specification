import {
	Workspace,
	type WorkspaceSchema,
	WorkspaceSet,
} from "@open-domain-specification/core";

/**
 * Small sets for the specs that need a folder shaped a particular way: nested
 * sibling folders that name each other through `..`, and file names that need
 * encoding. Every team has the same local ids (a `ledger` with a `post`), so a
 * link that lands on the wrong file shows as the wrong workspace name on the
 * page it opens.
 */
function team(name: string) {
	const ws = new Workspace(name, { description: `${name} team`, version: "1" });
	const sub = ws
		.addDomain("Bank", { description: "" })
		.addSubdomain("Core", { type: "core", description: "" });
	const ledger = sub.addBoundedcontext("Ledger", { description: "" });
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

/** Each team's Account consumes the next team's Post, and the last the first's: a cycle through every file. */
function ring(entries: Array<[string, string]>) {
	const teams = entries.map(([, name]) => team(name));
	teams.forEach((t, i) => {
		t.account.consumes(teams[(i + 1) % teams.length].post, {});
	});
	const set = WorkspaceSet.fromWorkspaces(
		entries.map(([file], i) => [file, teams[i].ws] as [string, Workspace]),
	);
	return { teams, set };
}

export type Folder = {
	/** The raw path of each file and its JSON, in the order a folder lists them. */
	files: Array<[string, WorkspaceSchema]>;
	set: WorkspaceSet;
	teams: ReturnType<typeof team>[];
};

const folderOf = (entries: Array<[string, string]>): Folder => {
	const { teams, set } = ring(entries);
	return {
		files: [...set.toSchemas()].map(([file, schema]) => [
			file,
			JSON.parse(JSON.stringify(schema)),
		]),
		set,
		teams,
	};
};

/** Sibling folders that name each other: `a/team.json` consumes `../b/team.json`, and back. */
export const nestedFolder = () =>
	folderOf([
		["a/team.json", "Team A"],
		["b/team.json", "Team B"],
	]);

/** File names with a space, `#`, `%`, a non-ASCII letter and a nested non-ASCII folder. */
export const encodedFolder = () =>
	folderOf([
		["a#%.json", "Team Hash"],
		["my team.json", "Team Space"],
		["ü/é.json", "Team Accent"],
		["a%41.json", "Team Percent"],
	]);
