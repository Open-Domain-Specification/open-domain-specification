import { describe, expect, it } from "vitest";
import { migrateWorkspaceSchema } from "./migrate";
import { Workspace } from "./workspace";

const legacyWorkspace = {
	id: "legacy",
	name: "Legacy",
	odsVersion: "1.0.0",
	description: "Produced by an older release",
	version: "0.0.1",
	domains: {
		commerce: {
			name: "Commerce",
			description: "Commerce",
			type: "core",
			subdomains: {
				sales: {
					name: "Sales",
					description: "Sales",
					boundedcontexts: {},
				},
				already_typed: {
					name: "Already typed",
					description: "Keeps its own type",
					type: "generic",
					boundedcontexts: {},
				},
			},
		},
		untyped: {
			name: "Untyped",
			description: "No type anywhere",
			subdomains: {
				misc: { name: "Misc", description: "Misc", boundedcontexts: {} },
			},
		},
	},
};

describe("migrateWorkspaceSchema", () => {
	it("does not mutate the input document", () => {
		const before = JSON.stringify(legacyWorkspace);
		migrateWorkspaceSchema(legacyWorkspace);
		expect(JSON.stringify(legacyWorkspace)).toBe(before);
	});

	it("moves the legacy domain type onto untyped subdomains (decision 01)", () => {
		const migrated = migrateWorkspaceSchema(legacyWorkspace);
		expect(migrated.domains.commerce).not.toHaveProperty("type");
		expect(migrated.domains.commerce.subdomains.sales.type).toBe("core");
		expect(migrated.domains.commerce.subdomains.already_typed.type).toBe(
			"generic",
		);
		expect(migrated.domains.untyped.subdomains.misc.type).toBe("supporting");
	});

	it("is applied by Workspace.fromSchema", () => {
		// biome-ignore lint/suspicious/noExplicitAny: legacy document shape on purpose
		const ws = Workspace.fromSchema(legacyWorkspace as any);
		expect(
			ws.getSubdomainByRefOrThrow("#/domains/commerce/subdomains/sales").type,
		).toBe("core");
	});
});
