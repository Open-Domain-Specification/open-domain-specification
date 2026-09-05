import { fireEvent, render, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import Harness from "../Page.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

/**
 * Every template against the petstore, through the shipped route. Each case
 * asserts the thing the design language changed on that page — a row where v1
 * had a card, a keyword where v1 had a pill, a definition list where v1 had a
 * facts strip, a count badge on the heading — rather than only that the page
 * rendered, so a regression to the v1 treatment fails here.
 */
const model = petstoreModel();

const draw = (ref: string) => render(Harness, { model, ref }).container;
const textOf = (ref: string) => draw(ref).textContent ?? "";

/** v2 has no card, no grid, no chip and no pill; a page that grows one has drifted. */
const V1_SHAPES = ".card, .grid, .chip, .pill, .pills, .facts, .counts";

describe("every template, through the shipped route", () => {
	it("draws every page out of rows, definition lists and keywords, never cards or pills", () => {
		for (const ref of Object.values(PETSTORE_REFS)) {
			const container = draw(ref);
			expect(
				container.querySelectorAll(V1_SHAPES).length,
				`${ref} still draws a v1 card, grid or pill`,
			).toBe(0);
			expect(container.querySelector("h1")).toBeInTheDocument();
			// Every page sits in the v2 layout with its own table of contents.
			expect(container.querySelector(".layout .toc")).toBeInTheDocument();
		}
	});

	it("AggregatePage: the root is a definition, the structure is subsections, the invariants are one table", () => {
		const container = draw(PETSTORE_REFS.aggregate);
		const terms = [...container.querySelectorAll("dt")].map(
			(t) => t.textContent,
		);
		expect(terms).toContain("Root");
		expect(terms).toContain("Context");
		// The root entity is marked by a word, not by a purple glow on a card.
		expect(container.textContent).toContain("aggregate root");
		// Each entity and value object is a level-3 subsection headed by its lockup.
		const subheads = [...container.querySelectorAll(".h3")].map((h) =>
			h.textContent?.trim(),
		);
		expect(subheads.some((h) => h?.startsWith("Entities"))).toBe(true);
		expect(subheads.some((h) => h?.startsWith("Value objects"))).toBe(true);
		expect(subheads.some((h) => h?.includes("Pet"))).toBe(true);
		// Invariants are rows carrying what they constrain, not a card each.
		const invariants = container.querySelector("#invariants");
		expect(invariants).toBeInTheDocument();
		const headers = [...(invariants?.querySelectorAll("thead th") ?? [])].map(
			(h) => h.textContent?.trim(),
		);
		expect(headers).toEqual(["Invariant", "Constrains", "Description"]);
	});

	it("AggregatePage: an internal operation says so, and a published one lists its consumers", () => {
		const text = textOf(PETSTORE_REFS.aggregate);
		expect(text).toContain("internal");
		expect(text).toContain("ChangePetStatus");
		expect(text).toContain("PetStatusChanged");
	});

	it("EntityPage: relations become two tables and the identity is a code fact", () => {
		const container = draw(PETSTORE_REFS.entity);
		const relations = container.querySelector("#relations");
		expect(relations).toBeInTheDocument();
		const subheads = [...(relations?.querySelectorAll(".h3") ?? [])].map((h) =>
			h.textContent?.trim(),
		);
		expect(subheads[0]?.startsWith("Outgoing")).toBe(true);
		expect(subheads[1]?.startsWith("Incoming")).toBe(true);
		expect(
			[...(relations?.querySelectorAll("thead th") ?? [])].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Relation", "Target", "Cardinality", "Label"]);
		// Nothing in the Pet aggregate points back at Pet, so the incoming table
		// says what would fill it instead of drawing an empty header row.
		expect(relations?.textContent).toContain("Nothing points at this entity.");
		const identity = [...container.querySelectorAll("dt")].find(
			(t) => t.textContent === "Identity",
		);
		expect(
			identity?.nextElementSibling?.querySelector("code"),
		).toHaveTextContent("id");
	});

	it("ValueObjectPage: the usage table names the attribute, its owner and where the owner lives", () => {
		const container = draw(PETSTORE_REFS.valueobject);
		const usage = container.querySelector("#usage");
		expect(
			[...(usage?.querySelectorAll("thead th") ?? [])].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Attribute", "On", "In"]);
		// Category is used both by an entity, which lives in an aggregate, and by
		// a schema, which lives in a bounded context; both "In" branches draw.
		const cells = [
			...(usage?.querySelectorAll("tbody td:last-child") ?? []),
		].map((c) => c.textContent?.trim());
		expect(cells).toContain("Pet");
		expect(cells).toContain("Catalog BC");
		// The sidebar label names the section the same way the section itself
		// does, so a reader following the link lands on what they expected.
		const h2 = usage?.querySelector("h2");
		const heading = h2?.textContent
			?.replace(h2.querySelector(".count")?.textContent ?? "", "")
			.trim();
		const sidebarLabel = container
			.querySelector('.toc a[href="#usage"]')
			?.textContent?.trim();
		expect(sidebarLabel).toBe(heading);
		expect(sidebarLabel).toBe("Used as a type by");
	});

	it("ServicePage: the type is a keyword line and provides and consumes are the shared tables", () => {
		const container = draw(PETSTORE_REFS.service);
		expect(container.textContent).toContain("application");
		const subheads = [...container.querySelectorAll(".h3")].map((h) =>
			h.textContent?.trim(),
		);
		expect(subheads.some((h) => h?.startsWith("Provides"))).toBe(true);
		expect(subheads.some((h) => h?.startsWith("Consumes"))).toBe(true);
		// The provider column tells an aggregate from a service, so a reader can
		// see which of the two ends of the dependency they are looking at.
		expect(container.textContent).toContain("PetApp");
		expect(container.textContent).toContain("anti-corruption-layer");
	});

	it("ServicePage: the provides table sorts on its headers and the consumes table does not", async () => {
		const container = draw(PETSTORE_REFS.service);
		const names = (table: Element) =>
			[...table.querySelectorAll("tbody tr td:first-child")].map((c) =>
				c.textContent?.trim(),
			);
		const [provides, consumes] = [...container.querySelectorAll("table.data")];

		await fireEvent.click(
			within(provides as HTMLElement).getByRole("button", {
				name: "Consumable",
			}),
		);
		const ascending = names(provides);
		expect([...ascending].sort()).toEqual(ascending);
		await fireEvent.click(
			within(provides as HTMLElement).getByRole("button", { name: "Kind" }),
		);
		expect(
			provides.querySelector("th[aria-sort='ascending']"),
		).toBeInTheDocument();

		// The consumes table is read down, not sorted: its headers are plain
		// column headers, so nothing in it is a button.
		expect(
			within(consumes as HTMLElement).queryAllByRole("button"),
		).toHaveLength(0);
		expect(names(consumes).length).toBeGreaterThan(0);
	});

	it("ConsumablePage: an operation carries its keywords, its disposition and its comments", () => {
		const container = draw(PETSTORE_REFS.operation);
		expect(container.textContent).toContain("operation");
		// The disposition is a definition, drawn the way the Problems panel draws a warning.
		const terms = [...container.querySelectorAll("dt")].map(
			(t) => t.textContent,
		);
		expect(terms).toContain("Disposition");
		expect(
			container.querySelector(".disposition.refactor"),
		).toBeInTheDocument();
		expect(
			container.querySelector("#comments .comments li"),
		).toBeInTheDocument();
		expect(container.querySelector("#raises")).toBeInTheDocument();
	});

	it("ConsumablePage: a query draws Returns as a second fact and a second attribute table", () => {
		const container = draw(PETSTORE_REFS.query);
		const terms = [...container.querySelectorAll("dt")].map(
			(t) => t.textContent,
		);
		expect(terms).toContain("Payload");
		expect(terms).toContain("Returns");
		const returns = container.querySelector("#returns");
		expect(returns).toBeInTheDocument();
		// The returned shape, not the sent one: PetId goes in, PetSummary comes back.
		const names = (root: Element | null) =>
			[...(root?.querySelectorAll("tbody tr code") ?? [])]
				.map((c) => c.textContent?.trim())
				.filter((t) => t && !t.includes("`"));
		expect(names(returns)).toEqual([
			"petId",
			"int64",
			"name",
			"string",
			"status",
			"PetStatus",
		]);
		expect(names(container.querySelector("#payload"))).toEqual([
			"petId",
			"int64",
		]);
	});

	it("ConsumablePage: an operation that returns nothing draws no Returns anywhere", () => {
		const container = draw(PETSTORE_REFS.operation);
		expect(container.querySelector("#returns")).not.toBeInTheDocument();
		expect(
			[...container.querySelectorAll("dt")].map((t) => t.textContent),
		).not.toContain("Returns");
	});

	it("ConsumablePage: an operation that names a refusal draws Rejects with as a fact and a table per rejection", () => {
		const container = draw(PETSTORE_REFS.operation);
		expect(
			[...container.querySelectorAll("dt")].map((t) => t.textContent),
		).toContain("Rejects with");
		const rejects = container.querySelector("#rejects");
		expect(rejects).toBeInTheDocument();
		// One subsection per rejection, each headed by the schema it names.
		const headings = [...(rejects?.querySelectorAll("h3") ?? [])].map((h) =>
			h.textContent?.trim(),
		);
		expect(headings).toHaveLength(1);
		expect(headings[0]).toContain("PetUnavailable");
		// The refusal's own attributes, not the payload's: the payload is a
		// bare PetId, the refusal adds the status that says why.
		expect(rejects?.textContent).toContain("status");
		expect(rejects?.querySelectorAll("table")).toHaveLength(1);
	});

	it("ConsumablePage: a query that refuses with nothing draws no Rejects with anywhere", () => {
		const container = draw(PETSTORE_REFS.query);
		expect(container.querySelector("#rejects")).not.toBeInTheDocument();
		expect(
			[...container.querySelectorAll("dt")].map((t) => t.textContent),
		).not.toContain("Rejects with");
	});

	it("ConsumablePage: an event lists what raises it and the policies that react", () => {
		const container = draw(PETSTORE_REFS.event);
		expect(container.querySelector("#raised")).toBeInTheDocument();
		expect(container.querySelector("#raises")).not.toBeInTheDocument();
		expect(container.textContent).toContain("Reacted to by");
		expect(container.textContent).toContain("ChangePetStatus");
	});

	it("SchemaPage: the carriers table replaces the chips with keywords", () => {
		const container = draw(PETSTORE_REFS.schema);
		expect(
			[...container.querySelectorAll("#carriers thead th")].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Consumable", "Kind", "Carried as", "Provider"]);
		expect(container.querySelector("#carriers .keyword")).toBeInTheDocument();
		// PetId is only ever sent, so every row of its table says payload.
		const directions = [
			...container.querySelectorAll("#carriers tbody tr"),
		].map((r) => r.querySelectorAll("td")[2]?.textContent?.trim());
		expect(new Set(directions)).toEqual(new Set(["payload"]));
	});

	it("SchemaPage: a schema that only ever comes back lists the operation that returns it", () => {
		const container = draw(PETSTORE_REFS.returnedSchema);
		const rows = [...container.querySelectorAll("#carriers tbody tr")].map(
			(r) => [...r.querySelectorAll("td")].map((c) => c.textContent?.trim()),
		);
		expect(rows).toHaveLength(1);
		expect(rows[0][0]).toContain("GetPetSummary");
		expect(rows[0][2]).toBe("returns");
		expect(container.textContent).not.toContain(
			"Nothing carries this schema yet",
		);
	});

	it("SchemaPage: a schema that only ever comes back as a refusal names the operation that rejects with it", () => {
		const container = draw(PETSTORE_REFS.rejectionSchema);
		const rows = [...container.querySelectorAll("#carriers tbody tr")].map(
			(r) => [...r.querySelectorAll("td")].map((c) => c.textContent?.trim()),
		);
		expect(rows).toHaveLength(1);
		expect(rows[0][0]).toContain("ReservePetForOrder");
		expect(rows[0][2]).toBe("rejects with");
	});

	it("PolicyPage: when and then are tables, and only then names the kind", () => {
		const container = draw(PETSTORE_REFS.policy);
		expect(
			[...container.querySelectorAll("#when thead th")].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Event", "Provider", "Context", "Description"]);
		expect(
			[...container.querySelectorAll("#then thead th")].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Operation", "Kind", "Provider", "Context", "Description"]);
	});

	it("ProcessPage: the lifecycle is four tables, and only then names the kind", () => {
		const container = draw(PETSTORE_REFS.process);
		const headers = (id: string) =>
			[...container.querySelectorAll(`#${id} thead th`)].map((h) =>
				h.textContent?.trim(),
			);
		// The policy page's two tables, with what begins an instance and what
		// finishes it around them (decision 23).
		expect(headers("starts")).toEqual([
			"Event",
			"Provider",
			"Context",
			"Description",
		]);
		expect(headers("when")).toEqual([
			"Event",
			"Provider",
			"Context",
			"Description",
		]);
		expect(headers("then")).toEqual([
			"Operation",
			"Kind",
			"Provider",
			"Context",
			"Description",
		]);
		expect(headers("ends")).toEqual([
			"Event",
			"Provider",
			"Context",
			"Description",
		]);
		expect(container.querySelector("#starts tbody")).toHaveTextContent(
			"OrderPlaced",
		);
		expect(container.querySelector("#ends tbody")).toHaveTextContent(
			"OrderDelivered",
		);
		// It says what a policy may not be: something that remembers.
		expect(container.querySelector("h1")).toHaveTextContent("Process");
		expect(container.textContent).toContain("stateful");
	});

	it("ConsumablePage: an event says which processes it takes part in and where", () => {
		const container = draw(PETSTORE_REFS.event);
		const processes = container.querySelector("#processes") as HTMLElement;
		expect(
			[...processes.querySelectorAll("thead th")].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Process", "In its lifecycle", "Context", "Description"]);
		const row = processes.querySelector("tbody tr") as HTMLElement;
		expect(row).toHaveTextContent("Order fulfilment");
		expect(row).toHaveTextContent("waits for it");
	});

	it("InvariantPage: the targets become a two-column table", () => {
		const container = draw(PETSTORE_REFS.invariant);
		expect(
			[...container.querySelectorAll("#constrains thead th")].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Element", "Description"]);
		expect(container.querySelectorAll("#constrains tbody tr").length).toBe(2);
	});

	it("InvariantPage: a transition rule lists the operation it is enforced by apart from what it holds true of", () => {
		const container = draw(PETSTORE_REFS.transitionInvariant);
		// The Pet is what the rule holds true of; ChangePetStatus is where it is
		// enforced, so the two read in their own sections.
		expect(container.querySelector("#constrains")?.textContent).toContain(
			"Pet",
		);
		expect(container.querySelector("#constrains")?.textContent).not.toContain(
			"ChangePetStatus",
		);
		expect(container.querySelector("#guards")?.textContent).toContain(
			"ChangePetStatus",
		);
	});

	it("ConsumablePage: an operation an invariant names lists the rule it upholds", () => {
		const guarded = draw(PETSTORE_REFS.guardedOperation);
		expect(guarded.querySelector("#invariants")?.textContent).toContain(
			"SoldNotReopen",
		);
		// An operation no rule names says so rather than showing an empty list.
		const plain = draw(PETSTORE_REFS.operation);
		expect(plain.querySelector("#invariants")?.textContent).toContain(
			"No invariant names this one.",
		);
	});

	it("TermPage: the embodied element is one row and the same word elsewhere is a table", () => {
		const container = draw(PETSTORE_REFS.term);
		expect(container.querySelector("#embodied .embodied")).toBeInTheDocument();
		expect(
			[...container.querySelectorAll("#elsewhere thead th")].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Context", "Definition"]);
		expect(container.querySelector("#elsewhere")?.textContent).toContain(
			"Sales BC",
		);
	});

	it("TermPage: aliases are keywords in the header's meta line, titled so a reader knows what they are", () => {
		const container = draw(PETSTORE_REFS.termWithAlias);
		const alias = container.querySelector(".page-header .meta .keyword");
		expect(alias).toBeInTheDocument();
		expect(alias).toHaveAttribute("title", "alias");
	});

	it("the table of contents scrolls to the section a reader picks", async () => {
		const container = draw(PETSTORE_REFS.entity);
		const target = container.querySelector("#relations") as HTMLElement;
		let scrolled = false;
		target.scrollIntoView = () => {
			scrolled = true;
		};
		document.body.append(container);
		const link = within(
			container.querySelector(".toc") as HTMLElement,
		).getByText("Relations");
		await fireEvent.click(link);
		expect(scrolled).toBe(true);
		container.remove();
	});
});
