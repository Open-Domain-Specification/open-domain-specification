import type { Consumption } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel, rivermartModel } from "../fixtures";
import ConsumesTable from "./ConsumesTable.svelte";

const consumptions = (): Consumption[] =>
	[...petstoreModel().workspace.boundedcontexts.values()].flatMap((bc) =>
		[...bc.aggregates.values(), ...bc.services.values()].flatMap(
			(m) => m.consumptions,
		),
	);

describe("ConsumesTable", () => {
	it("names what is consumed, who provides it, from which context, what makes the call, and the protection", () => {
		const rows = consumptions();
		const { container } = render(ConsumesTable, { consumptions: rows });
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Consumable", "Provider", "Context", "Made By", "Protection"]);
		expect(container.querySelectorAll("tbody tr")).toHaveLength(rows.length);
		expect(
			container.querySelector(".codicon-symbol-class"),
		).toBeInTheDocument();
		// The protection is a code from the pattern table, in the editor font.
		expect(
			container.querySelector("tbody td:nth-child(5) .keyword.mono"),
		).toBeInTheDocument();
	});

	it("names the consumer's own operation behind a consumption, and says so when it is the whole consumer", () => {
		// Sales asks Catalog to reserve a pet, to mark it sold and to read its
		// summary, from one operation of its own each — a call is made by an
		// operation (card 92); the whole of Inventory's projection takes the pet
		// facts.
		const { container } = render(ConsumesTable, {
			consumptions: consumptions(),
		});
		const madeBy = [...container.querySelectorAll("tbody tr")].map((tr) => [
			tr.querySelector("td:nth-child(1)")?.textContent?.trim(),
			tr.querySelector("td:nth-child(4)")?.textContent?.trim(),
		]);
		expect(madeBy).toContainEqual(["ReservePetForOrder", "ReservePet"]);
		expect(madeBy).toContainEqual(["MarkPetSoldForOrder", "MarkPetSold"]);
		expect(madeBy).toContainEqual(["GetPetSummary", "CheckPetAvailable"]);
		expect(madeBy).toContainEqual(["PetRegistered", "whole consumer"]);
		expect(screen.getAllByText("whole consumer")[0]).toHaveClass("keyword");
	});

	it("says a consumption with no declared protection is unspecified", () => {
		const rows = consumptions();
		const bare = rows[0];
		Object.defineProperty(bare, "pattern", {
			value: undefined,
			configurable: true,
		});
		render(ConsumesTable, { consumptions: [bare] });
		expect(screen.getByText("unspecified")).toHaveClass("keyword");
	});

	it("says what would fill it when the context depends on nothing", () => {
		render(ConsumesTable, { consumptions: [] });
		expect(screen.getByText("Depends on nothing outside itself.")).toHaveClass(
			"empty",
		);
	});
});

describe("ConsumesTable agreements", () => {
	// WarehouseAPI reaches Vendor Purchasing (Legacy) under two agreements, one
	// consumption under each, and takes other stock under no named one (issue #55).
	const warehouse = () => {
		const service = rivermartModel()
			.workspace.getBoundedContextByRefOrThrow("#/boundedcontexts/warehouse")
			.services.get("warehouse_api");
		if (!service) throw new Error("RiverMart has a warehouse API");
		return service.consumptions;
	};
	const rowsOf = (container: Element) =>
		[...container.querySelectorAll("tbody tr")].map((tr) => ({
			consumable: tr.querySelector("td:nth-child(1)")?.textContent?.trim(),
			cell: tr.querySelector("td:nth-child(4)"),
		}));

	it("names the agreement of each exchange between the same two contexts, linked to its page, after the context", () => {
		const consumptions = warehouse();
		const { container } = render(ConsumesTable, { consumptions });
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual([
			"Consumable",
			"Provider",
			"Context",
			"Agreement",
			"Made By",
			"Protection",
		]);
		const rows = rowsOf(container);
		const lookup = consumptions.find(
			(c) => c.relationship?.name === "purchase order lookup",
		)?.relationship;
		const feed = consumptions.find(
			(c) => c.relationship?.name === "legacy stock feed",
		)?.relationship;
		expect(lookup?.ref).not.toBe(feed?.ref);
		const link = (name: string) =>
			rows.find((r) => r.consumable === name)?.cell?.querySelector("a");
		expect(link("GetPurchaseOrder")?.textContent).toBe("purchase order lookup");
		expect(link("GetPurchaseOrder")?.getAttribute("href")).toBe(lookup?.ref);
		expect(link("GetPurchaseOrder")?.title).toBe(
			"The relationship this exchange runs under.",
		);
		expect(
			link("GetPurchaseOrder")?.querySelector(".codicon-arrow-swap"),
		).toBeTruthy();
		expect(link("PurchaseOrderReceived")?.textContent).toBe(
			"legacy stock feed",
		);
		expect(link("PurchaseOrderReceived")?.getAttribute("href")).toBe(feed?.ref);
	});

	it("leaves the cell empty for an exchange that names no agreement, beside rows that do", () => {
		const { container } = render(ConsumesTable, { consumptions: warehouse() });
		const receive = rowsOf(container).find(
			(r) => r.consumable === "ReceiveStock",
		);
		expect(receive?.cell?.textContent?.trim()).toBe("");
		expect(receive?.cell?.querySelector("a")).toBeNull();
	});

	it("names an unnamed agreement by its type, so the cell never reads blank while pointing somewhere", () => {
		const [named] = warehouse().filter((c) => c.relationship);
		const relationship = Object.create(named.relationship as object, {
			name: { value: undefined },
		});
		const consumption = Object.create(named, {
			relationship: { value: relationship },
		});
		const { container } = render(ConsumesTable, {
			consumptions: [consumption],
		});
		expect(
			container.querySelector("tbody td:nth-child(4)")?.textContent?.trim(),
		).toBe(relationship.type);
	});
});
