import assert from "node:assert/strict";
import {
	type Consumable,
	callsOut,
	ODSFlowMap,
	usersOfValueObject,
	type WorkspaceSet,
} from "@open-domain-specification/core";
import { assertDocSite } from "@open-domain-specification/model-tools";
import { describe, expect, it } from "vitest";
import { loadMonolith, loadSet } from "./equivalence.support.ts";
import { buildNorthbankSet } from "./northbank-set.ts";

/**
 * NorthBank plants exactly three structural problems, chosen so that it,
 * RiverMart and StreamLine together exercise every rule in the validation
 * catalog; see the DELIBERATE comments in the team modules and section 7 of
 * DISCOVERY.md.
 *
 * The list is the one the single-workspace model pinned, unchanged. Each
 * finding now also names the file it is about (see equivalence.test.ts).
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

const set = buildNorthbankSet();
const contexts = (s: WorkspaceSet) =>
	s.workspaces.flatMap((w) => [...w.boundedcontexts.values()]);
const relationships = (s: WorkspaceSet) =>
	s.workspaces.flatMap((w) => w.relationships);

/**
 * What `assertStressTestWorkspace` asserts of a single workspace (models/_shared),
 * asserted of the set: it takes one workspace and the set has twelve. Nothing is
 * weakened: every clause of the helper is here, read across the files.
 */
function assertStressTestSet(
	s: WorkspaceSet,
	expected: Array<{ rule: string; severity: "error" | "warning" }>,
): void {
	const types = new Set(relationships(s).map((r) => r.type));
	assert.ok(
		types.size >= 3,
		`NorthBank shows only ${types.size} relationship type(s): ${[...types].sort().join(", ")}`,
	);
	const legacy = contexts(s).filter((bc) => bc.bigBallOfMud);
	assert.strictEqual(legacy.length, 1);

	for (const bc of contexts(s)) {
		if (bc.external) continue;
		assert.notStrictEqual(bc.team, undefined, `${bc.name} has no team`);
	}

	assert.ok(contexts(s).some((bc) => bc.glossary.size > 0));
	assert.ok(contexts(s).reduce((n, bc) => n + bc.policies.size, 0) > 5);
	assert.ok(
		contexts(s).reduce((n, bc) => n + bc.processes.size, 0) > 0,
		"NorthBank names no process",
	);
	const diagnostics = s
		.validate()
		.map(({ rule, severity }) => ({ rule, severity }))
		.sort((a, b) => a.rule.localeCompare(b.rule));
	assert.deepStrictEqual(
		diagnostics,
		[...expected].sort((a, b) => a.rule.localeCompare(b.rule)),
	);

	const schemas = s.toSchemas();
	const rebuilt = loadSet([
		...JSON.parse(JSON.stringify([...schemas.entries()])),
	]);
	assert.deepStrictEqual(rebuilt.toSchemas(), schemas);
	assert.deepStrictEqual(rebuilt.validate(), s.validate());
}

