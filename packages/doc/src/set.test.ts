import {
	ODSConsumptionGraph,
	setKeyOf,
	Workspace,
	WorkspaceSet,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { pathToIndexMd, placed, toDoc, toDocSet } from "./index";
import { setFolder } from "./lib/path";
import {
	brokenLinks,
	linkDestinations,
	northbankSet,
	resolveLink,
} from "./set.support";

/**
 * One file of the same-ids fixture. Every side has a domain Bank, contexts
 * Ledger and Risk, a service Payments and an aggregate Account: the ids two
 * teams who never met would pick.
 */
function side(name: string, said: string) {
	const ws = new Workspace(name, { description: said, version: "1.0.0" });
	const domain = ws.addDomain("Bank", { description: `${said} bank` });
	const sub = domain.addSubdomain("Core", {
		type: "core",
		description: `${said} core`,
	});
	const ledger = sub.addBoundedcontext("Ledger", {
		description: `${said} ledger`,
	});
	const risk = sub.addBoundedcontext("Risk", { description: `${said} risk` });
	const payments = ledger.addService("Payments", {
		description: `${said} payments`,
		type: "application",
	});
	const post = payments.provides("Post", {
		description: "",
		type: "operation",
	});
	const account = ledger.addAggregate("Account", {
		description: `${said} account`,
	});
	account
		.addEntity("Account", { description: "", root: true })
		.addAttribute("Id", { type: "string", identity: true });
	return { ws, ledger, risk, payments, post, account };
}

const FILE_A = "a.json";
const FILE_B = "team b/ü#%.json";

function colliding() {
	const a = side("Team A", "A's");
	const b = side("Team B", "B's");
	a.account.consumes(b.post, {});
	b.ledger.upstreamOf(a.ledger, { description: "B feeds A" });
	const set = WorkspaceSet.fromWorkspaces([
		[FILE_A, a.ws],
		[FILE_B, b.ws],
	]);
	return { a, b, set };
}

/** The link destinations of a page, each resolved to the file it names. */
const targetsOf = (docs: Record<string, string>, page: string) =>
	linkDestinations(docs[page]).map((it) => resolveLink(page, it));

describe("toDocSet", () => {
	it("writes the pages of two same-id contexts to two folders, one for each file, and a page of its own for neither elsewhere", async () => {
		const { a, b, set } = colliding();
		const docs = await toDocSet(set);
		const ledgerA = pathToIndexMd(placed(a.ledger));
		const ledgerB = pathToIndexMd(placed(b.ledger));
		expect(ledgerA).toBe("a.json/boundedcontexts/ledger/index.md");
		expect(ledgerB).toBe(
			`${setFolder(FILE_B)}/boundedcontexts/ledger/index.md`,
		);
		expect(docs[ledgerA]).toContain("A's ledger");
		expect(docs[ledgerA]).not.toContain("B's ledger");
		expect(docs[ledgerB]).toContain("B's ledger");
		expect(docs[ledgerB]).not.toContain("A's ledger");
		// Nothing is written where a workspace read alone would write it.
		expect(docs["boundedcontexts/ledger/index.md"]).toBeUndefined();
		expect(docs["domains/bank/index.md"]).toBeUndefined();
		// Every page, diagram and sidebar line is in a folder of its file or at
		// the top of the site.
		const folders = new Set([setFolder(FILE_A), setFolder(FILE_B)]);
		for (const key of Object.keys(docs)) {
			if (
				["index.html", "index.md", "contextmap.svg", "_sidebar.md"].includes(
					key,
				)
			)
				continue;
			expect(
				[...folders].some((it) => key.startsWith(`${it}/`)),
				key,
			).toBe(true);
		}
	});

	it("links a consumption to the provider in the other file, and every link of the site to a file that is there", async () => {
		const { a, b, set } = colliding();
		const docs = await toDocSet(set);
		expect(brokenLinks(docs)).toEqual([]);
		const consumerPage = pathToIndexMd(placed(a.account));
		const providerPage = pathToIndexMd(placed(b.payments));
		expect(providerPage).not.toBe(pathToIndexMd(placed(a.payments)));
		const links = targetsOf(docs, consumerPage);
		expect(links).toContain(providerPage);
		expect(links).not.toContain(pathToIndexMd(placed(a.payments)));
		// The page it lands on is B's.
		expect(docs[providerPage]).toContain("B's payments");
	});

	it("links the pages of one file back to the list of workspaces, and the list to every file", async () => {
		const { a, b, set } = colliding();
		const docs = await toDocSet(set);
		const home = pathToIndexMd(placed(a.ws));
		expect(targetsOf(docs, home)).toContain("index.md");
		expect(docs[home]).toContain("> The file `a.json`, one of 2 workspaces.");
		const index = targetsOf(docs, "index.md");
		expect(index).toContain(home);
		expect(index).toContain(pathToIndexMd(placed(b.ws)));
		expect(docs["index.md"]).toContain("`team b/ü#%.json`");
		expect(docs["index.html"]).toContain('"#/index.md"');
		expect(docs["index.html"]).toContain("<title>Workspaces</title>");
	});

	it("draws one map across the files with a cluster for each, and one for each file's own contexts", async () => {
		const { set } = colliding();
		const docs = await toDocSet(set);
		const svg = docs["contextmap.svg"];
		expect(svg.match(/class="node"/g)).toHaveLength(4);
		expect(svg).toContain(">Team A<");
		expect(svg).toContain(">Team B<");
		expect(svg.match(/class="edge"/g)).toHaveLength(1);
		expect(docs["index.md"]).toContain("![contextmap](contextmap.svg)");
		expect(docs["index.md"]).toContain(
			"| Team B / Ledger | upstream-downstream | Team A / Ledger |",
		);
	});

	it("shows a relationship on the page of the context it is about even when the other file declares it", async () => {
		const { a, b, set } = colliding();
		const docs = await toDocSet(set);
		// B's Ledger declares itself upstream of A's, so the declaration is in B's file.
		expect(b.ws.relationships).toHaveLength(1);
		expect(a.ws.relationships).toHaveLength(0);
		const position = (page: string) =>
			docs[page]
				.split("## Context Relationships")[1]
				.split("## Consumptions")[0];
		const onA = position(pathToIndexMd(placed(a.ledger)));
		const onB = position(pathToIndexMd(placed(b.ledger)));
		expect(onA).toContain("### Depends on");
		expect(onA).toContain("B feeds A");
		expect(onB).toContain("### Depended on by");
		expect(onB).not.toContain("### Depends on");
	});

	it("lists a file the host offered and the set refused, and gives it no folder", async () => {
		const { a, b } = colliding();
		const set = WorkspaceSet.fromSchemas([
			[FILE_A, a.ws.toSchema()],
			["bad\\name.json", b.ws.toSchema()],
			["c.json", side("Team C", "C's").ws.toSchema()],
		]);
		const docs = await toDocSet(set);
		expect(docs["index.md"]).toContain("| error | file-path-invalid |");
		expect(docs["index.md"]).toContain("bad\\name.json");
		expect(Object.keys(docs).filter((it) => it.includes("bad"))).toEqual([]);
		expect(Object.keys(docs).some((it) => it.startsWith("c.json/"))).toBe(true);
	});

	it("writes a set of one workspace as the workspace alone, file for file", async () => {
		const only = side("Only", "Only's");
		const set = WorkspaceSet.fromWorkspaces([["only.json", only.ws]]);
		expect(await toDocSet(set)).toEqual(await toDoc(only.ws));
		const keys = Object.keys(await toDocSet(set));
		expect(keys).toContain("boundedcontexts/ledger/index.md");
	});

	it("says so when the files declare no relationship and the set has no diagnostic", async () => {
		const empty = (name: string) =>
			new Workspace(name, { description: "", version: "1.0.0" });
		const set = WorkspaceSet.fromWorkspaces([
			["one.json", empty("One")],
			["two.json", empty("Two")],
		]);
		const docs = await toDocSet(set);
		expect(docs["index.md"]).toContain(
			"## Context Relationships\n> No relationships.",
		);
		expect(docs["index.md"]).toContain("## Diagnostics\n> No diagnostics.");
		expect(docs["index.md"]).toContain(
			"| `one.json` | [One](one.json/one/index.md) |",
		);
	});

	it("refuses to write one file of a set as if it stood alone", async () => {
		const { a } = colliding();
		await expect(toDoc(a.ws)).rejects.toThrow(/toDocSet/);
	});
});

describe("toDocSet on the actual NorthBank set", () => {
	const set = northbankSet();

	it("writes the twelve workspaces to twelve folders named after their files, linked from the first page and the sidebar", async () => {
		const docs = await toDocSet(set);
		expect(set.workspaces).toHaveLength(12);
		const sidebar = docs["_sidebar.md"].split("\n");
		expect(sidebar[0]).toBe("* [Workspaces](/index.md)");
		for (const workspace of set.workspaces) {
			const home = pathToIndexMd(placed(workspace));
			expect(home).toBe(
				`${setFolder(workspace.file as string)}/${workspace.path}/index.md`,
			);
			expect(docs[home], home).toContain(`# ${workspace.name}`);
			expect(sidebar).toContain(`\t* [${workspace.name}](/${home})`);
			expect(targetsOf(docs, "index.md")).toContain(home);
			expect(targetsOf(docs, home)).toContain("index.md");
		}
		expect(sidebar.filter((it) => /^\t\* \[/.test(it))).toHaveLength(12);
	});

	it("writes a page for each of the 19 contexts exactly once, in the folder of its own file", async () => {
		const docs = await toDocSet(set);
		const contexts = set.workspaces.flatMap((it) => [
			...it.boundedcontexts.values(),
		]);
		expect(contexts).toHaveLength(19);
		const pages = Object.keys(docs).filter((it) =>
			/\/boundedcontexts\/[^/]+\/index\.md$/.test(it),
		);
		expect(pages).toHaveLength(19);
		for (const context of contexts) {
			const page = pathToIndexMd(placed(context));
			expect(pages).toContain(page);
			expect(docs[page]).toContain(`# ${context.name}`);
			expect(
				page.startsWith(`${setFolder(context.workspace.file as string)}/`),
			).toBe(true);
		}
	});

	it("resolves every link and image of every page to a file the site has", async () => {
		const docs = await toDocSet(set);
		expect(Object.keys(docs).length).toBeGreaterThan(200);
		expect(brokenLinks(docs)).toEqual([]);
	});

	it("links every consumption that crosses files to the page of the provider in the file that has it", async () => {
		const docs = await toDocSet(set);
		const crossing = ODSConsumptionGraph.fromSet(set).consumptions.filter(
			(it) =>
				it.consumer.boundedcontext.workspace !==
				it.consumable.provider.boundedcontext.workspace,
		);
		expect(crossing.length).toBeGreaterThan(5);
		for (const consumption of crossing) {
			const provider = consumption.consumable.provider;
			const page = pathToIndexMd(placed(consumption.consumer));
			expect(
				targetsOf(docs, page),
				`${page} -> ${setKeyOf(provider)}`,
			).toContain(pathToIndexMd(placed(provider)));
		}
	});

	it("reports on each workspace's page the diagnostics of that file and on the first page all of them", async () => {
		const docs = await toDocSet(set);
		const all = set.validate();
		expect(all.length).toBeGreaterThan(0);
		for (const workspace of set.workspaces) {
			const mine = all.filter((it) => it.file === workspace.file);
			const page = docs[pathToIndexMd(placed(workspace))];
			const section = page.split("## Diagnostics")[1].split("## Health")[0];
			expect(section.match(/^\| (error|warning|info) \|/gm) ?? []).toHaveLength(
				mine.length,
			);
		}
		const first = docs["index.md"].split("## Diagnostics")[1];
		expect(first.match(/^\| (error|warning|info) \|/gm) ?? []).toHaveLength(
			all.length,
		);
	});
});
