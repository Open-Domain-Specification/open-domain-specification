import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PATTERNS, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { toDoc } from "./index";

const petstoreSchema = JSON.parse(
	readFileSync(
		join(__dirname, "../../../models/petstore/.ods/petstore.json"),
		"utf8",
	),
);
const petstore = Workspace.fromSchema(petstoreSchema);

describe("toDoc", () => {
	it("should generate documentation for empty workspace", async () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const docs = await toDoc(workspace);

		expect(docs).toHaveProperty("test_workspace/index.md");
		expect(docs).toHaveProperty("test_workspace/contextmap.svg");
		expect(docs).toHaveProperty("_sidebar.md");

		// Check that the sidebar contains the workspace
		expect(docs["_sidebar.md"]).toContain("Test Workspace");

		// Check that the workspace index contains basic info
		const workspaceDoc = docs["test_workspace/index.md"];
		expect(workspaceDoc).toContain("Test Workspace");
		expect(workspaceDoc).toContain("A test workspace");
	});

	it("should generate documentation for workspace with domains", async () => {
		const workspace = new Workspace("eCommerce", {
			odsVersion: "1.0.0",
			description: "eCommerce platform",
			version: "0.1.0",
		});

		const commerce = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
		});

		const _sales = commerce.addSubdomain("Sales", {
			type: "core",
			description: "Sales functionality",
		});

		const docs = await toDoc(workspace);

		// Should have workspace docs (note the actual path format)
		expect(docs).toHaveProperty("e_commerce/index.md");
		expect(docs).toHaveProperty("e_commerce/contextmap.svg");

		// Should have domain docs
		expect(docs).toHaveProperty("domains/commerce/index.md");
		expect(docs).toHaveProperty("domains/commerce/contextmap.svg");

		// Should have subdomain docs
		expect(docs).toHaveProperty("domains/commerce/subdomains/sales/index.md");
		expect(docs).toHaveProperty(
			"domains/commerce/subdomains/sales/contextmap.svg",
		);

		// Check sidebar structure
		const sidebar = docs["_sidebar.md"];
		expect(sidebar).toContain("eCommerce");
		expect(sidebar).toContain("Commerce");
		expect(sidebar).toContain("Sales");
	});

	it("should generate documentation for complex workspace structure", async () => {
		const workspace = new Workspace("Complex System", {
			odsVersion: "1.0.0",
			description: "A complex system",
			version: "0.1.0",
		});

		const commerce = workspace.addDomain("Commerce", {
			description: "Core commerce capabilities",
		});

		const sales = commerce.addSubdomain("Sales", {
			type: "core",
			description: "Sales functionality",
		});

		const ordering = sales.addBoundedcontext("Ordering", {
			description: "Order management",
		});

		const _orderService = ordering.addService("OrderService", {
			description: "Order service",
			type: "domain",
		});

		const _orderAggregate = ordering.addAggregate("Order", {
			description: "Order aggregate",
		});

		const docs = await toDoc(workspace);

		// Should have service docs
		expect(docs).toHaveProperty(
			"boundedcontexts/ordering/services/order_service/index.md",
		);
		expect(docs).toHaveProperty(
			"boundedcontexts/ordering/services/order_service/consumablemap.svg",
		);

		// Should have aggregate docs
		expect(docs).toHaveProperty(
			"boundedcontexts/ordering/aggregates/order/index.md",
		);
		expect(docs).toHaveProperty(
			"boundedcontexts/ordering/aggregates/order/relationmap.svg",
		);
		expect(docs).toHaveProperty(
			"boundedcontexts/ordering/aggregates/order/consumablemap.svg",
		);

		// Check that the bounded context doc contains services and aggregates
		const boundedContextDoc = docs["boundedcontexts/ordering/index.md"];
		expect(boundedContextDoc).toContain("OrderService");
		expect(boundedContextDoc).toContain("Order");
	});

	it("renders provides, schemas and policies from consumables", async () => {
		const workspace = new Workspace("Flow", {
			odsVersion: "1.0.0",
			description: "",
			version: "0.1.0",
		});
		const ordering = workspace.addBoundedContext("Ordering", {
			description: "Order management",
		});
		const summary = ordering.addSchema("Order Summary", {
			description: "What an order looks like",
		});
		summary.addAttribute("orderId", { type: "string", identity: true });
		summary.addAttribute("total", { type: "number" });
		const receipt = ordering.addSchema("Order Receipt", {
			description: "What an approval answers with",
		});
		receipt.addAttribute("approvedAt", { type: "string" });
		const refusal = ordering.addSchema("Approval Refused", {
			description: "Why an approval was declined",
		});
		refusal.addAttribute("reason", { type: "string" });
		// A shape inside a shape: the summary nests the line schema.
		const line = ordering.addSchema("Order Line", {
			description: "One line of an order",
		});
		line.addAttribute("sku", { type: "string" });
		summary.addAttribute("lines", { type: "OrderLine[]", schema: line });
		const order = ordering.addAggregate("Order", { description: "" });
		const placed = order.provides("Order Placed", {
			type: "event",
			pattern: "published-language",
			description: "Raised when an order is placed",
			schema: summary,
		});
		const approve = order
			.provides("Approve Order", {
				type: "operation",
				internal: true,
				description: "Approves an order",
				schema: summary,
				returns: receipt,
				rejects: [refusal],
			})
			.raises(placed);
		// A transition rule names the operation that makes the transition.
		order
			.addInvariant("Approved once", { description: "" })
			.constrains(approve);
		ordering
			.addPolicy("Auto approve", { description: "" })
			.on(placed)
			.issues(approve);

		const docs = await toDoc(workspace);

		const aggregateDoc =
			docs["boundedcontexts/ordering/aggregates/order/index.md"];
		expect(aggregateDoc).not.toContain("## Events");
		expect(aggregateDoc).not.toContain("## Commands");
		// An event has neither Returns nor a rejection, so both columns are a
		// dash, as Raises already is.
		expect(aggregateDoc).toContain(
			"| Order Placed | event | no | published-language | Raised when an order is placed | [Order Summary](../../index.md#schemas) | - | - | - | - |",
		);
		expect(aggregateDoc).toContain(
			"| Approve Order | operation | yes | - | Approves an order | [Order Summary](../../index.md#schemas) | [Order Receipt](../../index.md#schemas) | [Approval Refused](../../index.md#schemas) | Order Placed | Approved once |",
		);

		const contextDoc = docs["boundedcontexts/ordering/index.md"];
		expect(contextDoc).toContain("## Schemas");
		// The nested schema is linked from the type, so a reader can open it.
		expect(contextDoc).toContain(
			"| Order Summary | What an order looks like | **orderId**: `string`, total: `number`, lines: [`OrderLine[]`](./index.md#schemas) | Order Placed, Approve Order |",
		);
		// An invariant that names an operation reads on the aggregate too.
		expect(aggregateDoc).toContain("| Approved once |  | Approve Order |");
		// A schema nothing sends and nothing answers with is still used: it is
		// what Approve Order says no with.
		expect(contextDoc).toContain(
			"| Approval Refused | Why an approval was declined | reason: `string` | Approve Order |",
		);
		// A schema nothing sends is still used: Approve Order answers with it.
		expect(contextDoc).toContain(
			"| Order Receipt | What an approval answers with | approvedAt: `string` | Approve Order |",
		);
		expect(contextDoc).toContain(
			"| Auto approve |  | Order Placed | Approve Order |",
		);
		expect(docs).toHaveProperty("boundedcontexts/ordering/flowmap.svg");
	});

	it("prints a context's own invariants, with the operation that guards each", async () => {
		const workspace = new Workspace("Across", {
			odsVersion: "1.0.0",
			description: "",
			version: "0.1.0",
		});
		const lending = workspace.addBoundedContext("Lending", {
			description: "Loans",
		});
		const application = lending.addAggregate("Application", {
			description: "",
		});
		const root = application.addRootEntity("Application", { description: "" });
		const submit = application.provides("Submit Application", {
			type: "operation",
			description: "Ask for an amount",
		});
		lending
			.addInvariant("One open application per customer", {
				description: "A customer has at most one open application",
			})
			.constrains(root, submit);

		const docs = await toDoc(workspace);
		const contextDoc = docs["boundedcontexts/lending/index.md"];
		expect(contextDoc).toContain("## Invariants");
		expect(contextDoc).toContain(
			"| One open application per customer | A customer has at most one open application | Application, Submit Application |",
		);
		// The rule belongs to the context, so the aggregate page does not claim it.
		expect(
			docs["boundedcontexts/lending/aggregates/application/index.md"],
		).toContain("> No invariants.");
	});

	it("says a context has no invariants across aggregates when it has none", async () => {
		const workspace = new Workspace("Quiet", {
			odsVersion: "1.0.0",
			description: "",
			version: "0.1.0",
		});
		workspace.addBoundedContext("Quiet", { description: "" });
		const docs = await toDoc(workspace);
		expect(docs["boundedcontexts/quiet/index.md"]).toContain(
			"> No invariants across aggregates.",
		);
	});

	it("should emit a docsify shell so the folder is a complete static site", async () => {
		const workspace = new Workspace('Ac"me & <Co>', {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const docs = await toDoc(workspace);

		const shell = docs["index.html"];
		expect(shell).toContain("loadSidebar: true");
		expect(shell).toContain("subMaxLevel: 2");
		// Every page links its diagrams beside itself, not from the site root.
		expect(shell).toContain("relativePath: true");
		expect(shell).toContain('src="https://cdn.jsdelivr.net/npm/docsify@4"');
		expect(shell).toContain(
			'href="https://cdn.jsdelivr.net/npm/docsify@4/lib/themes/vue.css"',
		);
		// No README.md is generated, so a bare `/` has to be sent somewhere real.
		const workspaceIndex = Object.keys(docs).find((k) =>
			k.endsWith("/index.md"),
		);
		const route = JSON.stringify(`#/${workspaceIndex}`);
		expect(shell).toContain(`if (!location.hash) location.hash = ${route};`);
		// Only the root has a _sidebar.md; docsify asks for one per folder.
		expect(shell).toContain('alias: { "/.*/_sidebar.md": "/_sidebar.md" }');
		// The name reaches the title and the config escaped for each context.
		expect(shell).toContain("<title>Ac&quot;me &amp; &lt;Co&gt;</title>");
		expect(shell).toContain('name: "Ac\\"me & <Co>"');
	});

	it("should handle workspace with options", async () => {
		const workspace = new Workspace("Test Workspace", {
			odsVersion: "1.0.0",
			description: "A test workspace",
			version: "0.1.0",
		});

		const options = {
			breadcrumbs: true,
		};

		const docs = await toDoc(workspace, options);

		expect(docs).toHaveProperty("test_workspace/index.md");
		expect(docs).toHaveProperty("_sidebar.md");

		// The docs should still be generated properly with options
		const workspaceDoc = docs["test_workspace/index.md"];
		expect(workspaceDoc).toContain("Test Workspace");
	});

	it("says which root an identity attribute identifies, and links to it", async () => {
		const docs = await toDoc(petstore);
		expect(
			docs["boundedcontexts/sales_bc/aggregates/order/index.md"],
		).toContain(
			"petId: `int64` (identifies [Pet](../../../catalog_bc/aggregates/pet/index.md))",
		);
	});

	it("marks an attribute the source contract does not require as optional", async () => {
		const docs = await toDoc(petstore);
		const catalog = docs["boundedcontexts/catalog_bc/aggregates/pet/index.md"];
		expect(catalog).toContain("tags: `Tag[]` (optional)");
		// Everything always present stays unwritten, identity attributes included.
		expect(catalog).toContain("**id**: `int64`,");
		expect(catalog).not.toContain("**id**: `int64` (optional)");
	});

	it("says what a kind is a kind of, and lists what it has from it beside its own", async () => {
		const ws = new Workspace("Kinds", {
			odsVersion: "1.0.0",
			description: "A model with kinds.",
			version: "1.0.0",
			id: "kinds",
		});
		const bc = ws.addBoundedContext("Catalogue", { description: "Titles." });
		const agg = bc.addAggregate("Title", { description: "One title." });
		const title = agg.addRootEntity("Title", { description: "A title." });
		title.addAttribute("titleId", { type: "string", identity: true });
		const series = agg.addEntity("Series", {
			description: "A title that plays through its episodes.",
			specialises: title,
		});
		series.addAttribute("seasons", { type: "int" });
		const rating = bc.addValueObject("Rating", { description: "A rating." });
		rating.addAttribute("value", { type: "string" });
		bc.addValueObject("House Rating", {
			description: "Our own rating.",
			specialises: rating,
		});

		const docs = await toDoc(ws);
		const aggregate =
			docs["boundedcontexts/catalogue/aggregates/title/index.md"];
		expect(aggregate).toContain("| Entity (a kind of Title) | Series |");
		// Its own attribute first, then what it has from the title, saying whose.
		expect(aggregate).toContain(
			"seasons: `int`, **titleId**: `string` (from Title)",
		);
		const context = docs["boundedcontexts/catalogue/index.md"];
		expect(context).toContain("| House Rating (a kind of Rating) |");
		expect(context).toContain("value: `string` (from Rating)");
	});

	it("groups a context's relationships by what they mean from there, with a Description column", async () => {
		const docs = await toDoc(petstore);

		const salesDoc = docs["boundedcontexts/sales_bc/index.md"];
		expect(salesDoc).toContain("## Context Relationships");
		expect(salesDoc).toContain("### Depends on");
		expect(salesDoc).toContain("### Depended on by");
		expect(salesDoc).toContain("### Works alongside");
		expect(salesDoc).toContain(
			"| With | Description | Type | Upstream Roles | Downstream Roles |",
		);
		// Sales depends on Catalog (customer-supplier), Inventory depends on
		// Sales (upstream-downstream), and Sales works alongside Fulfilment
		// (partnership) and Identity (separate-ways).
		expect(salesDoc).toContain("Catalog");
		expect(salesDoc).toContain("Inventory");
		expect(salesDoc).toContain("Fulfilment");
		expect(salesDoc).toContain("Identity");
	});

	it("falls back to the generated sentence, in italics, when a relationship has no description", async () => {
		const workspace = new Workspace("Bare", {
			odsVersion: "1.0.0",
			description: "One relationship nobody described.",
			version: "0.1.0",
		});
		const catalog = workspace.addBoundedContext("Catalog", {
			description: "Upstream.",
		});
		const sales = workspace.addBoundedContext("Sales", {
			description: "Downstream.",
		});
		catalog.upstreamOf(sales, {
			type: "customer-supplier",
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});

		const docs = await toDoc(workspace);

		// Written from each context, so the same relationship reads two ways.
		expect(docs["boundedcontexts/sales/index.md"]).toContain(
			"| *Sales depends on Catalog as a customer, consuming its Open Host Service, and it protects its model with an Anti-Corruption Layer.* |",
		);
		expect(docs["boundedcontexts/catalog/index.md"]).toContain(
			"| *Catalog acts as an upstream supplier to Sales, exposing an Open Host Service, while Sales protects its model with an Anti-Corruption Layer.* |",
		);
	});

	it("prints each relationship's comments under its group, statement then citation", async () => {
		const docs = await toDoc(petstore);
		const salesDoc = docs["boundedcontexts/sales_bc/index.md"];
		const position = salesDoc.split("## Context Relationships")[1];

		expect(position).toContain("- **Catalog BC** (customer-supplier)");
		expect(position).toContain(
			"\t- Sales reads Catalog through PetSummaryClient, which maps the catalog payload onto the Sales order model. [sales/acl/PetSummaryClient.ts](https://github.com/example/petstore/blob/main/sales/acl/PetSummaryClient.ts)",
		);
		// The comments sit under their own group's table, not another's.
		const dependsOn = position
			.split("### Depends on")[1]
			.split("### Depended on by")[0];
		expect(dependsOn).toContain("- **Catalog BC** (customer-supplier)");
		expect(dependsOn).not.toContain("- **Inventory BC**");
		// Petstore turns comments-required on, so the symmetric pair is explained
		// under its own group too — one of them without a citation to trail it.
		const alongside = position.split("### Works alongside")[1];
		expect(alongside).toContain("- **Fulfilment BC** (partnership)");
		expect(alongside).toContain(
			"\t- Both services ship from one release train; the pipeline deploys sales and fulfilment as a pair and fails the build if only one is tagged.\n",
		);
		expect(alongside).toContain("- **Identity BC** (separate-ways)");
		expect(alongside).toContain(
			"[ADR-007 Anonymous checkout](https://github.com/example/petstore/blob/main/docs/adr/007-anonymous-checkout.md)",
		);
	});

	it("prints a consumable's comments beneath the Provides table that lists it", async () => {
		const docs = await toDoc(petstore);
		const petApp = docs["boundedcontexts/catalog_bc/services/pet_app/index.md"];
		const provides = petApp.split("## Provides")[1].split("## Consumes")[0];

		expect(provides).toContain("- **GetPetSummary**");
		expect(provides).toContain(
			"\t- The summary projection is the only Catalog read Sales is allowed to make. [GET /pets/{id}/summary](https://github.com/example/petstore/blob/main/catalog/openapi.yaml#/paths/~1pets~1{id}~1summary)",
		);
		// The bullets sit under the table, not inside it.
		expect(provides.indexOf("| Name | Type |")).toBeLessThan(
			provides.indexOf("- **GetPetSummary**"),
		);
	});

	it("names what makes a consumption, and says nothing where it is the whole consumer", async () => {
		const docs = await toDoc(petstore);
		const orderApp =
			docs["boundedcontexts/sales_bc/services/order_app/index.md"];
		const consumes = orderApp.split("## Consumes")[1];
		const section = (name: string) =>
			consumes.split(`### ${name}`)[1].split("###")[0];

		expect(section("ReservePetForOrder")).toContain(
			"- **Made by**: ReservePet",
		);
		// Its pair says the same, because `by` is what carries the chain across
		// the boundary and both catalogue transitions are one operation's work.
		expect(section("MarkPetSoldForOrder")).toContain(
			"- **Made by**: MarkPetSold",
		);
		// The read beside them is the process's, which a `by` may name because
		// reacting is the commonest reason a consumption exists (decision 21).
		expect(section("GetPetSummary")).toContain(
			"- **Made by**: Order fulfilment",
		);
		// The line is left off where the whole consumer is the answer, which in
		// this model is every event Inventory's projection takes in.
		const inventory =
			docs["boundedcontexts/inventory_bc/services/inventory_query/index.md"];
		expect(
			inventory
				.split("## Consumes")[1]
				.split("### PetRegistered")[1]
				.split("###")[0],
		).not.toContain("**Made by**");
		// The context page reads the same rows as a table.
		const contextDoc = docs["boundedcontexts/sales_bc/index.md"];
		expect(contextDoc).toContain("| Consumer | Made By |");
		expect(contextDoc).toContain("| ReservePet |");
	});

	it("says what a front reaches, since it raises nothing of its own", async () => {
		const docs = await toDoc(petstore);
		const petApp = docs["boundedcontexts/catalog_bc/services/pet_app/index.md"];
		const provides = petApp.split("## Provides")[1].split("## Consumes")[0];

		// The front declares no raises, so its Raises cell is empty and the
		// sentence beneath the table is what tells a reader the fact still
		// happens (card 77).
		expect(provides).toContain(
			"- **ReservePetForOrder** also reaches PetReserved through the operations it calls, raised where they happen rather than restated here.",
		);
		expect(provides).toContain(
			"- **MarkPetSoldForOrder** also reaches PetSold through the operations it calls, raised where they happen rather than restated here.",
		);
		// An operation that calls nothing says nothing.
		expect(provides).not.toContain("- **GetPetById** also reaches");
	});

	it("prints nothing beneath a Provides table whose consumables carry no comments", async () => {
		const docs = await toDoc(petstore);
		const shipment =
			docs["boundedcontexts/fulfilment_bc/aggregates/shipment/index.md"];
		const provides = shipment.split("## Provides")[1].split("## Consumes")[0];

		expect(provides).toContain("| Name | Type |");
		expect(provides).not.toContain("\n- **");
	});

	it("footnotes every pattern a context's relationship table names, and no others", async () => {
		const docs = await toDoc(petstore);
		const contextDoc = docs["boundedcontexts/sales_bc/index.md"];

		// Sales is downstream of Catalog behind an anti-corruption layer.
		expect(contextDoc).toContain(
			`- \`upstream-downstream\` — **Upstream/Downstream** (U/D). ${PATTERNS["upstream-downstream"].summary}`,
		);
		expect(contextDoc).toContain(
			`- \`anti-corruption-layer\` — **Anti-Corruption Layer** (ACL). ${PATTERNS["anti-corruption-layer"].summary}`,
		);
		// Nothing is explained that the table above does not name.
		const table = contextDoc.split("## Context Relationships")[1];
		const notes = [...table.matchAll(/^- `([\w-]+)` — /gm)].map((m) => m[1]);
		expect(notes.length).toBeGreaterThan(1);
		for (const key of notes)
			expect(table.split(`- \`${key}\``)[0], key).toContain(key);
	});

	it("snapshots the file list produced for the petstore reference workspace", async () => {
		const docs = await toDoc(petstore);

		expect(Object.keys(docs).sort()).toMatchInlineSnapshot(`
			[
			  "_sidebar.md",
			  "boundedcontexts/catalog_bc/aggregates/pet/consumablemap.svg",
			  "boundedcontexts/catalog_bc/aggregates/pet/index.md",
			  "boundedcontexts/catalog_bc/aggregates/pet/relationmap.svg",
			  "boundedcontexts/catalog_bc/contextmap.svg",
			  "boundedcontexts/catalog_bc/index.md",
			  "boundedcontexts/catalog_bc/services/pet_app/consumablemap.svg",
			  "boundedcontexts/catalog_bc/services/pet_app/index.md",
			  "boundedcontexts/fulfilment_bc/aggregates/carrier/consumablemap.svg",
			  "boundedcontexts/fulfilment_bc/aggregates/carrier/index.md",
			  "boundedcontexts/fulfilment_bc/aggregates/carrier/relationmap.svg",
			  "boundedcontexts/fulfilment_bc/aggregates/shipment/consumablemap.svg",
			  "boundedcontexts/fulfilment_bc/aggregates/shipment/index.md",
			  "boundedcontexts/fulfilment_bc/aggregates/shipment/relationmap.svg",
			  "boundedcontexts/fulfilment_bc/contextmap.svg",
			  "boundedcontexts/fulfilment_bc/flowmap.svg",
			  "boundedcontexts/fulfilment_bc/index.md",
			  "boundedcontexts/fulfilment_bc/services/dispatch_planner/consumablemap.svg",
			  "boundedcontexts/fulfilment_bc/services/dispatch_planner/index.md",
			  "boundedcontexts/fulfilment_bc/services/shipment_app/consumablemap.svg",
			  "boundedcontexts/fulfilment_bc/services/shipment_app/index.md",
			  "boundedcontexts/identity_bc/aggregates/user/consumablemap.svg",
			  "boundedcontexts/identity_bc/aggregates/user/index.md",
			  "boundedcontexts/identity_bc/aggregates/user/relationmap.svg",
			  "boundedcontexts/identity_bc/contextmap.svg",
			  "boundedcontexts/identity_bc/index.md",
			  "boundedcontexts/identity_bc/services/user_app/consumablemap.svg",
			  "boundedcontexts/identity_bc/services/user_app/index.md",
			  "boundedcontexts/inventory_bc/contextmap.svg",
			  "boundedcontexts/inventory_bc/flowmap.svg",
			  "boundedcontexts/inventory_bc/index.md",
			  "boundedcontexts/inventory_bc/services/inventory_query/consumablemap.svg",
			  "boundedcontexts/inventory_bc/services/inventory_query/index.md",
			  "boundedcontexts/sales_bc/aggregates/order/consumablemap.svg",
			  "boundedcontexts/sales_bc/aggregates/order/index.md",
			  "boundedcontexts/sales_bc/aggregates/order/relationmap.svg",
			  "boundedcontexts/sales_bc/contextmap.svg",
			  "boundedcontexts/sales_bc/flowmap.svg",
			  "boundedcontexts/sales_bc/index.md",
			  "boundedcontexts/sales_bc/services/order_app/consumablemap.svg",
			  "boundedcontexts/sales_bc/services/order_app/index.md",
			  "domains/identity_&_accounts/contextmap.svg",
			  "domains/identity_&_accounts/index.md",
			  "domains/identity_&_accounts/subdomains/users/contextmap.svg",
			  "domains/identity_&_accounts/subdomains/users/index.md",
			  "domains/petstore_commerce/contextmap.svg",
			  "domains/petstore_commerce/index.md",
			  "domains/petstore_commerce/subdomains/catalog/contextmap.svg",
			  "domains/petstore_commerce/subdomains/catalog/index.md",
			  "domains/petstore_commerce/subdomains/fulfilment/contextmap.svg",
			  "domains/petstore_commerce/subdomains/fulfilment/index.md",
			  "domains/petstore_commerce/subdomains/inventory/contextmap.svg",
			  "domains/petstore_commerce/subdomains/inventory/index.md",
			  "domains/petstore_commerce/subdomains/sales/contextmap.svg",
			  "domains/petstore_commerce/subdomains/sales/index.md",
			  "index.html",
			  "swagger_petstore_(v3)/contextmap.svg",
			  "swagger_petstore_(v3)/glossary.md",
			  "swagger_petstore_(v3)/index.md",
			]
		`);
	});

	it("prints the health report on the workspace page, in the same three lists as the pages surface", async () => {
		const docs = await toDoc(petstore);
		const health = docs["swagger_petstore_(v3)/index.md"]
			.split("## Health")[1]
			.split("## Teams")[0];

		const refactor = health.split("### Refactor")[1].split("### Tolerated")[0];
		expect(refactor).toContain("**Catalog BC ↔ Inventory BC** (shared-kernel)");
		expect(refactor).toContain(
			"[ADR-014 Shrink the kernel](https://github.com/example/petstore/blob/main/docs/adr/014-shrink-the-kernel.md)",
		);

		const tolerated = health
			.split("### Tolerated")[1]
			.split("### No comments")[0];
		expect(tolerated).toContain(
			"**Sales BC → Inventory BC** (upstream-downstream)",
		);
		expect(tolerated).not.toContain("shared-kernel");

		// Petstore turns comments-required on, so the third list is empty.
		expect(health.split("### No comments")[1]).toContain(
			"> Every relationship carries at least one comment.",
		);
	});

	it("says so in each health list a workspace has nothing for", async () => {
		const workspace = new Workspace("Quiet", {
			odsVersion: "1.0.0",
			description: "Two contexts, one unexplained relationship.",
			version: "0.1.0",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		a.upstreamOf(b);

		const health = (await toDoc(workspace))["quiet/index.md"]
			.split("## Health")[1]
			.split("## Teams")[0];

		expect(health).toContain("> Nothing is marked for refactoring.");
		expect(health).toContain("> No compromises recorded.");
		expect(health).toContain("**A → B** (upstream-downstream)");
		expect(health).not.toContain(
			"> Every relationship carries at least one comment.",
		);
	});
});
