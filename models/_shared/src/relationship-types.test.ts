import type { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { workspace as northbank } from "../../northbank/src/workspace";
import { workspace as petstore } from "../../petstore/src/workspace";
import { workspace as rivermart } from "../../rivermart/src/workspace";
import { workspace as streamline } from "../../streamline/src/workspace";

/**
 * Every relationship type the specification offers.
 *
 * The reference set has to demonstrate all of them, or a type ships with no
 * worked example and no fixture behind the pages that render it.
 */
const ALL_TYPES = [
	"customer-supplier",
	"partnership",
	"separate-ways",
	"shared-kernel",
	"upstream-downstream",
];

/**
 * The four reference workspaces, imported by relative path rather than by
 * package name on purpose: the model packages depend on this one, so naming
 * them in its `dependencies` would make the workspace graph a cycle and leave
 * the build with no order to run in.
 */
const models: Array<[string, Workspace]> = [
	["NorthBank", northbank],
	["Petstore", petstore],
	["RiverMart", rivermart],
	["StreamLine", streamline],
];

/** The relationship types `workspace` declares, sorted and deduplicated. */
function typesOf(workspace: Workspace): string[] {
	return [...new Set(workspace.relationships.map((r) => r.type))].sort();
}

/**
 * Coverage of the five relationship types is the reference set's job, not any
 * one model's.
 *
 * `assertStressTestWorkspace` used to demand all five of every stress-test
 * model, which is a test dictating a model: a workspace that genuinely has no
 * partnership had to invent one, and an invented one-way partnership is what
 * `partnership-backed` exists to catch. Each model now only has to show at
 * least three types, and the union across all four has to cover the five.
 */
describe("the reference models together", () => {
	// Asserted per type rather than as one set comparison, so a failure names
	// the type that lost its only example instead of printing two sorted
	// lists to diff by eye.
	it.each(ALL_TYPES)("demonstrate a %s between them", (type) => {
		const carriers = models
			.filter(([, w]) => typesOf(w).includes(type))
			.map(([name]) => name);
		expect(carriers).not.toEqual([]);
	});

	it.each(models)("%s shows at least three relationship types", (_, w) => {
		expect(typesOf(w).length).toBeGreaterThanOrEqual(3);
	});
});
