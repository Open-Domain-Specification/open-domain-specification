import { fireEvent, render, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../../fixtures";
import Harness from "./Page.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

/**
 * The nine v2 tactical templates against the petstore. Each case asserts the
 * thing the design language changed on that page — a row where v1 had a card,
 * a keyword where v1 had a pill, a definition list where v1 had a facts
 * strip, a count badge on the heading — rather than only that the page
 * rendered, so a regression to the v1 treatment fails here.
 */
const model = petstoreModel();

const draw = (ref: string) => render(Harness, { model, ref }).container;
const textOf = (ref: string) => draw(ref).textContent ?? "";

/** v2 has no card, no grid, no chip and no pill; a page that grows one has drifted. */
const V1_SHAPES = ".card, .grid, .chip, .pill, .pills, .facts, .counts";

describe("v2 tactical templates", () => {
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
		).toEqual(["Consumable", "Kind", "Provider"]);
		expect(container.querySelector("#carriers .keyword")).toBeInTheDocument();
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

	it("InvariantPage: the targets become a two-column table", () => {
		const container = draw(PETSTORE_REFS.invariant);
		expect(
			[...container.querySelectorAll("#constrains thead th")].map((h) =>
				h.textContent?.trim(),
			),
		).toEqual(["Element", "Description"]);
		expect(container.querySelectorAll("#constrains tbody tr").length).toBe(2);
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
