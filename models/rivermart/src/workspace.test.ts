import { Answer, routesTo } from "@open-domain-specification/core";
import {
	assertDocSite,
	assertStressTestWorkspace,
} from "@open-domain-specification/model-tools";
import { describe, expect, it } from "vitest";
import { workspace } from "./workspace";

/**
 * RiverMart plants structural problems on purpose; see the DELIBERATE
 * comments in workspace.ts and section 7 of DISCOVERY.md. Two rules have been
 * retired off this list rather than fixed in the model, because in both cases
 * the model was right and the rule over-claimed: role-coherence on card 47
 * (Warehouse and Last Mile share a kernel, so neither end has a role to
 * declare) and partnership-backed on card 69 (Search and Advertising release
 * as one product with the traffic running one way, which decision 20's second
 * amendment accepts). The list states what `validate()` prints today. Rule
 * coverage itself is the completeness fixture's job in
 * packages/core/src/rule-catalog.test.ts.
 */
const deliberate: Array<{ rule: string; severity: "error" | "warning" }> = [
	{ rule: "aggregate-root", severity: "error" },
	{ rule: "cross-aggregate-reference", severity: "error" },
];

describe("RiverMart reference workspace", () => {
	it("builds with its id and enough contexts to stress the pages", () => {
		expect(workspace.id).toBe("rivermart");
		expect(workspace.boundedcontexts.size).toBeGreaterThanOrEqual(12);
		expect(workspace.relationships.length).toBeGreaterThan(12);
	});

	it("passes the shared stress-test assertions", () => {
		assertStressTestWorkspace(workspace, deliberate);
	});

	// Rendering every diagram through graphviz-wasm takes tens of seconds on
	// the larger models, so this one test gets a generous timeout.
	it("generates a complete docsify site with no broken links", async () => {
		await assertDocSite(workspace);
	}, 60_000);
});

/**
 * The acquirer refuses a hold with one shape and its own response code, and
 * Payments branches on one of those codes rather than on the shape: 91 is
 * worth asking again about and 51 is not (decision 25, amended; card 114).
 */
describe("RiverMart's acquirer and the outcomes it enumerates", () => {
	const holdFunds = workspace.getConsumableByRefOrThrow(
		"#/boundedcontexts/payment_provider/services/acquirer_api/provides/hold_funds",
	);
	const decline = workspace.getSchemaByRefOrThrow(
		"#/boundedcontexts/payment_provider/schemas/provider_decline",
	);
	const attempt = workspace.getProcessByRefOrThrow(
		"#/boundedcontexts/payments/processes/hold_attempt",
	);

	it("states the decline codes the acquirer publishes for a hold", () => {
		expect(holdFunds.rejectsWith(decline)?.reasons).toEqual([
			"insufficient_funds",
			"do_not_honour",
			"issuer_unavailable",
		]);
	});

	it("branches on one of them, and on that one alone", () => {
		const waited = attempt.events.filter(
			(it): it is Answer => it instanceof Answer,
		);
		expect(waited.map((it) => it.ref)).toEqual([
			`${holdFunds.ref}/rejects/provider_decline/issuer_unavailable`,
		]);
		expect(waited[0].declared).toBe(true);
		expect(waited[0].operation).toBe(holdFunds);
	});

	it("hears it through the calls it makes itself", () => {
		// The answer comes back down the calls that asked for it: the
		// operation that starts the attempt, whose handler makes the first
		// hold, and the retry the process issues after a decline it can try
		// again (decisions 21 and 23, third amendment of 2026-09-10). Until
		// card 135 only the retry counted, so this model passed on the
		// accident that a second `by` was written beside the first — the same
		// process with one attempt and no retry could not have waited on the
		// answer at all.
		expect(routesTo(attempt, holdFunds).map((it) => it.name)).toEqual([
			"AuthorisePayment",
			"RetryHold",
		]);
	});
});
