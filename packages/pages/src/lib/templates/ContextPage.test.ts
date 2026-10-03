import {
	type BoundedContext,
	Workspace,
} from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import {
	edgeCaseModel,
	petstoreModel,
	petstoreSales,
	referenceModels,
	rivermartModel,
} from "../fixtures";
import { installXyflowTestEnv } from "../xyflow-test-env";
import ContextPage, { sections } from "./ContextPage.svelte";

installXyflowTestEnv();

const page = (
	model: ReturnType<typeof petstoreModel>,
	context: BoundedContext,
) => render(Harness, { model, component: ContextPage, args: { context } });

describe("ContextPage", () => {
	it("names its eight sections for the table of contents", () => {
		expect(sections.map((s) => s.id)).toEqual([
			"position",
			"model",
			"invariants",
			"values",
			"integration",
			"reactions",
			"schemas",
			"language",
		]);
	});

	it("heads the page with the lockup, the subdomains it serves and its team, and no chips", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const title = screen.getByRole("heading", { level: 1 });
		expect(title.querySelector(".detail")).toHaveTextContent("Bounded context");
		// The header's own facts; the expanded relationship rows below have
		// definition lists of their own.
		const header = container.querySelector(".page-header") as HTMLElement;
		expect(
			[...header.querySelectorAll("dt")].map((dt) => dt.textContent),
		).toEqual(["Serves", "Owned by"]);
		expect(container.querySelector(".chip, .pill")).toBeNull();
	});

	it("replaces the aggregate cards with one table whose counts are numeric columns", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const modelSection = container.querySelector("#model") as HTMLElement;
		expect(
			[...modelSection.querySelectorAll("table")[0].querySelectorAll("th")].map(
				(th) => th.textContent?.trim(),
			),
		).toEqual([
			"Aggregate",
			"Root",
			"Entities",
			"Value objects",
			"Invariants",
			"Operations",
			"Events",
			"Description",
		]);
		expect(modelSection.querySelectorAll("td.numeric").length).toBeGreaterThan(
			0,
		);
		expect(container.querySelector(".card, .grid")).toBeNull();
	});

	it("names a foreign kind when an aggregate holds a parent's value through it", () => {
		const workspace = new Workspace("Family", {
			description: "",
			version: "test",
		});
		const kernel = workspace.addBoundedContext("Kernel", { description: "" });
		const cards = workspace.addBoundedContext("Cards", { description: "" });
		kernel.upstreamOf(cards, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["conformist"],
		});
		const money = kernel.addValueObject("Money", { description: "" });
		const fee = cards.addValueObject("Fee", {
			description: "",
			specialises: money,
		});
		const card = cards.addAggregate("Card", { description: "" });
		card
			.addEntity("Card", { description: "", root: true })
			.addAttribute("fee", { type: "Fee", valueobject: fee });
		kernel
			.addAggregate("Account", { description: "" })
			.addEntity("Account", { description: "", root: true })
			.addAttribute("balance", { type: "Money", valueobject: money });
		const model = { workspace, fileLabel: "family.json", diagnostics: [] };
		const { container } = page(model, kernel);
		const values = container.querySelector("#values") as HTMLElement;
		expect(values).toHaveTextContent("Cards / Card");
		expect(values).toHaveTextContent("Cards / Fee");
		expect(values).toHaveTextContent("through Cards / Fee");
		expect(values).not.toHaveTextContent("nothing");
		const cardsPage = page(model, cards);
		const feeRow = cardsPage.container.querySelector(
			`[id="${fee.ref}"]`,
		) as HTMLElement;
		expect(feeRow).toHaveTextContent("Card");
		expect(feeRow).not.toHaveTextContent("Kernel / Account");
	});

	it("does not deny borrowed values and payloads when it declares neither locally", () => {
		const workspace = new Workspace("Borrowing", {
			description: "",
			version: "test",
		});
		const subdomain = workspace
			.addDomain("Bank", { description: "" })
			.addSubdomain("Banking", { description: "", type: "core" });
		const ledger = subdomain.addBoundedcontext("Ledger", {
			description: "",
		});
		const cards = subdomain.addBoundedcontext("Cards", {
			description: "",
		});
		ledger.sharesKernelWith(cards);
		const money = ledger.addValueObject("Money", { description: "" });
		money.addAttribute("amount", { type: "int" });
		const request = ledger.addSchema("CardRequest");
		request.addAttribute("amount", { type: "Money", valueobject: money });
		const card = cards.addAggregate("Card", { description: "" });
		const root = card.addRootEntity("Card", { description: "" });
		root.addAttribute("id", { type: "string", identity: true });
		root.addAttribute("balance", { type: "Money", valueobject: money });
		card.provides("Adjust", {
			type: "operation",
			description: "",
			internal: true,
			schema: request,
		});

		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			expect(ws.validate()).toEqual([]);
			const context = ws.getBoundedContextByRefOrThrow(cards.ref);
			const model = {
				workspace: ws,
				fileLabel: "borrowing.json",
				diagnostics: [],
			};
			const { container } = page(model, context);
			expect(container.querySelector("#values")).toHaveTextContent(
				"No value objects declared in this context.",
			);
			expect(container.querySelector("#schemas")).toHaveTextContent(
				"No schemas declared in this context.",
			);
			expect(container).not.toHaveTextContent(
				"Every attribute here is a bare type.",
			);
			expect(container).not.toHaveTextContent(
				"Consumables carry no declared payload.",
			);
		}
	});

	it("lists a value-object kind that inherits an identity naming an external schema", () => {
		const workspace = new Workspace("Identity", {
			description: "",
			version: "test",
		});
		const local = workspace.addBoundedContext("Local", { description: "" });
		const provider = workspace.addBoundedContext("Provider", {
			description: "",
			external: true,
		});
		const payment = provider.addSchema("ProviderPayment");
		const parent = local.addValueObject("PaymentReference", {
			description: "",
		});
		parent.addAttribute("providerPaymentId", {
			type: "string",
			identifies: payment,
		});
		local.addValueObject("CardPaymentReference", {
			description: "",
			specialises: parent,
		});
		const model = { workspace, fileLabel: "identity.json", diagnostics: [] };
		const { container } = page(model, provider);
		const heading = container.querySelector(
			`[id="${payment.ref}"]`,
		) as HTMLElement;
		expect(heading).toHaveTextContent("Local / PaymentReference");
		expect(heading).toHaveTextContent("Local / CardPaymentReference");
		expect(heading.querySelectorAll(".keyword")).toHaveLength(4);
		expect(heading).not.toHaveTextContent("unused");
	});

	it("lists the integration surface, the policies and the language as tables", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const integration = container.querySelector("#integration") as HTMLElement;
		expect(integration.querySelectorAll("table")).toHaveLength(2);
		expect(integration.querySelector("figure.diagram")).toBeInTheDocument();

		const language = container.querySelector("#language") as HTMLElement;
		expect(
			[...language.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Term", "Definition", "Also", "Embodied by"]);
	});

	it("holds both reaction tables in one section with the map under the pair", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const reactions = container.querySelector("#reactions") as HTMLElement;
		expect(reactions.querySelector("h2")).toHaveTextContent("Reactions");
		// The paired level-3 headings are the fixed shape of the section, and
		// the map summarises both, so it comes last (card 34, card 88).
		expect(
			[...reactions.querySelectorAll("h3")].map((h) =>
				h.textContent?.replace(/\d+$/, "").trim(),
			),
		).toEqual(["Policies", "Processes"]);
		// Sales declares no policy, so that half is its empty sentence; the
		// pair of headings stays either way (card 34).
		expect(
			[...reactions.querySelectorAll("h3, table, p.empty, figure.diagram")].map(
				(el) => el.className.split(" ")[0],
			),
		).toEqual(["heading", "empty", "heading", "data", "diagram"]);
		// The badge counts the reactions of both kinds together.
		expect(reactions.querySelector("h2 .count")).toHaveTextContent("1");
	});

	it("reads a process across its row, from what starts it to what ends it", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const processes = container.querySelector(
			"#reactions table",
		) as HTMLElement;
		expect(
			[...processes.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual([
			"Process",
			"Starts",
			"While it runs",
			"Then",
			"Ends",
			"Description",
		]);
		const row = processes.querySelector("tbody tr") as HTMLElement;
		expect(row).toHaveTextContent("Order fulfilment");
		expect(row).toHaveTextContent("OrderPlaced");
		expect(row).toHaveTextContent("PetStatusChanged");
		expect(row).toHaveTextContent("OrderDelivered");
	});

	it("says nothing four times over for a process with an empty lifecycle", () => {
		const model = edgeCaseModel();
		const main = model.workspace.boundedcontexts.get(
			"main_context",
		) as BoundedContext;
		const { container } = page(model, main);
		const row = container
			.querySelectorAll("#reactions table")[1]
			?.querySelector("tbody tr") as HTMLElement;
		expect(row).toHaveTextContent("Idle Process");
		// Nothing to start it and nothing to end it are the two the model warns
		// about, so those two read as warnings and the middle two do not.
		const words = [...row.querySelectorAll(".keyword")];
		expect(words.map((w) => w.textContent)).toEqual([
			"nothing",
			"nothing",
			"nothing",
			"nothing",
		]);
		expect(words.filter((w) => w.classList.contains("warn"))).toHaveLength(2);
	});

	it("makes each schema a subsection with its attribute table, naming what uses it", () => {
		const { model, context } = petstoreSales();
		const { container } = page(model, context);
		const schemas = container.querySelector("#schemas") as HTMLElement;
		expect(schemas.querySelector(".carried")).toHaveTextContent("used by");
		expect(schemas.querySelectorAll("h3").length).toBeGreaterThan(0);
		expect(schemas.querySelector("table")).toBeInTheDocument();
	});

	it("says what would fill every empty branch of a context with almost nothing in it", () => {
		const model = edgeCaseModel();
		const thin = model.workspace.boundedcontexts.get(
			"thin_context",
		) as BoundedContext;
		const { container } = page(model, thin);
		expect(screen.getByText("No aggregates yet.")).toBeInTheDocument();
		// The Services subsection stays on the page when there are none, its
		// heading unbadged: the shape of the model is the information.
		const services = [...container.querySelectorAll("#model h3")].find((h) =>
			h.textContent?.includes("Services"),
		) as HTMLElement;
		expect(services).toBeInTheDocument();
		expect(services.querySelector(".count")).toBeNull();
		expect(screen.getByText("No services.")).toBeInTheDocument();
		expect(screen.getByText("Provides nothing.")).toBeInTheDocument();
		expect(screen.getByText("Consumes no consumables.")).toBeInTheDocument();
		expect(screen.getByText("No policies.")).toBeInTheDocument();
		expect(
			screen.getByText(
				"No processes. Nothing here waits for more than one event before it acts.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("No schemas declared in this context."),
		).toBeInTheDocument();
		expect(
			screen.getByText(
				"No glossary yet. Naming things is the first act of modelling.",
			),
		).toBeInTheDocument();
		// No subdomain and no team is two plain words, not two empty cells.
		expect(screen.getByText("no subdomain")).toHaveClass("keyword");
		expect(screen.getByText("no owning team")).toHaveClass("keyword");
	});

	it("warns on an aggregate with no root, an unused schema, an unmodelled term and a policy that fires on nothing", () => {
		const model = edgeCaseModel();
		const main = model.workspace.boundedcontexts.get(
			"main_context",
		) as BoundedContext;
		const { container } = page(model, main);
		expect(screen.getAllByText("no root")[0]).toHaveClass("warn");
		expect(screen.getByText("unused")).toHaveClass("keyword");
		expect(screen.getAllByText("not modelled").length).toBeGreaterThan(0);
		// The idle policy fires on nothing and issues nothing, the completion
		// policy issues nothing, the idle process starts on nothing, waits for
		// nothing, issues nothing and ends on nothing, the timed one issues
		// nothing, and none of the context's three value objects is held by an
		// aggregate.
		expect(screen.getAllByText("nothing").length).toBe(11);
		expect(
			screen.getByText("The schema has no attributes."),
		).toBeInTheDocument();
		// A term with no alias says so rather than leaving the cell blank.
		expect(container.querySelector("#language")).toHaveTextContent("–");
	});

	it("marks a big ball of mud after the title", () => {
		// RiverMart's, since petstore's one unread context is boundary-only
		// rather than a mess (card 132).
		const model = rivermartModel();
		const mud = [...model.workspace.boundedcontexts.values()].find(
			(bc) => bc.bigBallOfMud,
		) as BoundedContext;
		const { container } = page(model, mud);
		expect(container.querySelector(".meta .keyword")).toHaveClass("warn");
	});

	// The third context flag reads as a plain keyword, not a warning: it says
	// nobody has interviewed the context, not that its model is a mess.
	it("marks a context modelled at its boundary only after the title", () => {
		const model = petstoreModel();
		const unread = [...model.workspace.boundedcontexts.values()].find(
			(bc) => bc.boundaryOnly,
		) as BoundedContext;
		const { container } = page(model, unread);
		const keyword = container.querySelector(".meta .keyword") as HTMLElement;
		expect(keyword).toHaveTextContent("boundary only");
		expect(keyword).not.toHaveClass("warn");
	});

	describe("glossary columns", () => {
		const headersOf = (language: HTMLElement) =>
			[...language.querySelectorAll("thead th")].map((th) => ({
				text: th.textContent?.trim(),
				grow: th.classList.contains("grow"),
			}));
		const expectDefinitionGrows = (container: HTMLElement) => {
			const language = container.querySelector("#language") as HTMLElement;
			// Exactly one column grows, and it is the prose: Definition.
			expect(headersOf(language)).toEqual([
				{ text: "Term", grow: false },
				{ text: "Definition", grow: true },
				{ text: "Also", grow: false },
				{ text: "Embodied by", grow: false },
			]);
			const rows = [...language.querySelectorAll("tbody tr")];
			expect(rows.length).toBeGreaterThan(0);
			for (const row of rows)
				expect(
					[...row.querySelectorAll("td")].map((td) =>
						td.classList.contains("grow"),
					),
				).toEqual([false, true, false, false]);
			expect(language.querySelectorAll("th.grow")).toHaveLength(1);
		};

		it("gives the width to Definition, not Embodied by, in the petstore's sales context", () => {
			const { model, context } = petstoreSales();
			const { container } = page(model, context);
			expectDefinitionGrows(container);
		});

		it("gives the width to Definition, not Embodied by, in northbank's Customer & KYC", () => {
			const northbank = referenceModels().find(
				(m) => m.workspace.name === "NorthBank",
			) as ReturnType<typeof referenceModels>[number];
			const context = northbank.workspace.boundedcontexts.get(
				"customer_&_kyc",
			) as BoundedContext;
			const { container } = page(northbank, context);
			expectDefinitionGrows(container);
			const language = container.querySelector("#language") as HTMLElement;
			expect(language).toHaveTextContent("A verified person");
		});
	});

	describe("Serves fact", () => {
		it("lists each subdomain as one item holding its lockup and its classification, with no comma authored in the markup", () => {
			const northbank = referenceModels().find(
				(m) => m.workspace.name === "NorthBank",
			) as ReturnType<typeof referenceModels>[number];
			const context = northbank.workspace.boundedcontexts.get(
				"customer_&_kyc",
			) as BoundedContext;
			const { container } = page(northbank, context);
			const joined = container.querySelector(
				"header dd .joined",
			) as HTMLElement;
			const items = [...joined.children] as HTMLElement[];
			expect(items).toHaveLength(context.subdomains.size);
			expect(items.length).toBeGreaterThan(1);
			for (const [i, subdomain] of [...context.subdomains].entries()) {
				const item = items[i];
				expect(item).toHaveClass("serves");
				// A lockup and its classification keyword travel together.
				expect(item.querySelectorAll(".lockup")).toHaveLength(1);
				expect(item.querySelector(".lockup")).toHaveTextContent(subdomain.name);
				expect(item.querySelector(".keyword")).toHaveTextContent(
					subdomain.type,
				);
				expect(item.textContent).not.toContain(",");
			}
		});
	});
});
