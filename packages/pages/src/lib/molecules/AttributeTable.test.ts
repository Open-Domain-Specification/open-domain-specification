import type { Attribute } from "@open-domain-specification/core";
import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	edgeCaseModel,
	petstoreModel,
	referenceModels,
	rivermartModel,
	streamlineModel,
} from "../fixtures";
import AttributeTable from "./AttributeTable.svelte";

const attributesOf = (model: ReturnType<typeof petstoreModel>): Attribute[] =>
	[...model.workspace.boundedcontexts.values()].flatMap((bc) =>
		[...bc.aggregates.values()].flatMap((a) =>
			[...a.entities.values()].flatMap((e) => [...e.attributes.values()]),
		),
	);

describe("AttributeTable", () => {
	it("marks the identity with the key codicon and sets the name and type in the editor font", () => {
		const attributes = attributesOf(petstoreModel());
		const { container } = render(AttributeTable, { attributes });
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Kind", "Attribute", "Type", "Description"]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(
			attributes.length,
		);
		const key = container.querySelector(".codicon-key") as HTMLElement;
		expect(key).toHaveAttribute("title", "identity");
		expect(container.querySelector("tbody td:nth-child(2) code")).toBeTruthy();
	});

	it("links a type that is a value object in the model", () => {
		const linked = attributesOf(petstoreModel()).filter((a) => a.valueobject);
		render(AttributeTable, { attributes: linked });
		expect(screen.getAllByRole("link")[0].closest("code")).toBeInTheDocument();
	});

	it("links a type that is a schema of its own, so a payload can be read into its parts", () => {
		const orderPlaced = rivermartModel().workspace.getSchemaByRefOrThrow(
			"#/boundedcontexts/order_management/schemas/order_placed",
		);
		const nested = [...orderPlaced.attributes.values()].filter((a) => a.schema);
		expect(nested).toHaveLength(1);
		render(AttributeTable, { attributes: nested });
		expect(screen.getAllByRole("link")[0].closest("code")).toBeInTheDocument();
	});

	it("names the root an identity attribute identifies, as a keyword and a ref", () => {
		const petId = petstoreModel()
			.workspace.getEntityByRefOrThrow(
				"#/boundedcontexts/sales_bc/aggregates/order/entities/order",
			)
			.attributes.get("pet_id");
		if (!petId) throw new Error("petstore no longer holds Order.petId");
		render(AttributeTable, { attributes: [petId] });
		expect(screen.getByText("identifies")).toHaveClass("keyword");
		const link = screen.getByRole("link", { name: "Pet" });
		expect(link.closest("code")).toBeInTheDocument();
	});

	it("marks an attribute that is sometimes absent with the optional keyword", () => {
		const pet = petstoreModel().workspace.getEntityByRefOrThrow(
			"#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet",
		);
		const attributes = [...pet.attributes.values()];
		const { container } = render(AttributeTable, { attributes });
		const marked = [...container.querySelectorAll("tbody tr")]
			.filter((row) => row.querySelector(".keyword"))
			.map((row) => row.querySelector("td:nth-child(2)")?.textContent?.trim());
		expect(marked).toEqual(["category", "tags", "status"]);
		// Only the exception is written: everything always present says nothing.
		expect(screen.getAllByText("optional")).toHaveLength(3);
	});

	it("says what would fill it when nothing is declared", () => {
		render(AttributeTable, {
			attributes: [],
			empty: "The schema has no attributes.",
		});
		expect(screen.getByText("The schema has no attributes.")).toHaveClass(
			"empty",
		);
		render(AttributeTable, { attributes: [] });
		expect(screen.getByText("No attributes.")).toBeInTheDocument();
	});

	it("puts what a kind inherits under a label row naming where it comes from", () => {
		const series = streamlineModel().workspace.getEntityByRefOrThrow(
			"#/boundedcontexts/catalogue/aggregates/title/entities/series",
		);
		const { container } = render(AttributeTable, {
			attributes: [...series.attributes.values()],
			inherited: series.inheritedAttributes,
		});
		const labels = [...container.querySelectorAll("tr.group th")].map((th) =>
			th.textContent?.trim(),
		);
		expect(labels).toEqual(["Inherited from Title"]);
		// Own attributes lead, under no label of their own; the inherited ones
		// follow in the group, and every attribute is a row.
		expect(container.querySelectorAll("tbody tr:not(.group)")).toHaveLength(
			series.allAttributes.length,
		);
		const first = container.querySelector("tbody tr:not(.group)");
		expect(first?.getAttribute("id")).toBe(series.allAttributes[0].ref);
	});

	it("leaves the description cell empty for an attribute that has none", () => {
		const bare = attributesOf(edgeCaseModel()).filter((a) => !a.description);
		expect(bare.length).toBeGreaterThan(0);
		const { container } = render(AttributeTable, { attributes: bare });
		expect(
			container.querySelector("tbody td:last-child")?.textContent?.trim(),
		).toBe("");
	});

	it("names the key column Kind with native visually hidden text, and no aria-label on an empty header", () => {
		const attributes = attributesOf(petstoreModel());
		const { container } = render(AttributeTable, { attributes });
		const kind = screen.getByRole("columnheader", { name: "Kind" });
		expect(kind).toBe(container.querySelectorAll("thead th")[0]);
		expect(kind.style.width).toBe("16px");
		// The name is content (axe empty-table-header), not an attribute on nothing.
		expect(kind).not.toHaveAttribute("aria-label");
		expect(kind.textContent?.trim()).toBe("Kind");
		const hidden = kind.querySelector("*") as HTMLElement;
		expect(hidden.textContent?.trim()).toBe("Kind");
		for (
			let el: HTMLElement | null = hidden;
			el && el !== kind;
			el = el.parentElement
		) {
			expect(el).not.toHaveAttribute("aria-hidden");
			expect(el.style.display).not.toBe("none");
			expect(el.style.visibility).not.toBe("hidden");
		}
		// The other headers are named by their visible text, with no label of their own.
		for (const th of [...container.querySelectorAll("thead th")].slice(1)) {
			expect(th).not.toHaveAttribute("aria-label");
			expect(th.querySelectorAll("*")).toHaveLength(0);
		}
		expect(
			screen.getAllByRole("columnheader").map((h) => h.textContent?.trim()),
		).toEqual(["Kind", "Attribute", "Type", "Description"]);
		// The cells under it stay a mark and nothing a reader would read twice.
		expect(
			container.querySelector("tbody td:first-child")?.textContent?.trim(),
		).toBe("");
	});

	it("sets an attribute name in one code element holding exactly its authored text", () => {
		const long: Attribute = {
			name: "merchant-category-name",
			type: "'retail' | 'online-marketplace' | 'wholesale-distributor'",
			description: "",
			identity: false,
			optional: false,
			ref: "#/x/attributes/merchant_category_name",
		} as unknown as Attribute;
		const { container } = render(AttributeTable, { attributes: [long] });
		const names = container.querySelectorAll("tbody td:nth-child(2) code");
		expect(names).toHaveLength(1);
		expect(names[0].textContent).toBe("merchant-category-name");
		expect(names[0].children).toHaveLength(0);
		// No added characters: no zero-width, word-joiner, BOM or soft hyphen.
		expect(names[0].textContent).not.toMatch(
			/[\u00AD\u200B\u200C\u2060\uFEFF]/,
		);
		// jsdom does not lay out; e2e/table-columns.spec.ts measures the lines.
	});

	describe("type cell", () => {
		/** An attribute with only what the table reads, so a type can be anything an author wrote. */
		const bare = (type: string, name = "field"): Attribute =>
			({
				name,
				type,
				description: "",
				identity: false,
				optional: false,
				ref: `#/x/attributes/${name}`,
			}) as unknown as Attribute;
		const typeOf = (type: string) => {
			const { container } = render(AttributeTable, {
				attributes: [bare(type)],
			});
			return container.querySelector(
				"td:nth-child(3) code.type",
			) as HTMLElement;
		};
		const alternatives = (code: HTMLElement) =>
			[...code.querySelectorAll("span.alternative")].map((s) => s.textContent);
		const INVISIBLE = /[\u200B\u200C\u2060\uFEFF]/;

		it("keeps a single token whole: date-time and a code name are one alternative", () => {
			for (const type of ["date-time", "ISO 4217 code"]) {
				const code = typeOf(type);
				expect(code.textContent).toBe(type);
				expect(alternatives(code)).toEqual([type]);
				expect(code.querySelectorAll("wbr")).toHaveLength(0);
			}
		});

		it("offers a break only after each top-level pipe of a union, and never alters the text", () => {
			const type = "'passport' | 'driving-licence'";
			const code = typeOf(type);
			expect(code.textContent).toBe(type);
			expect(alternatives(code)).toEqual([
				"'passport' | ",
				"'driving-licence'",
			]);
			expect(code.querySelectorAll("wbr")).toHaveLength(1);
			// The break sits between the two alternatives, not inside either.
			const [first, second] = code.querySelectorAll("span.alternative");
			expect(first.nextElementSibling?.tagName).toBe("WBR");
			expect(second.previousElementSibling?.tagName).toBe("WBR");
			expect(code.textContent).not.toMatch(INVISIBLE);
		});

		it("puts one break between each pair of three alternatives", () => {
			const code = typeOf("'pacs.008' | 'pacs.002' | 'pain.001'");
			expect(alternatives(code)).toHaveLength(3);
			expect(code.querySelectorAll("wbr")).toHaveLength(2);
		});

		it("does not break at a pipe inside quotes", () => {
			const type = "'a | b'";
			const code = typeOf(type);
			expect(alternatives(code)).toEqual([type]);
			expect(code.querySelectorAll("wbr")).toHaveLength(0);
		});

		it("does not break at a pipe inside a nested type", () => {
			const type = "{source: 'subscription' | 'discs', amount: Money}[]";
			const code = typeOf(type);
			expect(code.textContent).toBe(type);
			expect(alternatives(code)).toEqual([type]);
			expect(code.querySelectorAll("wbr")).toHaveLength(0);
		});

		it("keeps a malformed type exactly as authored, as one alternative", () => {
			const type = "'unterminated | B";
			const code = typeOf(type);
			expect(code.textContent).toBe(type);
			expect(alternatives(code)).toEqual([type]);
			expect(code.querySelectorAll("wbr")).toHaveLength(0);
		});

		it("never inserts an invisible character, and never changes a type any reference model authors", () => {
			let checked = 0;
			for (const model of [petstoreModel(), ...referenceModels()]) {
				const attributes = [
					...model.workspace.boundedcontexts.values(),
				].flatMap((bc) => [
					...[...bc.schemas.values()].flatMap((s) => [
						...s.attributes.values(),
					]),
					...[...bc.valueobjects.values()].flatMap((v) => [
						...v.attributes.values(),
					]),
					...[...bc.aggregates.values()].flatMap((a) =>
						[...a.entities.values()].flatMap((e) => [...e.attributes.values()]),
					),
				]);
				const { container, unmount } = render(AttributeTable, { attributes });
				const rows = [...container.querySelectorAll("tbody tr")];
				expect(rows).toHaveLength(attributes.length);
				rows.forEach((row, i) => {
					const code = row.querySelector(
						"td:nth-child(3) code.type",
					) as HTMLElement;
					expect(code.textContent).toBe(attributes[i].type);
					expect(code.textContent).not.toMatch(INVISIBLE);
					checked += 1;
				});
				unmount();
			}
			expect(checked).toBeGreaterThan(100);
		});

		it("splits the northbank identity document's own union", () => {
			const northbank = referenceModels()[2];
			const document = northbank.workspace.getEntityByRefOrThrow(
				"#/boundedcontexts/customer_&_kyc/aggregates/customer/entities/identity_document",
			);
			const { container } = render(AttributeTable, {
				attributes: [...document.attributes.values()],
			});
			const unions = [...container.querySelectorAll("code.type")].filter(
				(c) => c.querySelectorAll("span.alternative").length === 2,
			);
			expect(unions.map((c) => c.textContent)).toContain(
				"'passport' | 'driving-licence'",
			);
		});

		it("still links a type that is a value object or a schema, with the authored label", () => {
			const linked = attributesOf(petstoreModel()).filter((a) => a.valueobject);
			expect(linked.length).toBeGreaterThan(0);
			const { container } = render(AttributeTable, { attributes: linked });
			const code = container.querySelector(
				"td:nth-child(3) code.type",
			) as HTMLElement;
			const link = code.querySelector("a") as HTMLAnchorElement;
			expect(link).toHaveTextContent(linked[0].type);
			expect(link.textContent).toBe(linked[0].type);
			expect(link).toHaveAttribute("data-ref", linked[0].valueobject?.ref);
			expect(code.textContent).toBe(linked[0].type);

			const orderPlaced = rivermartModel().workspace.getSchemaByRefOrThrow(
				"#/boundedcontexts/order_management/schemas/order_placed",
			);
			const nested = [...orderPlaced.attributes.values()].filter(
				(a) => a.schema,
			);
			const schema = render(AttributeTable, { attributes: nested });
			const schemaCode = schema.container.querySelector(
				"td:nth-child(3) code.type",
			) as HTMLElement;
			expect(schemaCode.querySelector("a")?.textContent).toBe(nested[0].type);
		});
	});
});