describe("NorthBank reference set", () => {
	it("builds twelve workspaces and enough contexts to stress the pages", () => {
		expect(set.workspaces).toHaveLength(12);
		expect(new Set(set.workspaces.map((w) => w.id)).size).toBe(12);
		expect(contexts(set).length).toBeGreaterThanOrEqual(12);
		expect(relationships(set).length).toBeGreaterThan(12);
	});

	it("passes the stress-test assertions, read across the set", () => {
		assertStressTestSet(set, deliberate);
	});

	// The interview names two owners of Money and AccountNumber: "one shared
	// library between us and the ledger; we change it together and release it
	// together" (DISCOVERY: Accounts Team lead). Every other context that
	// carries an amount uses the library and co-owns none of it (card 157).
	it("names Accounts and Ledger as the kernel's only co-owners, and the other users borrow over directed relationships", () => {
		const names = (xs: Iterable<{ name: string }>) =>
			[...xs].map((x) => x.name);
		expect(names(contexts(set))).not.toContain("Shared Kernel");
		expect(
			names(set.workspaces.flatMap((w) => [...w.teams.values()])),
		).not.toContain("Shared Kernel Team");

		const kernels = relationships(set).filter(
			(r) => r.type === "shared-kernel",
		);
		expect(kernels.map((r) => [r.source.name, r.target.name])).toEqual([
			["Accounts", "Ledger"],
		]);

		const ledger = contexts(set).find((bc) => bc.name === "Ledger");
		const money = ledger?.valueobjects.get("money");
		const accountNumber = ledger?.valueobjects.get("account_number");
		expect(money?.name).toBe("Money");
		expect(accountNumber?.name).toBe("AccountNumber");

		const holders = new Map<string, Set<string>>();
		for (const bc of contexts(set)) {
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
				const names = holders.get(bc.name) ?? new Set<string>();
				names.add(held?.name ?? "");
				holders.set(bc.name, names);
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
			const routes = relationships(set).filter(
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
	it("records Decide's run of the scorecard as a structured local call", () => {
		const context = contexts(set).find(
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
		expect(callsOut(decide).map((c: Consumable) => c.name)).toEqual([
			"PullBureauReport",
			"ScoreApplication",
			"GetCustomer",
		]);

		// It survives the JSON the surfaces read: the files written and loaded
		// back as a set.
		const rebuilt = loadSet([
			...JSON.parse(JSON.stringify([...set.toSchemas().entries()])),
		]);
		const again = contexts(rebuilt)
			.find((bc) => bc.name === "Credit Decisioning")
			?.services.get("decisioning_app");
		expect(
			again?.consumptions.map((c) => [
				c.consumable.name,
				c.by.map((b) => b.name),
			]),
		).toContainEqual(["ScoreApplication", ["Decide"]]);

		// The flow map draws the step between the two operations.
		const edges = [...ODSFlowMap.fromSet(set).edges.values()];
		expect(
			edges.some(
				(e) =>
					e.source.name === "Decide" && e.target.name === "ScoreApplication",
			),
		).toBe(true);
	});

	// A value object's "Used by" promises every user in the workspace, as the
	// viewer's value-object page does, not only the home context's (issue 110).
	// Ledger declares Money, and Accounts, Payments Hub, Cards, Lending and
	// Regulatory Reporting borrow it. Nested value objects and schemas typed by
	// it are users too, each saying which it is. Across files the users are
	// still all there: they live in five other files than Ledger's.
	it("lists every user of Money across the files, qualified by context", () => {
		const ledger = contexts(set).find((bc) => bc.name === "Ledger");
		const money = ledger?.valueobjects.get("money");
		expect(money).toBeTruthy();
		if (!ledger || !money) return;

		const users = usersOfValueObject(money);
		const label = (u: (typeof users)[number]) =>
			`${u.boundedcontext.name} / ${u.owner.name} (${u.kind})`;
		const labels = users.map(label);
		expect(labels).toContain("Cards / Card (aggregate)");
		expect(labels).toContain("Accounts / OverdraftLimit (value object)");
		expect(labels).toContain("Payments Hub / InitiatePayment (schema)");
		const files = new Set(
			users.map((u) => u.boundedcontext.workspace.file as string),
		);
		expect(files.size).toBeGreaterThanOrEqual(6);
		expect(files.has(ledger.workspace.file as string)).toBe(true);
		// The same users as in the single workspace, as a set.
		const mono = loadMonolith();
		const monoMoney = [...mono.boundedcontexts.values()]
			.find((bc) => bc.name === "Ledger")
			?.valueobjects.get("money");
		expect(monoMoney).toBeTruthy();
		if (!monoMoney) return;
		expect([...labels].sort()).toEqual(
			usersOfValueObject(monoMoney).map(label).sort(),
		);
	});

	// A schema's "Used by" promises every user, not only the consumables that
	// carry it (issue 114). Ledger's PostingLine is sent and answered by no
	// consumable: PostEntry and EntryPosted nest it, and those are what carry it.
	// The old column read the carrier-only list and printed "-".
	it("lists nested schema users and the users of ledger account kinds across the set", async () => {
		const ledger = contexts(set).find((bc) => bc.name === "Ledger");
		const postingLine = ledger?.schemas.get("posting_line");
		expect(postingLine).toBeTruthy();
		if (!postingLine) return;
		expect(postingLine.consumables.map((c) => c.name)).toEqual([]);
		const nested = [...(ledger?.schemas.values() ?? [])]
			.filter((s) =>
				[...s.attributes.values()].some((a) => a.schema === postingLine),
			)
			.map((s) => s.name);
		expect(nested).toEqual(["PostEntry", "EntryPosted"]);

		const ledgerAccount = ledger?.valueobjects.get("ledger_account");
		expect(ledgerAccount?.kinds.map((k) => k.name)).toEqual([
			"CustomerLedgerAccount",
			"NominalLedgerAccount",
		]);
	}, 60_000);
});

/**
 * This block checks the Markdown pages of the frozen single-workspace
 * fixture, with the assertions the model has always carried, so a regression
 * of the standalone doc generator on this model is caught. It does not check
 * the set's own site. packages/doc does have a set-aware entry point,
 * `toDocSet`, which generate.ts calls to write the set's docs/ folder, and
 * `toDocSet` itself is tested in packages/doc (set.test.ts). No assertion in
 * this file reads the set's generated pages (see DISCOVERY.md).
 */
describe("NorthBank's pages, on the frozen single workspace", () => {
	const workspace = loadMonolith();

	it("lists Decide's run of the scorecard on the front's page and the context's table", async () => {
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

	// A schema's "Used by" promises every user, not only the consumables that
	// carry it (issue 114). Ledger's PostingLine is sent and answered by no
	// consumable: PostEntry and EntryPosted nest it, and those are what carry it.
	// The old column read the carrier-only list and printed "-".
	it("lists nested schema users and the users of ledger account kinds", async () => {
		const docs = await assertDocSite(workspace);
		const page = docs["boundedcontexts/ledger/index.md"];
		const row = page
			.split("\n")
			.find((line) => line.startsWith("| PostingLine |"));
		expect(row).toBeTruthy();
		const usedBy = (row ?? "").split(/ \| /).pop() ?? "";
		expect(usedBy).not.toMatch(/^-\s*\|?$/);
		expect(usedBy).toContain("[PostEntry](./index.md#schemas) (schema)");
		expect(usedBy).toContain("[EntryPosted](./index.md#schemas) (schema)");

		const ledgerAccount = page
			.split("\n")
			.find((line) => line.startsWith("| LedgerAccount |"));
		expect(ledgerAccount).toContain(
			"[CustomerLedgerAccount](./index.md#value-objects) (value object, kind)",
		);
		expect(ledgerAccount).toContain(
			"[NominalLedgerAccount](./index.md#value-objects) (value object, kind)",
		);
		for (const kind of ["CustomerLedgerAccount", "NominalLedgerAccount"]) {
			const kindRow = page
				.split("\n")
				.find((line) =>
					line.startsWith(`| ${kind} (a kind of LedgerAccount) |`),
				);
			expect(kindRow).toContain(
				"[JournalEntry](aggregates/journal_entry/index.md) (through LedgerAccount)",
			);
		}
	}, 60_000);

	// Rendering every diagram through graphviz-wasm takes tens of seconds on
	// the larger models, so this one test gets a generous timeout.
	it("generates a complete docsify site with no broken links", async () => {
		await assertDocSite(workspace);
	}, 60_000);
});
