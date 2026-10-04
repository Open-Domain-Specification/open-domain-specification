import { execFileSync } from "node:child_process";
import path from "node:path";
import {
	identityKeyOf,
	ODSContextMap,
	Workspace,
	WorkspaceSet,
} from "@open-domain-specification/core";
import { toDocSet } from "@open-domain-specification/doc";
import { describe, expect, it } from "vitest";

const SITE_SCRIPT = `
const { WorkspaceSet } = await import("@open-domain-specification/core");
const { toDocSet } = await import("@open-domain-specification/doc");
const set = WorkspaceSet.fromSchemas(JSON.parse(process.argv[1]));
const docs = await toDocSet(set);
const svg = docs["contextmap.svg"];
const links = (page) => [...(docs[page] ?? "").matchAll(/\\]\\(([^)\\s]+)\\)/g)].map((m) => m[1].split("#")[0]);
console.log(JSON.stringify({
	files: Object.keys(docs).sort(),
	svgNodes: (svg.match(/class="node"/g) ?? []).length,
	svgEdges: (svg.match(/class="edge"/g) ?? []).length,
	providerPageLinks: links("accounts.json/boundedcontexts/ledger/index.md"),
	consumerPageLinks: links("risk/team.json/boundedcontexts/ledger/index.md"),
}));
`;

function siteInFreshProcess(set: WorkspaceSet) {
	const out = execFileSync(
		process.execPath,
		[
			"--input-type=module",
			"-e",
			SITE_SCRIPT,
			JSON.stringify([...set.toSchemas()]),
		],
		{
			cwd: path.join(__dirname, ".."),
			encoding: "utf-8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", "ignore"],
		},
	);
	return JSON.parse(out) as {
		files: string[];
		svgNodes: number;
		svgEdges: number;
		providerPageLinks: string[];
		consumerPageLinks: string[];
	};
}

/** One team's workspace: every team picks the ids it likes, and these two agree. */
function team(name: string) {
	const workspace = new Workspace(name, { description: "", version: "1.0.0" });
	const sub = workspace
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
	return { workspace, ledger, payments, post };
}

describe("Two workspace files with the same local ids", () => {
	it("are one set, and each file's ledger stays its own", async () => {
		const accounts = team("Accounts");
		const risk = team("Risk");

		// The second team's ledger consumes the first team's operation. The two
		// are different elements with the same local id, in different files.
		const consumer = risk.ledger.addAggregate("Exposure", { description: "" });
		consumer.consumes(accounts.post, {});

		const set = WorkspaceSet.fromWorkspaces([
			["accounts.json", accounts.workspace],
			["risk/team.json", risk.workspace],
		]);

		// A local ref stays in its file; a ref to another file writes the path first.
		expect(accounts.ledger.ref).toBe("#/boundedcontexts/ledger");
		expect(risk.ledger.ref).toBe("#/boundedcontexts/ledger");
		expect(set.refTo(risk.workspace, accounts.post)).toBe(
			"../accounts.json#/boundedcontexts/ledger/services/payments/provides/post",
		);

		// The identity of an element across a set is its file and its local ref.
		expect(identityKeyOf(accounts.ledger)).toBe(
			"accounts.json#/boundedcontexts/ledger",
		);
		expect(identityKeyOf(risk.ledger)).toBe(
			"risk/team.json#/boundedcontexts/ledger",
		);

		// Written out and loaded back, the files are the same set.
		const again = WorkspaceSet.fromSchemas(set.toSchemas());
		expect(again.validate()).toEqual(set.validate());
		expect(
			again.byPath("risk/team.json")?.boundedcontexts.get("ledger")?.name,
		).toBe("Ledger");

		// The Markdown has a folder of pages for each file, linked to each other.
		const docs = await toDocSet(set);
		expect(Object.keys(docs)).toContain(
			"accounts.json/boundedcontexts/ledger/index.md",
		);
		expect(Object.keys(docs)).toContain(
			"risk/team.json/boundedcontexts/ledger/index.md",
		);
	});
	it("draw each file's ledger as its own context, and the consumption between them as the one edge", async () => {
		const accounts = team("Accounts");
		const risk = team("Risk");
		const consumer = risk.ledger.addAggregate("Exposure", { description: "" });
		consumer.consumes(accounts.post, {});
		const set = WorkspaceSet.fromWorkspaces([
			["accounts.json", accounts.workspace],
			["risk/team.json", risk.workspace],
		]);

		// Two contexts share the local id `ledger`; the map keeps both, each
		// owned by its own file.
		const accountsLedger = "accounts.json#/boundedcontexts/ledger";
		const riskLedger = "risk/team.json#/boundedcontexts/ledger";
		const map = ODSContextMap.fromSet(set);
		expect([...map.nodes.keys()].sort()).toEqual([accountsLedger, riskLedger]);
		// The provider is upstream of the consumer, and nothing declares it.
		expect(
			[...map.edges.values()].map((it) => ({
				source: it.source.id,
				target: it.target.id,
				type: it.type,
				implied: it.implied,
			})),
		).toEqual([
			{
				source: accountsLedger,
				target: riskLedger,
				type: "upstream-downstream",
				implied: "consumption",
			},
		]);

		// The site is generated where the package entries resolve normally: in a
		// fresh plain node process, from the same set written out as its files.
		// Under Vitest the linked packages are a second instance of core and the
		// first page draws one context, so this is not asserted in process.
		const site = siteInFreshProcess(set);

		// The first page draws both contexts and that edge.
		expect(site.svgNodes).toBe(2);
		expect(site.svgEdges).toBe(1);

		// Each file's folder holds its own ledger page. The provider's page
		// lists who consumes it and links into the consuming file's folder; the
		// consumer's page keeps its own links inside its own file.
		expect(site.files).toContain(
			"accounts.json/boundedcontexts/ledger/index.md",
		);
		expect(site.files).toContain(
			"risk/team.json/boundedcontexts/ledger/index.md",
		);
		expect(site.files).toContain(
			"risk/team.json/boundedcontexts/ledger/aggregates/exposure/index.md",
		);
		expect(site.providerPageLinks).toContain(
			"../../../risk/team.json/boundedcontexts/ledger/aggregates/exposure/index.md",
		);
		expect(site.consumerPageLinks).toContain("aggregates/exposure/index.md");
		expect(
			site.consumerPageLinks.filter((it) => it.includes("accounts.json")),
		).toEqual([]);
	});

	it("draw no edge once the consumption is gone", () => {
		const accounts = team("Accounts");
		const risk = team("Risk");
		const set = WorkspaceSet.fromWorkspaces([
			["accounts.json", accounts.workspace],
			["risk/team.json", risk.workspace],
		]);
		const map = ODSContextMap.fromSet(set);
		expect(map.nodes.size).toBe(2);
		expect(map.edges.size).toBe(0);
	});
});
