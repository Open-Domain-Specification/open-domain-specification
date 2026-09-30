import { PATTERNS, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { strategicPositionMd } from "./strategic-position.md";

/**
 * Issue #84 in Markdown: where one side plays two roles, each code is its own
 * item in the table cell and each name and summary its own footnote bullet,
 * as NorthBank's Customer & KYC is upstream of Branch & Contact Centre.
 */
describe("strategicPositionMd", () => {
	it("keeps each of a side's two roles its own item, in the cell and in the notes (#84)", () => {
		const ws = new Workspace("W", { description: "d", version: "0" });
		const trade = ws
			.addDomain("Bank", { description: "d" })
			.addSubdomain("Customer", { type: "core", description: "d" });
		const kyc = trade.addBoundedcontext("Customer & KYC", { description: "d" });
		const branch = trade.addBoundedcontext("Branch", { description: "d" });
		branch.downstreamOf(kyc, {
			upstreamRoles: ["open-host-service", "published-language"],
			downstreamRoles: ["conformist"],
		});

		const md = strategicPositionMd(branch);
		const row = md.split("\n").find((l) => l.startsWith("| Customer & KYC |"));
		expect(row?.split("|").map((c) => c.trim())).toContain(
			"open-host-service, published-language",
		);
		for (const role of ["open-host-service", "published-language"] as const) {
			const { name, abbreviation, summary } = PATTERNS[role];
			expect(md.split("\n")).toContain(
				`- \`${role}\` — **${name}** (${abbreviation}). ${summary}`,
			);
		}
	});

	it("names each of two same-type agreements in its row and its comment title (#74)", () => {
		const ws = new Workspace("W", { description: "d", version: "0" });
		const trade = ws
			.addDomain("Shop", { description: "d" })
			.addSubdomain("Trade", { type: "core", description: "d" });
		const vendor = trade.addBoundedcontext("Vendor", { description: "d" });
		const warehouse = trade.addBoundedcontext("Warehouse", {
			description: "d",
		});
		for (const name of ["purchase feed", "price lookup"])
			warehouse.downstreamOf(vendor, {
				name,
				comments: [{ text: `About the ${name}.` }],
			});

		const lines = strategicPositionMd(warehouse).split("\n");
		for (const name of ["purchase feed", "price lookup"]) {
			const type = `upstream-downstream · ${name}`;
			expect(
				lines.filter(
					(l) => l.startsWith("| Vendor |") && l.includes(` ${type} `),
				),
			).toHaveLength(1);
			expect(lines).toContain(`- **Vendor** (${type})`);
		}
	});
});
