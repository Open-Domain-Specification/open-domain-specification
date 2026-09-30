/**
 * What every surface must say about `.ods/cross_surface.json` (epic #62).
 *
 * The four harnesses that read the fixture assert against this one object, so
 * they cannot disagree silently: the viewer and the static export
 * (`packages/pages/e2e/cross-surface-facts.spec.ts`), the real VS Code webview
 * (`apps/ods-vscode/src/test/cross-surface.test.ts`) and generated Markdown
 * (`packages/doc/src/cross-surface.test.ts`). It holds values and no imports,
 * so each of them can load it whatever its own compiler settings are.
 *
 * Only facts belong here. The health report's label is not one of them: each
 * harness compares it with core's `relationshipTitle` instead of restating the
 * glyph.
 */
export const FIXTURE_FILE = "cross_surface.json";

export const EXPECTED = {
	/** Pages are opened by ref. */
	refs: {
		orders: "#/boundedcontexts/orders",
		warehouse: "#/boundedcontexts/warehouse",
		warehouseApi: "#/boundedcontexts/warehouse/services/warehouse_api",
		account: "#/boundedcontexts/orders/aggregates/customer_account",
		health: "#/health",
	},

	/** Issue #43: an authored description is printed as written, a generated one says so. */
	descriptions: {
		/** The Orders page's strategic position table, one row each. */
		authored: {
			counterpart: "Billing",
			text: "Billing is told what to charge before an order is confirmed.",
		},
		generated: {
			counterpart: "Shipping",
			sentence:
				"Orders acts as an upstream supplier to Shipping, while Shipping takes the upstream model as it comes.",
			keyword: "generated",
			title:
				"Generated from the relationship's type and roles. The model has no authored description.",
			/** Generated Markdown writes the sentence in italics and this after it. */
			markdownSuffix: "(generated)",
		},
	},

	/**
	 * Issue #55: the Warehouse API's consumptions from the Vendor API, which are
	 * under two named agreements between the same two contexts, and one that
	 * names none. `relationship` is the ref of the agreement's page.
	 */
	agreements: {
		columnHeader: "Agreement",
		consumptions: [
			{
				consumable: "PurchaseFilePublished",
				agreement: "purchase feed",
				relationship:
					"#/relationships/vendor~upstream-downstream~warehouse~purchase_feed",
			},
			{
				consumable: "AskPrice",
				agreement: "price lookup",
				relationship:
					"#/relationships/vendor~upstream-downstream~warehouse~price_lookup",
			},
			{ consumable: "StockChecked", agreement: null, relationship: null },
		],
		/** The consumable map edge's hover, on the pages. */
		edgeTitle: (agreement: string) => `Under the ${agreement} agreement`,
		/** The Markdown form on a service page. */
		bullet: (agreement: string) => `- **Agreement**: ${agreement}`,
	},

	/**
	 * Issue #74: each named agreement's own page names it, and so do its tree
	 * row, its search hit and Markdown's health list. Each harness compares the
	 * whole label with core's `relationshipTitle`; the name is the fact.
	 */
	namedAgreements: [
		{
			name: "purchase feed",
			relationship:
				"#/relationships/vendor~upstream-downstream~warehouse~purchase_feed",
		},
		{
			name: "price lookup",
			relationship:
				"#/relationships/vendor~upstream-downstream~warehouse~price_lookup",
		},
	],

	/** Issue #44: the tolerated relationship, in the health report. */
	health: {
		source: { name: "Orders", ref: "#/boundedcontexts/orders" },
		target: { name: "Billing", ref: "#/boundedcontexts/billing" },
	},

	/** Issue #56: the relation map's stereotype for each context an identity names. */
	identities: [
		{ context: "Payment Gateway", stereotype: "external system" },
		{ context: "Tax Registry", stereotype: "boundary only" },
		{ context: "Legacy Mainframe", stereotype: "big ball of mud" },
	],

	/**
	 * Issue #75: every diagnostic the fixture carries, all on purpose. The one
	 * warning is on the consumption above that names no agreement: the pair has
	 * two in that direction, so core cannot pick one for it.
	 */
	diagnostics: [
		{
			severity: "warning",
			rule: "consumption-agreement",
			ref: "#/boundedcontexts/warehouse/services/warehouse_api/consumes/boundedcontexts~vendor~services~vendor_api~provides~stock_checked",
		},
	],
} as const;