/*
 * The measured cap on the type. jsdom lays nothing out, so the geometry the
 * component reads (the frame's clientWidth, each header's width, the type
 * header's padding and the Description header's computed min-width) is given,
 * and the number the component writes is asserted exactly.
 */
describe("AttributeTable type cap", () => {
	class FakeObserver {
		static all: FakeObserver[] = [];
		observed: Element[] = [];
		disconnected = 0;
		/** Set by a test to put a table nested in the page before the headers are observed. */
		static onObserve?: (target: Element, first: boolean) => void;
		constructor(public callback: () => void) {
			FakeObserver.all.push(this);
		}
		observe(target: Element) {
			FakeObserver.onObserve?.(target, this.observed.length === 0);
			this.observed.push(target);
		}
		disconnect() {
			this.disconnected += 1;
		}
	}
	type Geometry = {
		frame: number;
		identity: number;
		name: number;
		padLeft: number;
		padRight: number;
		min: number;
	};
	let geometry: Geometry;
	let frames: Map<number, FrameRequestCallback>;
	let next: number;
	let requested: number[];
	let cancelled: number[];
	const realComputedStyle = window.getComputedStyle.bind(window);

	/** The scoped geometry: a header's place in its own row decides what it measures. */
	function stub(withObserver = true) {
		geometry = {
			frame: 760,
			identity: 32,
			name: 160.5,
			padLeft: 8,
			padRight: 8,
			min: 192,
		};
		frames = new Map();
		next = 1;
		requested = [];
		cancelled = [];
		FakeObserver.all = [];
		FakeObserver.onObserve = undefined;
		if (withObserver) vi.stubGlobal("ResizeObserver", FakeObserver);
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			const id = next++;
			requested.push(id);
			frames.set(id, cb);
			return id;
		});
		vi.stubGlobal("cancelAnimationFrame", (id: number) => {
			cancelled.push(id);
			frames.delete(id);
		});
		vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(
			function (this: HTMLElement) {
				return this.classList.contains("frame") ? geometry.frame : 0;
			},
		);
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				const cell = this as HTMLTableCellElement;
				const own = this.closest("table")?.closest("td") === null;
				const width =
					this.tagName === "TH" && own
						? [geometry.identity, geometry.name][cell.cellIndex]
						: undefined;
				return { width: width ?? 0 } as DOMRect;
			},
		);
		vi.spyOn(window, "getComputedStyle").mockImplementation(((el: Element) => {
			const cell = el as HTMLTableCellElement;
			if (el.tagName === "TH" && cell.cellIndex === 2)
				return {
					paddingLeft: `${geometry.padLeft}px`,
					paddingRight: `${geometry.padRight}px`,
				} as CSSStyleDeclaration;
			if (el.tagName === "TH" && cell.cellIndex === 3)
				return { minWidth: `${geometry.min}px` } as CSSStyleDeclaration;
			return realComputedStyle(el);
		}) as typeof getComputedStyle);
	}
	const flush = () => {
		const pending = [...frames];
		frames.clear();
		for (const [, cb] of pending) cb(0);
	};
	const cap = (container: HTMLElement) =>
		(
			container.querySelector(".attributes") as HTMLElement
		).style.getPropertyValue("--type-cap");
	const some = () => attributesOf(petstoreModel()).slice(0, 3);

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("sets --type-cap to the frame less the key, the name, the type's padding and the Description floor", () => {
		stub();
		const { container } = render(AttributeTable, { attributes: some() });
		// 760 - 32 - 160.5 - 8 - 8 - 192 = 359.5. Without the Description
		// floor in the sum this would read 551.5px.
		expect(cap(container)).toBe("359.5px");
	});

	it("never lets the cap go below zero", () => {
		stub();
		geometry.frame = 300;
		const { container } = render(AttributeTable, { attributes: some() });
		// 300 - 32 - 160.5 - 16 - 192 is negative: the cap is 0, not a negative width.
		expect(cap(container)).toBe("0px");
	});

	it("only schedules a measure when the observer reports, and measures in the frame", () => {
		stub();
		const { container } = render(AttributeTable, { attributes: some() });
		expect(FakeObserver.all).toHaveLength(1);
		expect(requested).toEqual([]);
		geometry.frame = 900;
		FakeObserver.all[0].callback();
		// A callback that resized what it observes would loop; it only asks for a frame.
		expect(requested).toEqual([1]);
		expect(cap(container)).toBe("359.5px");
		flush();
		expect(cap(container)).toBe("499.5px");
	});

	it("cancels the frame it asked for when the observer reports again", () => {
		stub();
		const { container } = render(AttributeTable, { attributes: some() });
		const [observer] = FakeObserver.all;
		observer.callback();
		geometry.frame = 800;
		observer.callback();
		expect(requested).toEqual([1, 2]);
		// The second callback cancels the first request (the first call cancels
		// the nothing it had, id 0).
		expect(cancelled).toEqual([0, 1]);
		flush();
		expect(cap(container)).toBe("399.5px");
	});

	it("cancels a pending frame and disconnects the observer on unmount", () => {
		stub();
		const { unmount } = render(AttributeTable, { attributes: some() });
		const [observer] = FakeObserver.all;
		observer.callback();
		expect(frames.size).toBe(1);
		cancelled.length = 0;
		unmount();
		expect(cancelled).toEqual([1]);
		expect(frames.size).toBe(0);
		expect(observer.disconnected).toBe(1);
	});

	it("observes its own wrapper and its own four headers, and nothing in a table nested in a cell", () => {
		stub();
		FakeObserver.onObserve = (target, first) => {
			if (!first) return;
			// A table nested in one of the cells, with headers of its own whose
			// widths would wreck the sum if they were read.
			const td = target.querySelector("tbody td:nth-child(3)") as HTMLElement;
			td.innerHTML =
				'<div class="frame"><table><thead><tr><th>a</th><th>b</th><th>c</th><th>d</th></tr></thead></table></div>';
		};
		const { container } = render(AttributeTable, { attributes: some() });
		const host = container.querySelector(".attributes") as HTMLElement;
		const outer = [
			...host.querySelectorAll(":scope > .frame > table > thead th"),
		];
		expect(outer).toHaveLength(4);
		expect(FakeObserver.all[0].observed).toEqual([host, ...outer]);
		expect(host.querySelectorAll("th")).toHaveLength(4 + 4);
		expect(cap(container)).toBe("359.5px");
	});

	it("measures again when its rows change", () => {
		stub();
		const { container, rerender } = render(AttributeTable, {
			attributes: some(),
		});
		geometry.frame = 700;
		rerender({ attributes: attributesOf(petstoreModel()).slice(0, 4) });
		expect(cap(container)).toBe("299.5px");
		expect(FakeObserver.all.at(-1)?.observed.length).toBe(5);
	});

	it("leaves the cap unset with no rows to measure, though an observer is watching", () => {
		stub();
		const { container } = render(AttributeTable, { attributes: [] });
		expect(container.querySelector("table")).toBeNull();
		expect(FakeObserver.all).toHaveLength(1);
		expect(FakeObserver.all[0].observed).toEqual([
			container.querySelector(".attributes"),
		]);
		FakeObserver.all[0].callback();
		flush();
		expect(cap(container)).toBe("");
	});

	it("leaves the cap unset where there is no ResizeObserver, and the type at its narrowest", () => {
		stub(false);
		vi.stubGlobal("ResizeObserver", undefined);
		expect(typeof ResizeObserver).toBe("undefined");
		const { container } = render(AttributeTable, { attributes: some() });
		expect(cap(container)).toBe("");
		expect(requested).toEqual([]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
	});
});
