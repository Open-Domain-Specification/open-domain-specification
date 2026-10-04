import {
	Workspace,
	type WorkspaceSchema,
	WorkspaceSet,
} from "@open-domain-specification/core";

/**
 * Three complete team workspaces as a host would hold them: `a.json` provides
 * an operation and an event, `b.json` is a downstream team that has not yet
 * consumed anything, `c.json` is unrelated to both. Built with the DSL as one
 * set so every cross-file ref is written the way core writes it.
 */
export function teamSet() {
	const a = new Workspace("Team A", { description: "A", version: "1" });
	const aDomain = a.addDomain("Bank", { description: "" });
	const aSub = aDomain.addSubdomain("Core", { type: "core", description: "" });
	const ledger = aSub.addBoundedcontext("Ledger", { description: "ledger" });
	const risk = aSub.addBoundedcontext("Risk", { description: "risk" });
	const payments = ledger.addService("Payments", {
		description: "",
		type: "application",
	});
	const decline = ledger.addSchema("Decline");
	const post = payments.provides("Post", {
		description: "",
		type: "operation",
		rejects: [decline],
	});
	const posted = payments.provides("Posted", {
		description: "",
		type: "event",
	});

	const b = new Workspace("Team B", { description: "B", version: "1" });
	const bDomain = b.addDomain("Retail", { description: "" });
	const bSub = bDomain.addSubdomain("Shop", { type: "core", description: "" });
	const claims = bSub.addBoundedcontext("Claims", { description: "claims" });
	const orders = bSub.addBoundedcontext("Orders", { description: "orders" });
	const account = claims.addAggregate("Account", { description: "" });
	account.addEntity("Account", { description: "", root: true });
	b.addRelationship({
		type: "upstream-downstream",
		upstream: ledger,
		downstream: claims,
		description: "claims follow the ledger",
	});

	const c = new Workspace("Team C", { description: "C", version: "1" });
	const cDomain = c.addDomain("Ops", { description: "" });
	const cSub = cDomain.addSubdomain("Run", { type: "core", description: "" });
	cSub.addBoundedcontext("Depot", { description: "depot" });

	const set = WorkspaceSet.fromWorkspaces([
		["a.json", a],
		["b.json", b],
		["c.json", c],
	]);
	return {
		set,
		a,
		b,
		c,
		ledger,
		risk,
		post,
		posted,
		/** An answer: a view of `post`'s rejection, in the model but not a place in the file. */
		answer: post.rejected(decline),
		claims,
		orders,
		account,
		/** The ref `b.json` writes for an element of `a.json`. */
		fromB: (element: { ref: string }) => set.refTo(b, element),
	};
}

export const asText = (schema: WorkspaceSchema, extra: object = {}): string =>
	`${JSON.stringify({ ...extra, ...schema }, null, 2)}\n`;

/** The three files as JSON text, `a.json` carrying a `$schema` the writer must keep. */
export function teamTexts(): Record<string, string> {
	const { set } = teamSet();
	const out: Record<string, string> = {};
	for (const [file, schema] of set.toSchemas())
		out[file] = asText(
			schema,
			file === "a.json" ? { $schema: "./schema.json" } : {},
		);
	return out;
}
