import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
	narrativeText,
	PATTERNS,
	relationshipNarrative,
	Workspace,
	WorkspaceSet,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { toDoc, toDocSet } from "./index";
import { pathToIndexMd } from "./lib/paths";
import { northbankMonolith, northbankSet } from "./set.support";

const petstoreSchema = JSON.parse(
	readFileSync(
		join(__dirname, "../../../models/petstore/.ods/petstore.json"),
		"utf8",
	),
);
const petstore = Workspace.fromSchema(petstoreSchema);

describe("toDoc", () => {
	it("writes distinct portable paths and links for adversarial identities", async () => {
		const ws = new Workspace("Docs", { description: "", version: "0" });
		const slash = ws.addDomain("Slash", { description: "", id: "a/b" });
		ws.addDomain("Literal escape", { description: "", id: "a~1b" });
		ws.addDomain("Percent", { description: "", id: "%2F" });
		ws.addDomain("Keyword", { description: "", id: "returns" });
		ws.addDomain("Empty", { description: "", id: "" });
		ws.addDomain("Unicode", { description: "", id: "é" });
		ws.addDomain("Dot", { description: "", id: "." });
		ws.addDomain("Backslash", { description: "", id: "a\\b" });
		ws.addDomain("Case", { description: "", id: "Case" });
		slash.addSubdomain("Empty child", {
			description: "",
			type: "core",
			id: "",
		});

		const docs = await toDoc(ws);
		const slashPath = "domains/_ods_0061007e00310062/index.md";
		const literalPath = "domains/_ods_0061007e003000310062/index.md";
		expect(docs).toHaveProperty(slashPath);
		expect(docs).toHaveProperty(literalPath);
		expect(slashPath).not.toBe(literalPath);
		expect(docs[slashPath]).toContain("(subdomains/_ods_/index.md)");
		expect(docs).toHaveProperty(
			"domains/_ods_0061007e00310062/subdomains/_ods_/index.md",
		);
	});

	it("writes bounded physical components for long identities and links to them", async () => {
		const ws = new Workspace("Long paths", { description: "", version: "0" });
		const longTilde = ws.addDomain("Long tilde", {
			description: "",
			id: "~".repeat(70),
		});
		const literalEscape = ws.addDomain("Literal escape", {
			description: "",
			id: "~0".repeat(70),
		});
		const prefixSpoof = ws.addDomain("Prefix spoof", {
			description: "",
			id: `_ods_long_bc_${"0".repeat(110)}`,
		});
		const child = longTilde.addSubdomain("Child", {
			description: "",
			type: "core",
			id: "child",
		});
		const longSafe = ws.addDomain("Long safe", {
			description: "",
			id: "a".repeat(260),
		});

		const docs = await toDoc(ws);
		const tildePath = pathToIndexMd(longTilde.path);
		const literalPath = pathToIndexMd(literalEscape.path);
		const spoofPath = pathToIndexMd(prefixSpoof.path);
		const safePath = pathToIndexMd(longSafe.path);
		const childPath = pathToIndexMd(child.path);
		expect(
			new Set([tildePath, literalPath, spoofPath, safePath, childPath]).size,
		).toBe(5);
		expect(spoofPath.split("/")).not.toContain(prefixSpoof.id);
		for (const path of Object.keys(docs))
			expect(path.split("/").every((part) => part.length <= 240)).toBe(true);

		const childLink = pathToIndexMd(child.path, longTilde.path);
		expect(docs[tildePath]).toContain(`(${childLink})`);

		const output = mkdtempSync(join(tmpdir(), "ods-long-path-"));
		try {
			for (const [path, contents] of Object.entries(docs)) {
				const destination = join(output, path);
				mkdirSync(dirname(destination), { recursive: true });
				writeFileSync(destination, contents);
			}
			expect(
				readFileSync(join(dirname(join(output, tildePath)), childLink), "utf8"),
			).toContain("# Child (core)");
		} finally {
			rmSync(output, { recursive: true, force: true });
		}
	});
	// NorthBank is no longer one workspace: the standalone regression runs on
	// the monolith the model froze, named as such, and the actual set is
	// covered in set.test.ts and below.
	it("prints aggregate rule timing of the frozen NorthBank monolith before and after JSON round-trip", async () => {
		const workspace = northbankMonolith();
		for (const model of [
			workspace,
			Workspace.fromSchema(workspace.toSchema()),
		]) {
			const docs = await toDoc(model);
			const payment =
				docs[
					"boundedcontexts/payments_hub/aggregates/payment_instruction/index.md"
				];
			const card = docs["boundedcontexts/cards/aggregates/card/index.md"];
			expect(payment).toContain("| Name | Description | When | Constrains |");
			expect(payment).toContain("| FundsAvailableAtInitiation |");
			expect(payment).toMatch(
				/\| FundsAvailableAtInitiation \|[^\n]*\| Checked before \|/,
			);
			expect(payment).toMatch(
				/\| PayerNotPayee \|[^\n]*\| Holds after every change \|/,
			);
			expect(card).toMatch(
				/\| AuthWithinAvailableBalance \|[^\n]*\| Checked after \|/,
			);
		}
	});

	it("prints the same aggregate rule timing from the actual NorthBank set, in the folder of the file that holds each aggregate, before and after JSON round-trip", async () => {
		const set = northbankSet();
		const again = WorkspaceSet.fromSchemas(
			[...set.toSchemas()].map(([file, schema]) => [
				file,
				JSON.parse(JSON.stringify(schema)),
			]),
		);
		for (const model of [set, again]) {
			const docs = await toDocSet(model);
			const payment =
				docs[
					"payments.json/boundedcontexts/payments_hub/aggregates/payment_instruction/index.md"
				];
			const card =
				docs["cards.json/boundedcontexts/cards/aggregates/card/index.md"];
			expect(payment).toContain("| Name | Description | When | Constrains |");
			expect(payment).toMatch(
				/\| FundsAvailableAtInitiation \|[^\n]*\| Checked before \|/,
			);
			expect(payment).toMatch(
				/\| PayerNotPayee \|[^\n]*\| Holds after every change \|/,
			);
			expect(card).toMatch(
				/\| AuthWithinAvailableBalance \|[^\n]*\| Checked after \|/,
			);
			// No page of a set is written where a lone workspace's would be.
			expect(
				docs[
					"boundedcontexts/payments_hub/aggregates/payment_instruction/index.md"
				],
			).toBeUndefined();
		}
	});

	// The process table and the flow map Markdown writes beside it tell one
	// story: Run waits on First's completion and ends on Last's, both through
	// Front (issue #108, twenty-second review).
	it("draws in its flow map the ending its process table names", async () => {
		const ws = new Workspace("Flow", { description: "", version: "0" });
		const bc = ws
			.addDomain("Selling", { description: "" })
			.addSubdomain("Orders", { description: "", type: "core" })
			.addBoundedcontext("Orders", { description: "" });
		const op = (name: string) =>
			bc
				.addService(`${name} Handler`, {
					description: "",
					type: "application",
				})
				.provides(name, {
					description: "",
					type: "operation",
					internal: true,
				});
		const [first, last, front, begin] = ["First", "Last", "Front", "Begin"].map(
			op,
		);
		front!.provider.consumes(first!);
		front!.provider.consumes(last!);
		bc.addProcess("Run", { description: "" })
			.starts(begin!)
			.on(first!.completed())
			.issues(front!)
			.ends(last!.completed());
		for (const model of [ws, Workspace.fromSchema(ws.toSchema())]) {
			expect(model.validate()).toEqual([]);
			const docs = await toDoc(model);
			expect(docs["boundedcontexts/orders/index.md"]).toMatch(
				/\| Run \|[^\n]*\| Begin \| First \(completes\) \| Front \| Last \(completes\) \|/,
			);
			const svg = docs["boundedcontexts/orders/flowmap.svg"];
			expect(svg.match(/>completes</g)).toHaveLength(1);
			expect(svg.match(/>completes \(ends\)</g)).toHaveLength(1);
		}
	});

	// Two refusals sharing a shape id, one local and one kernel-shared, read
	// back from JSON: the table names both, and the flow map draws both.
	it("lists and draws both refusals of one id from two contexts", async () => {
		for (const sameName of [false, true]) {
			const model = kernelPair(sameName);
			expect(model.validate()).toEqual([]);
			const docs = await toDoc(model);
			const svg = docs["boundedcontexts/local/flowmap.svg"];
			if (!sameName) {
				expect(docs["boundedcontexts/local/index.md"]).toContain(
					"| LocalRefusal (answer to Charge), ForeignRefusal (answer to Charge) |",
				);
				expect(svg).toContain(">LocalRefusal<");
				expect(svg).toContain(">ForeignRefusal<");
			} else {
				// The table names each the way the diagram does, not twice
				// as "Decline (answer to Charge)".
				expect(docs["boundedcontexts/local/index.md"]).toContain(
					"| Local / Handler / Charge rejects with Local / Decline, Local / Handler / Charge rejects with Foreign / Decline |",
				);
				for (const label of [
					"Local / Handler / Charge rejects with Foreign / Decline",
					"Local / Handler / Charge rejects with Local / Decline",
				])
					expect(svg).toContain(`>${label}<`);
			}
		}
	});

	// Two timers of one name and length, each counting from an answer that
	// reads "completes": the table says which call each counts from.
	it("names same-named timers in a process table by what each counts from", async () => {
		const ws = kernelPair(false);
		const local = ws.boundedcontexts.get("local")!;
		const handler = local.services.get("handler")!;
		const op = (name: string) =>
			handler.provides(name, {
				description: "",
				type: "operation",
				internal: true,
			});
		const [first, last] = [op("First"), op("Last")];
		const run = local.processes.get("run")!;
		run.issues(first!, last!).on(first!.completed(), last!.completed());
		for (const [id, from] of [
			["late_first", first!],
			["late_last", last!],
		] as const)
			run.on(
				run.addDeadline("Late", {
					id,
					description: "",
					after: "1 day",
					from: from.completed(),
				}),
			);
		const back = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		expect(back.validate()).toEqual([]);
		const md = (await toDoc(back))["boundedcontexts/local/index.md"];
		expect(md).toContain(
			"LocalRefusal (answer to Charge), ForeignRefusal (answer to Charge), First (completes), Last (completes), Late: after 1 day from First completes, Late: after 1 day from Last completes |",
		);
	});

	it("writes mutually anchored deadlines without expanding their chains", async () => {
		const source = mutualDeadlineAnchors();
		for (const workspace of [
			source,
			Workspace.fromSchema(JSON.parse(JSON.stringify(source.toSchema()))),
		]) {
			expect(workspace.validate()).toEqual([]);
			const docs = await toDoc(workspace);
			expect(docs["boundedcontexts/orders/index.md"]).toContain(
				"A (after 1 day from B), B (after 1 day from A)",
			);
			const svg = docs["boundedcontexts/orders/flowmap.svg"];
			for (const label of ["after 1 day from A", "after 1 day from B"])
				expect(svg).toContain(`>${label}<`);
		}
	});

	it("should generate documentation for empty workspace", async () => {
		const workspace = new Workspace("Test Workspace", {
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
		// An answer that is a list of a shape: the Returns cell says "many"
		// rather than naming a wrapper schema (decision 13, amended).
		const digest = ordering.addSchema("Order Digest", {
			description: "One order in a list of them",
		});
		digest.addAttribute("orderId", { type: "string", identity: true });
		order.provides("List Orders", {
			type: "operation",
			description: "Lists the orders",
			returns: { of: digest, many: true },
		});
		// A request that is a list of a shape, printed the way an answer is,
		// and a refusal that enumerates its outcomes (decisions 13 and 25,
		// amended; card 114).
		order.provides("Import Orders", {
			type: "operation",
			description: "Imports a batch of orders",
			schema: { of: digest, many: true },
			rejects: [{ schema: refusal, reasons: ["duplicate", "unknown_sku"] }],
		});
		// A refusal that is a list of a shape, printed the way a request and an
		// answer are: a root array of field errors rather than a wrapper
		// (decision 13, second amendment; card 130).
		order.provides("Validate Orders", {
			type: "operation",
			description: "Validates a batch of orders",
			schema: { of: digest, many: true },
			rejects: [{ schema: refusal, many: true }],
		});
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

		expect(aggregateDoc).toContain(
			"| List Orders | operation | no | - | Lists the orders | - | many [Order Digest](../../index.md#schemas) | - | - | - |",
		);
		expect(aggregateDoc).toContain(
			"| Import Orders | operation | no | - | Imports a batch of orders | many [Order Digest](../../index.md#schemas) | - | [Approval Refused](../../index.md#schemas) (duplicate, unknown_sku) | - | - |",
		);
		expect(aggregateDoc).toContain(
			"| Validate Orders | operation | no | - | Validates a batch of orders | many [Order Digest](../../index.md#schemas) | - | many [Approval Refused](../../index.md#schemas) | - | - |",
		);

		const contextDoc = docs["boundedcontexts/ordering/index.md"];
		expect(contextDoc).toContain("## Schemas");
		// The nested schema is linked from the type, so a reader can open it.
		expect(contextDoc).toContain(
			"| Order Summary | What an order looks like | **orderId**: `string`, total: `number`, lines: [`OrderLine[]`](./index.md#schemas) | [Order Placed](aggregates/order/index.md) (event), [Approve Order](aggregates/order/index.md) (operation) |",
		);
		// An invariant that names an operation reads on the aggregate too.
		expect(aggregateDoc).toContain(
			"| Approved once |  | Holds after every change | Approve Order |",
		);
		// A schema nothing sends and nothing answers with is still used: it is
		// what Approve Order says no with.
		expect(contextDoc).toContain(
			"| Approval Refused | Why an approval was declined | reason: `string` | [Approve Order](aggregates/order/index.md) (operation), [Import Orders](aggregates/order/index.md) (operation), [Validate Orders](aggregates/order/index.md) (operation) |",
		);
		// A schema nothing sends is still used: Approve Order answers with it.
		expect(contextDoc).toContain(
			"| Order Receipt | What an approval answers with | approvedAt: `string` | [Approve Order](aggregates/order/index.md) (operation) |",
		);
		expect(contextDoc).toContain(
			"| Auto approve |  | Order Placed | Approve Order |",
		);
		expect(docs).toHaveProperty("boundedcontexts/ordering/flowmap.svg");
	});

	it("prints a context's own invariants, with the operation that guards each", async () => {
		const workspace = new Workspace("Across", {
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
			"| One open application per customer | A customer has at most one open application | Checked by | Application, Submit Application |",
		);
		// The rule belongs to the context, so the aggregate page does not claim it.
		expect(
			docs["boundedcontexts/lending/aggregates/application/index.md"],
		).toContain("> No invariants.");
	});

	it("distinguishes a context check before a call from a guarantee of its answer", async () => {
		const workspace = new Workspace("Quotes", {
			description: "",
			version: "test",
		});
		const context = workspace
			.addDomain("Sales", { description: "" })
			.addSubdomain("Quoting", { description: "", type: "core" })
			.addBoundedcontext("Quotes", { description: "" });
		const request = context.addSchema("Request", { description: "" });
		const requestedAmount = request.addAttribute("amount", { type: "number" });
		const answer = context.addSchema("Answer", { description: "" });
		const returnedAmount = answer.addAttribute("amount", { type: "number" });
		const service = context.addService("Quoter", {
			type: "application",
			description: "",
		});
		const quote = service.provides("Quote", {
			type: "operation",
			description: "",
			internal: true,
			schema: request,
			returns: answer,
		});
		context
			.addInvariant("PositiveRequest", {
				description: "The requested amount is positive.",
				precondition: true,
			})
			.constrains(requestedAmount, quote);
		context
			.addInvariant("NonnegativeAnswer", {
				description: "The returned amount is nonnegative.",
				postcondition: true,
			})
			.constrains(returnedAmount, quote);

		for (const ws of [
			workspace,
			Workspace.fromSchema(JSON.parse(JSON.stringify(workspace.toSchema()))),
		]) {
			expect(ws.validate()).toEqual([]);
			const docs = await toDoc(ws);
			const page = docs["boundedcontexts/quotes/index.md"];
			expect(page).toContain("| Name | Description | Check | Constrains |");
			expect(page).toContain(
				"| PositiveRequest | The requested amount is positive. | Checked before | Request.amount, Quote |",
			);
			expect(page).toContain(
				"| NonnegativeAnswer | The returned amount is nonnegative. | Checked after | Answer.amount, Quote |",
			);
			expect(page).not.toContain(
				"each names the operation that checks it before acting",
			);
		}
	});

	it("calls an external event postcondition a payload guarantee", async () => {
		const workspace = new Workspace("Feeds", {
			description: "",
			version: "test",
		});
		const context = workspace.addBoundedContext("Scheme", {
			description: "",
			external: true,
		});
		const payload = context.addSchema("Notification", { description: "" });
		const amount = payload.addAttribute("amount", { type: "number" });
		const service = context.addService("Feed", {
			type: "application",
			description: "",
		});
		const captured = service.provides("Captured", {
			type: "event",
			description: "",
			pattern: "published-language",
			schema: payload,
		});
		context
			.addInvariant("NonnegativeCapture", {
				description: "The captured amount is nonnegative.",
				postcondition: true,
			})
			.constrains(amount, captured);

		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			expect(ws.validate().filter((d) => d.severity === "error")).toEqual([]);
			const page = (await toDoc(ws))["boundedcontexts/scheme/index.md"];
			expect(page).toContain(
				"| NonnegativeCapture | The captured amount is nonnegative. | Guaranteed on event | Notification.amount, Captured |",
			);
			expect(page).not.toContain("checks it before acting");
		}

		const lookup = service.provides("Get Capture", {
			type: "operation",
			description: "",
			pattern: "open-host-service",
			returns: payload,
		});
		context.invariants.get("nonnegative_capture")!.constrains(lookup);
		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			expect(ws.validate().filter((d) => d.severity === "error")).toEqual([]);
			const page = (await toDoc(ws))["boundedcontexts/scheme/index.md"];
			expect(page).toContain(
				"| NonnegativeCapture | The captured amount is nonnegative. | Guaranteed by | Notification.amount, Captured, Get Capture |",
			);
		}
	});

	it("says a context has no invariants across aggregates when it has none", async () => {
		const workspace = new Workspace("Quiet", {
			description: "",
			version: "0.1.0",
		});
		workspace.addBoundedContext("Quiet", { description: "" });
		const docs = await toDoc(workspace);
		expect(docs["boundedcontexts/quiet/index.md"]).toContain(
			"> No context invariants declared.",
		);
	});

	it("should emit a docsify shell so the folder is a complete static site", async () => {
		const workspace = new Workspace('Ac"me & <Co>', {
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

	it("falls back to the generated sentence, in italics and marked generated, when a relationship has no description", async () => {
		const workspace = new Workspace("Bare", {
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
			"| *Sales depends on Catalog as a customer, consuming its Open Host Service, and it protects its model with an Anti-Corruption Layer.* (generated) |",
		);
		expect(docs["boundedcontexts/catalog/index.md"]).toContain(
			"| *Catalog acts as an upstream supplier to Sales, exposing an Open Host Service, while Sales protects its model with an Anti-Corruption Layer.* (generated) |",
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
		// The read beside them is CheckAndApproveOrder's: a call is made by an
		// operation, and the process that issues it is not one
		// (`consumption-by-operation`, card 92).
		expect(section("GetPetSummary")).toContain(
			"- **Made by**: CheckAndApproveOrder",
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
			  "_ods_0073007700610067006700650072005f00700065007400730074006f00720065005f0028007600330029/contextmap.svg",
			  "_ods_0073007700610067006700650072005f00700065007400730074006f00720065005f0028007600330029/glossary.md",
			  "_ods_0073007700610067006700650072005f00700065007400730074006f00720065005f0028007600330029/index.md",
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
			  "domains/_ods_006900640065006e0074006900740079005f0026005f006100630063006f0075006e00740073/contextmap.svg",
			  "domains/_ods_006900640065006e0074006900740079005f0026005f006100630063006f0075006e00740073/index.md",
			  "domains/_ods_006900640065006e0074006900740079005f0026005f006100630063006f0075006e00740073/subdomains/users/contextmap.svg",
			  "domains/_ods_006900640065006e0074006900740079005f0026005f006100630063006f0075006e00740073/subdomains/users/index.md",
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
			]
		`);
	});

	it("prints the health report on the workspace page, in the same three lists as the pages surface", async () => {
		const docs = await toDoc(petstore);
		const health = docs[pathToIndexMd(petstore.path)]
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

	// Each of the three context flags says something different about what a
	// reader may expect to find behind the boundary, so the page says which
	// (decision 28, sixth amendment; card 132).
	it("calls out a context modelled at its boundary only, and nothing else", async () => {
		const workspace = new Workspace("Adopting", {
			description: "One interviewed and one not.",
			version: "0.1.0",
		});
		workspace.addBoundedContext("CRM", {
			description: "Ours, at its boundary only.",
			boundaryOnly: true,
		});
		workspace.addBoundedContext("Payments", { description: "Interviewed." });

		const docs = await toDoc(workspace);
		expect(docs["boundedcontexts/crm/index.md"]).toContain(
			"> **Boundary only.** A context of ours nobody has interviewed yet",
		);
		expect(docs["boundedcontexts/payments/index.md"]).not.toContain(
			"Boundary only",
		);
	});

	it("does not make an upstream holder a user of a downstream value-object kind", async () => {
		const workspace = new Workspace("Borrowing", {
			description: "Directional value-object borrowing.",
			version: "0.1.0",
		});
		const accounts = workspace.addBoundedContext("Accounts", {
			description: "Accounts.",
		});
		const cards = workspace.addBoundedContext("Cards", {
			description: "Cards.",
		});
		accounts.upstreamOf(cards, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const money = accounts.addValueObject("Money", { description: "Money." });
		const fee = cards.addValueObject("Fee", {
			description: "A kind of money.",
			specialises: money,
		});
		const account = accounts.addAggregate("Account", {
			description: "Account.",
		});
		account
			.addRootEntity("Account", { description: "Account." })
			.addAttribute("balance", { type: "Money", valueobject: money });
		const card = cards.addAggregate("Card", { description: "Card." });
		card
			.addRootEntity("Card", { description: "Card." })
			.addAttribute("fee", { type: "Fee", valueobject: fee });

		const context = (await toDoc(workspace))["boundedcontexts/cards/index.md"];
		const feeRow = context
			.split("\n")
			.find((line) => line.startsWith("| Fee "));
		expect(feeRow).toContain("[Card](aggregates/card/index.md)");
		expect(feeRow).not.toContain("Accounts / Account");
	});

	it("lists a kind's inherited identity as a schema user, without a carrier", async () => {
		const workspace = new Workspace("Identity", {
			description: "Inherited identity.",
			version: "0.1.0",
		});
		const local = workspace.addBoundedContext("Local", {
			description: "Local.",
		});
		const provider = workspace.addBoundedContext("Provider", {
			description: "Provider.",
			external: true,
		});
		const payment = provider.addSchema("ProviderPayment");
		const reference = local.addValueObject("PaymentReference", {
			description: "Payment identity.",
		});
		reference.addAttribute("providerPaymentId", {
			type: "string",
			identifies: payment,
		});
		local.addValueObject("CardPaymentReference", {
			description: "Card payment identity.",
			specialises: reference,
		});

		const context = (await toDoc(workspace))[
			"boundedcontexts/provider/index.md"
		];
		const row = context
			.split("\n")
			.find((line) => line.startsWith("| ProviderPayment |"));
		expect(row).toContain("[Local / PaymentReference]");
		expect(row).toContain("[Local / CardPaymentReference]");
		expect(row?.match(/\(value object, identity\)/g)).toHaveLength(2);
	});

	it("treats an empty or whitespace-only relationship description as generated", async () => {
		const workspace = new Workspace("Blank", {
			description: "Relationships with blank descriptions.",
			version: "0.1.0",
		});
		const hub = workspace.addBoundedContext("Hub", { description: "The hub." });
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		const empty = hub.upstreamOf(a, { description: "" });
		const blank = hub.upstreamOf(b, { description: "  \t" });

		const docs = await toDoc(workspace);
		const table = docs["boundedcontexts/hub/index.md"].split(
			"## Context Relationships",
		)[1];
		for (const r of [empty, blank])
			expect(table).toContain(
				`| *${narrativeText(relationshipNarrative(r, hub))}* (generated) |`,
			);
	});

	it("marks a generated relationship description as generated and prints an authored one verbatim", async () => {
		const workspace = new Workspace("Provenance", {
			description: "Two relationships, one described.",
			version: "0.1.0",
		});
		const hub = workspace.addBoundedContext("Hub", { description: "The hub." });
		const written = workspace.addBoundedContext("Written", {
			description: "Has an authored relationship.",
		});
		const silent = workspace.addBoundedContext("Silent", {
			description: "Has none.",
		});
		const authored = "A sentence somebody chose to write.";
		hub.upstreamOf(written, { description: authored });
		const generatedRel = hub.upstreamOf(silent);

		const docs = await toDoc(workspace);
		const table = docs["boundedcontexts/hub/index.md"]
			.split("## Context Relationships")[1]
			.split("\n")
			.filter((line) => line.startsWith("|"));
		const sentence = narrativeText(relationshipNarrative(generatedRel, hub));
		const rowFor = (name: string) =>
			table.find((line) => line.startsWith(`| ${name} `)) as string;

		expect(rowFor("Silent")).toContain(`| *${sentence}* (generated) |`);
		expect(rowFor("Written")).toContain(`| ${authored} |`);
		expect(rowFor("Written")).not.toContain("generated");
	});
});

function kernelPair(sameName: boolean) {
	const ws = new Workspace("Refs", { description: "", version: "0" });
	const served = ws
		.addDomain("Payments", { description: "" })
		.addSubdomain("Charging", { description: "", type: "core" });
	const local = ws
		.addBoundedContext("Local", { description: "" })
		.serves(served);
	const foreign = ws
		.addBoundedContext("Foreign", { description: "" })
		.serves(served);
	local.sharesKernelWith(foreign);
	const shape = (owner: typeof local, name: string) => {
		const schema = owner.addSchema(sameName ? "Decline" : name, {
			id: "decline",
		});
		schema.addAttribute("why", { type: "string" });
		return schema;
	};
	const refusals = [
		shape(local, "LocalRefusal"),
		shape(foreign, "ForeignRefusal"),
	];
	const handler = local.addService("Handler", {
		description: "",
		type: "application",
	});
	const event = (name: string) =>
		handler.provides(name, { description: "", type: "event", internal: true });
	const start = event("Start");
	const done = event("Done");
	handler
		.provides("Seed", { description: "", type: "operation", internal: true })
		.raises(start);
	const charge = handler
		.provides("Charge", {
			description: "",
			type: "operation",
			internal: true,
			rejects: refusals,
		})
		.raises(done);
	local
		.addProcess("Run", { description: "" })
		.starts(start)
		.issues(charge)
		.on(...refusals.map((it) => charge.rejected(it)))
		.ends(done);
	// Read back from JSON, so the readers draw what the file says.
	return Workspace.fromSchema(JSON.parse(JSON.stringify(ws.toSchema())));
}

function mutualDeadlineAnchors() {
	const ws = new Workspace("Timers", { description: "", version: "0" });
	const served = ws
		.addDomain("Delivery", { description: "" })
		.addSubdomain("Orders", { description: "", type: "core" });
	const bc = ws.addBoundedContext("Orders", { description: "" }).serves(served);
	const app = bc.addService("Handler", {
		description: "",
		type: "application",
	});
	const event = (name: string) =>
		app.provides(name, { description: "", type: "event", internal: true });
	const start = event("Start");
	const done = event("Done");
	app
		.provides("Seed", { description: "", type: "operation", internal: true })
		.raises(start);
	const act = app
		.provides("Act", { description: "", type: "operation", internal: true })
		.raises(done);
	const run = bc
		.addProcess("Run", { description: "" })
		.starts(start)
		.issues(act)
		.ends(done);
	const a = run.addDeadline("A", { description: "", after: "1 day" });
	const b = run.addDeadline("B", { description: "", after: "1 day" });
	run.on(a, b);
	a.countsFrom(b);
	b.countsFrom(a);
	return ws;
}
