/*
 * The "CX" fixture of colliding ids, as the reader tests use it: two complete
 * team workspaces whose local ids are all the same, linked through every one of
 * the metamodel's file-qualified carriers. It is the same shape the core suite
 * holds the resolver to, built through the public DSL, so a page that reads one
 * file's `ledger` as the other's shows here. Test support, not product code.
 */
import {
	Workspace,
	type WorkspaceSchema,
	WorkspaceSet,
} from "@open-domain-specification/core";
import type { WorkspacePayload } from "../protocol";

/**
 * One complete team workspace carrying every kind of element a `$ref` can
 * name, and the same local ids as every other team built here: the "CX"
 * fixture of colliding ids. Nothing in it links outside its own file.
 */
export function side(name: string) {
	const ws = new Workspace(name, { description: "", version: "test" });
	const domain = ws.addDomain("Bank", { description: "" });
	const sub = domain.addSubdomain("Core", { type: "core", description: "" });
	const team = ws.addTeam("Platform", {});
	const ledger = sub.addBoundedcontext("Ledger", { description: "" });
	const risk = sub.addBoundedcontext("Risk", { description: "" });

	const receipt = ledger.addSchema("Receipt");
	const decline = ledger.addSchema("Decline");
	const money = ledger.addValueObject("Money", { description: "" });
	const moneyValue = money.addAttribute("Value", { type: "number" });
	const payments = ledger.addService("Payments", {
		description: "",
		type: "application",
	});
	const post = payments.provides("Post", {
		description: "",
		type: "operation",
		returns: receipt,
		rejects: [decline],
	});
	const posted = payments.provides("Posted", {
		description: "",
		type: "event",
	});
	const account = ledger.addAggregate("Account", { description: "" });
	const root = account.addEntity("Account", { description: "", root: true });
	const rootId = root.addAttribute("Id", { type: "string", identity: true });
	const line = account.addEntity("Line", { description: "" });
	const balanced = account.addInvariant("Balanced", { description: "" });
	const term = ledger.addTerm("Ledger", { definition: "A book of accounts" });
	const react = risk.addPolicy("React", { description: "" });
	const settle = risk.addProcess("Settle", { description: "" });
	const late = settle.addDeadline("Late", { description: "", after: "1 day" });
	// The agreement of this team's own two contexts, the one its consumptions
	// may name.
	const agreement = ledger.upstreamOf(risk, { description: "" });
	return {
		ws,
		domain,
		sub,
		team,
		ledger,
		risk,
		receipt,
		decline,
		money,
		moneyValue,
		payments,
		post,
		posted,
		account,
		root,
		rootId,
		line,
		balanced,
		term,
		react,
		settle,
		late,
		agreement,
	};
}

export type Side = ReturnType<typeof side>;

/**
 * Makes every one of the 27 `$ref` carriers of the metamodel point from `from`
 * into `to`, where every id is the one the other file has too, and returns
 * what it made so a test can name each.
 */
export function linkAllCarriers(from: Side, to: Side) {
	// An operation of `to` that refuses with a schema of `from`: the answer
	// that needs a file named in its own ref.
	const cross = to.payments.provides("Cross", {
		description: "",
		type: "operation",
		rejects: [from.decline],
	});
	// 1-3: attribute.valueobject, attribute.schema, attribute.identifies.
	const byValue = from.line.addAttribute("Amount", {
		type: "Money",
		valueobject: to.money,
	});
	const bySchema = from.line.addAttribute("Doc", {
		type: "Receipt",
		schema: to.receipt,
	});
	const byIdentity = from.line.addAttribute("Owner", {
		type: "string",
		identifies: to.root,
	});
	// 4: glossary.embodiedBy.
	const foreignTerm = from.ledger.addTerm("Elsewhere", {
		definition: "A term another team embodies",
	});
	foreignTerm.embody(to.root);
	// 5-6: policy.on (an event and a refusal answer), policy.then.
	from.react.on(to.posted, cross.rejected(from.decline));
	from.react.issues(to.post);
	// 7-11: process.starts, on, then, ends and a deadline anchored to a
	// trigger of the other file.
	from.settle.starts(to.posted);
	from.settle.on(to.posted, to.post.returned());
	from.settle.issues(to.post);
	from.settle.ends(to.post.rejected(to.decline));
	const soon = from.settle.addDeadline("Soon", {
		description: "",
		after: "1h",
	});
	soon.countsFrom(to.posted);
	// 12-13: context.subdomains and context.team.
	from.risk.serves(to.sub);
	from.risk.ownedBy(to.team);
	// 14-17: consumable.schema, returns, rejects, raises.
	const fx = from.payments.provides("Fx", {
		description: "",
		type: "operation",
		schema: to.receipt,
		returns: to.receipt,
		rejects: [to.decline],
	});
	fx.raises(to.posted);
	// 21-23: relationship.upstream, downstream and participants.
	const down = from.ledger.upstreamOf(to.ledger, { description: "" });
	const up = from.ws.addRelationship({
		type: "upstream-downstream",
		upstream: to.risk,
		downstream: from.risk,
		description: "",
	});
	const together = from.ledger.partnerOf(to.risk, { description: "" });
	// 18-20: consumption.consumable, by and relationship.
	const consumption = from.account.consumes(to.post, {
		by: [to.post],
		relationship: to.agreement,
	});
	// 24-25: entity.specialises and relation.target.
	const kind = from.account.addEntity("Kind", {
		description: "",
		specialises: to.root,
	});
	const relation = from.line.addRelation(to.root, { relation: "references" });
	// 26: invariant.constrains.
	from.balanced.constrains(to.rootId);
	// 27: valueobject.specialises.
	const fiat = from.ledger.addValueObject("Fiat", {
		description: "",
		specialises: to.money,
	});
	return {
		cross,
		byValue,
		bySchema,
		byIdentity,
		foreignTerm,
		soon,
		fx,
		down,
		up,
		together,
		consumption,
		kind,
		relation,
		fiat,
	};
}

/** Two teams, `a` linking into `b` with every carrier and `b` back into `a` with a few. */
export function linkedPair() {
	const a = side("Team A");
	const b = side("Team B");
	const links = linkAllCarriers(a, b);
	// The file cycle: b refers back to a.
	b.react.on(a.posted);
	b.ledger.downstreamOf(a.risk, { description: "" });
	const set = WorkspaceSet.fromWorkspaces([
		["a.json", a.ws],
		["b.json", b.ws],
	]);
	return { a, b, links, set };
}

/** The files of a set as plain JSON, as a host would hold them. */
export function filesOf(set: WorkspaceSet): Array<[string, WorkspaceSchema]> {
	return [...set.toSchemas()].map(([file, schema]) => [
		file,
		JSON.parse(JSON.stringify(schema)),
	]);
}

/** The two files as the payloads a host hands the app, in the order a folder lists them. */
export function cxPayloads(): WorkspacePayload[] {
	const { set } = linkedPair();
	return filesOf(set).map(([file, schema]) => ({
		schema,
		fileLabel: file,
		path: file,
		set: "cx",
	}));
}
