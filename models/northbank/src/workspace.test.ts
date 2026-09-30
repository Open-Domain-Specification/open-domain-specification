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

	// Rendering every diagram through graphviz-wasm takes tens of seconds on
	// the larger models, so this one test gets a generous timeout.
	it("generates a complete docsify site with no broken links", async () => {
		await assertDocSite(workspace);
	}, 60_000);
});
