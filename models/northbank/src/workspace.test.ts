import {
	callsOut,
	ODSFlowMap,
	Workspace,
} from "@open-domain-specification/core";
import {
	assertDocSite,
	assertStressTestWorkspace,
} from "@open-domain-specification/model-tools";
import { describe, expect, it } from "vitest";
import { workspace } from "./workspace";

/**
 * NorthBank plants exactly three structural problems, chosen so that it,
 * RiverMart and StreamLine together exercise every rule in the validation
 * catalog; see the DELIBERATE comments in workspace.ts and section 7 of
 * DISCOVERY.md.
 */
const deliberate: Array<{ rule: string; severity: "error" | "warning" }> = [
	// Channels calls Credit Decisioning across a declared separate ways. One
	// mistake, one diagnostic: separate ways says how the two stand, so
	// `relationship-declared` has nothing left to ask and this rule says what
	// is actually wrong (card 104).
	{ rule: "separate-ways", severity: "error" },
	{ rule: "consumable-kind", severity: "error" },
	{ rule: "context-serves-subdomain", severity: "warning" },
];

describe("NorthBank reference workspace", () => {
	it("builds with its id and enough contexts to stress the pages", () => {
		expect(workspace.id).toBe("northbank");
		expect(workspace.boundedcontexts.size).toBeGreaterThanOrEqual(12);
		expect(workspace.relationships.length).toBeGreaterThan(12);
	});

	it("passes the shared stress-test assertions", () => {
		assertStressTestWorkspace(workspace, deliberate);
	});

	// The interview names two owners of Money and AccountNumber: "one shared
	// library between us and the ledger; we change it together and release it
	// together" (DISCOVERY: Accounts Team lead). Every other context that
	// carries an amount uses the library and co-owns none of it (card 157).
	it("names Accounts and Ledger as the kernel's only co-owners, and the other users borrow over directed relationships", () => {
		const names = (xs: Iterable<{ name: string }>) =>
			[...xs].map((x) => x.name);
		expect(names(workspace.boundedcontexts.values())).not.toContain(
			"Shared Kernel",
		);
		expect(names(workspace.teams.values())).not.toContain("Shared Kernel Team");

		const kernels = workspace.relationships.filter(
			(r) => r.type === "shared-kernel",
		);
		expect(kernels.map((r) => [r.source.name, r.target.name])).toEqual([
			["Accounts", "Ledger"],
		]);

		const ledger = [...workspace.boundedcontexts.values()].find(
			(bc) => bc.name === "Ledger",
		);
		const money = ledger?.valueobjects.get("money");
		const accountNumber = ledger?.valueobjects.get("account_number");
		expect(money?.name).toBe("Money");
		expect(accountNumber?.name).toBe("AccountNumber");

		const holders = new Map<string, Set<string>>();
		for (const bc of workspace.boundedcontexts.values()) {
			if (bc === ledger) continue;
			const attributes = [
				...[...bc.aggregates.values()].flatMap((a) =>
					[...a.entities.values()].flatMap((e) => [...e.attributes.values()]),
				),
				...[...bc.valueobjects.values()].flatMap((v) => [
					...v.attributes.values(),
				]),
			];
			for (const attribute of attributes) {
				const held = attribute.valueobject;
				if (held !== money && held !== accountNumber) continue;
				const set = holders.get(bc.name) ?? new Set<string>();
				set.add(held?.name ?? "");
				holders.set(bc.name, set);
			}
		}
		expect(
			Object.fromEntries(
				[...holders].map(([bc, held]) => [bc, [...held].sort()]),
			),
		).toEqual({
			Accounts: ["AccountNumber", "Money"],
			"Payments Hub": ["Money"],
			Cards: ["Money"],
			Lending: ["Money"],
			"Regulatory Reporting": ["Money"],
		});

		// A user that is not a co-owner stands downstream of Ledger, as its
		// conformist or as the customer of a customer-supplier relationship.
		const users = [...holders.keys()].filter((name) => name !== "Accounts");
		expect(users).toHaveLength(4);
		for (const user of users) {
			const routes = workspace.relationships.filter(
				(r) =>
					r.source === ledger &&
					r.target.name === user &&
					(r.type === "customer-supplier" ||
						r.downstreamRoles.includes("conformist")),
			);
			expect(routes, `${user} borrows Money from Ledger`).toHaveLength(1);
		}
	});

	// The interview says Credit Decisioning pulls a bureau report, runs the
	// scorecard and checks affordability, and `Decide` says it hands the report
	// to the scorecard. The model records that run as a local consumption of the
	// internal `ScoreApplication`, made by `Decide`, with no contract the source
	// does not give: no pattern, no schema, no answer (card 158).
	it("records Decide's run of the scorecard as a structured local call", async () => {
		const context = [...workspace.boundedcontexts.values()].find(
			(bc) => bc.name === "Credit Decisioning",
		);
		const app = context?.services.get("decisioning_app");
		const decide = app?.consumables.get("decide");
		const score = context?.services
			.get("scorecard")
			?.consumables.get("score_application");
		expect(decide && score).toBeTruthy();
		if (!decide || !score) return;

		const consumption = app?.consumptions.find((c) => c.consumable === score);
		expect(consumption?.by).toEqual([decide]);
		expect(consumption?.pattern).toBeUndefined();
		expect(score.internal).toBe(true);
		expect(score.returns).toBeUndefined();
		expect(score.schema).toBeUndefined();
		expect(callsOut(decide).map((c) => c.name)).toEqual([
			"PullBureauReport",
			"ScoreApplication",
			"GetCustomer",
		]);

		// It survives the JSON the surfaces read.
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(workspace.toSchema())),
		);
		const again = [...rebuilt.boundedcontexts.values()]
			.find((bc) => bc.name === "Credit Decisioning")
			?.services.get("decisioning_app");
		expect(
			again?.consumptions.map((c) => [
				c.consumable.name,
				c.by.map((b) => b.name),
			]),
		).toContainEqual(["ScoreApplication", ["Decide"]]);

		// The flow map draws the step between the two operations.
		const edges = [...ODSFlowMap.fromWorkspace(workspace).edges.values()];
		expect(
			edges.some(
				(e) =>
					e.source.name === "Decide" && e.target.name === "ScoreApplication",
			),
		).toBe(true);

		// And it reaches Markdown, on the front's page and the context's table.
		const docs = await assertDocSite(workspace);
		expect(
			docs[
				"boundedcontexts/credit_decisioning/services/decisioning_app/index.md"
			],
		).toMatch(/### ScoreApplication[\s\S]*?\*\*Made by\*\*: Decide/);
		expect(docs["boundedcontexts/credit_decisioning/index.md"]).toContain(
			"| Decide | - | Scorecard | ScoreApplication | - |",
		);
	}, 60_000);

	// A value object's "Used by" on the context page promises every user in the
	// workspace, as the viewer's value-object page does, not only the home
	// context's (issue 110). Ledger declares Money, and Accounts, Payments Hub,
	// Cards, Lending and Regulatory Reporting borrow it. Nested value objects and
	// schemas typed by it are users too, each saying which it is.
	it("lists every user of Money on Ledger's page, qualified by context and linked", async () => {
		const docs = await assertDocSite(workspace);
		const ledger = [...workspace.boundedcontexts.values()].find(
			(bc) => bc.name === "Ledger",
		);
		const money = ledger?.valueobjects.get("money");
		expect(money).toBeTruthy();
		if (!ledger || !money) return;

		// What the model says, read off the attributes and relations themselves.
		const expected: string[] = [];
		for (const bc of workspace.boundedcontexts.values()) {
			const qualify = (name: string) =>
				bc === ledger ? name : `${bc.name} / ${name}`;
			for (const aggregate of bc.aggregates.values()) {
				const holds = [...aggregate.entities.values()].some((entity) =>
					[...entity.attributes.values()].some((a) => a.valueobject === money),
				);
				if (holds) expected.push(qualify(aggregate.name));
			}
			for (const vo of bc.valueobjects.values())
				if ([...vo.attributes.values()].some((a) => a.valueobject === money))
					expected.push(`${qualify(vo.name)} (value object)`);
			for (const schema of bc.schemas.values())
				if (
					[...schema.attributes.values()].some((a) => a.valueobject === money)
				)
					expected.push(`${qualify(schema.name)} (schema)`);
		}
		expect(expected).toContain("Cards / Card");
		expect(expected).toContain("Accounts / OverdraftLimit (value object)");
		expect(expected).toContain("Payments Hub / InitiatePayment (schema)");

		const page = docs["boundedcontexts/ledger/index.md"];
		const row = page.split("\n").find((line) => line.startsWith("| Money |"));
		expect(row).toBeTruthy();
		const cells = (row ?? "").split(/ \| /);
		const usedBy = cells[cells.length - 1].replace(/ \|$/, "");
		const links = [
			...usedBy.matchAll(
				/\[([^\]]+)\]\(([^)]+)\)( \((?:value object|schema)\))?/g,
			),
		];
		expect(links.map((m) => `${m[1]}${m[3] ?? ""}`)).toEqual(expected);

		// Each link opens a generated page, and a schema or value object opens
		// the section that holds it.
		for (const [, label, href, kind] of links) {
			const [file, anchor] = href.split("#");
			const target = `boundedcontexts/ledger/${file}`
				.split("/")
				.reduce<string[]>((path, part) => {
					if (part === "..") path.pop();
					else if (part !== ".") path.push(part);
					return path;
				}, [])
				.join("/");
			expect(docs[target], `${label} links to ${href}`).toBeTruthy();
			if (kind?.includes("schema")) expect(anchor).toBe("schemas");
			if (kind?.includes("value object")) expect(anchor).toBe("value-objects");
		}

		// AccountNumber, which only Accounts uses outside Ledger, reads the same.
		expect(page).toMatch(
			/\| AccountNumber \|.*\[Accounts \/ Account\]\(\.\.\/accounts\/aggregates\/account\/index\.md\)/,
		);
	}, 60_000);

	// Rendering every diagram through graphviz-wasm takes tens of seconds on
	// the larger models, so this one test gets a generous timeout.
	it("generates a complete docsify site with no broken links", async () => {
		await assertDocSite(workspace);
	}, 60_000);
});
