import { Workspace, WorkspaceSet } from "@open-domain-specification/core";

/**
 * One workspace of the same-ids fixture: every team in it has a domain Bank, a
 * context Ledger with a service Payments and an aggregate Account, and a
 * context Risk with a policy. Two of them agree on every local id.
 */
function side(name: string) {
	const ws = new Workspace(name, { description: "", version: "test" });
	const domain = ws.addDomain("Bank", { description: "" });
	const sub = domain.addSubdomain("Core", { type: "core", description: "" });
	const ledger = sub.addBoundedcontext("Ledger", { description: "" });
	const risk = sub.addBoundedcontext("Risk", { description: "" });
	const payments = ledger.addService("Payments", {
		description: "",
		type: "application",
	});
	const post = payments.provides("Post", {
		description: "",
		type: "operation",
	});
	const posted = payments.provides("Posted", {
		description: "",
		type: "event",
	});
	const account = ledger.addAggregate("Account", { description: "" });
	const root = account.addEntity("Account", { description: "", root: true });
	root.addAttribute("Id", { type: "string", identity: true });
	const line = account.addEntity("Line", { description: "" });
	const react = risk.addPolicy("React", { description: "" });
	return {
		ws,
		ledger,
		risk,
		payments,
		post,
		posted,
		account,
		root,
		line,
		react,
	};
}

/**
 * Two files, `a.json` and `team b/ü.json`, with the same local ids, joined by
 * a consumption of B's Post by A's Account, a policy of A reacting to B's
 * Posted and a relationship between A's Ledger and B's Ledger.
 */
export function collidingSet() {
	const a = side("Team A");
	const b = side("Team B");
	a.account.consumes(b.post, {});
	a.react.on(b.posted);
	a.line.addRelation(b.root, { relation: "references" });
	b.line.addRelation(b.root, { relation: "references" });
	b.ledger.upstreamOf(a.ledger, { description: "" });
	const set = WorkspaceSet.fromWorkspaces([
		["a.json", a.ws],
		["team b/ü.json", b.ws],
	]);
	return { a, b, set };
}
