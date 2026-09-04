import { fireEvent, render, screen } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Demo from "./DataTable.harness.svelte";
import DataTable, { type Column } from "./DataTable.svelte";

const names = (container: HTMLElement) =>
	[...container.querySelectorAll("tbody tr:not(.group) td:first-child")].map(
		(td) => td.textContent?.trim(),
	);

describe("DataTable", () => {
	it("draws a header row and one row per item, each anchored by its id", () => {
		const { container } = render(Demo);
		const headers = [...container.querySelectorAll("thead th")].map((th) =>
			th.textContent?.trim(),
		);
		expect(headers).toEqual([
			"Consumable",
			"Kind",
			"Pattern",
			"Consumers",
			"Consumed by",
			"Disposition",
		]);
		// A numeric column aligns right and may fix its width.
		const consumers = container.querySelectorAll("thead th")[3] as HTMLElement;
		expect(consumers).toHaveClass("numeric");
		expect(consumers.style.width).toBe("6em");
		expect(container.querySelector("tbody td.numeric")).toHaveTextContent("1");
		expect(names(container)).toHaveLength(7);
		expect(container.querySelector("tr#pet_registered")).toBeInTheDocument();
		expect(container.querySelector("tr.group")).toBeNull();
		expect(container.querySelector("caption")).toBeNull();
		expect(container.querySelector("thead button")).toBeNull();
	});

	it("groups rows under label rows when given groups, with a caption", () => {
		const { container } = render(Demo, { grouped: true });
		const labels = [...container.querySelectorAll("tr.group th")].map(
			(th) => th.textContent,
		);
		expect(labels).toEqual(["Events", "Operations"]);
		expect(container.querySelector("tr.group th")).toHaveAttribute(
			"colspan",
			"6",
		);
		expect(container.querySelector("caption")).toHaveTextContent(
			"What Pet provides, by kind",
		);
		expect(names(container)).toHaveLength(7);
	});

	it("sorts by a sortable column, reverses on the second click, and says so for assistive tech", async () => {
		const { container } = render(Demo, { sortable: true });
		const kind = screen.getByRole("button", { name: "Kind" });
		const kindHeader = kind.closest("th") as HTMLElement;
		expect(kindHeader).not.toHaveAttribute("aria-sort");

		await fireEvent.click(kind);
		expect(kindHeader).toHaveAttribute("aria-sort", "ascending");
		expect(
			container.querySelector(".codicon-arrow-small-up"),
		).toBeInTheDocument();
		// Events sort before operations; equal kinds keep a stable order.
		expect(names(container).slice(0, 3)).toEqual([
			"PetRegistered",
			"PetUpdated",
			"PetStatusChanged",
		]);

		await fireEvent.click(kind);
		expect(kindHeader).toHaveAttribute("aria-sort", "descending");
		expect(
			container.querySelector(".codicon-arrow-small-down"),
		).toBeInTheDocument();
		expect(names(container)[0]).toBe("ChangePetStatus");

		// A third click goes back to ascending.
		await fireEvent.click(kind);
		expect(kindHeader).toHaveAttribute("aria-sort", "ascending");

		// Switching column starts ascending again on the new column.
		await fireEvent.click(screen.getByRole("button", { name: "Consumable" }));
		expect(kindHeader).not.toHaveAttribute("aria-sort");
		expect(names(container)[0]).toBe("ChangePetStatus");
		expect(names(container).at(-1)).toBe("ReservePet");
	});

	it("sorts a row with no value for the key as empty, so it comes first ascending", async () => {
		const { container } = render(Demo, { sortable: true });
		await fireEvent.click(screen.getByRole("button", { name: "Pattern" }));
		expect(names(container)[0]).toBe("ChangePetStatus");
	});

	it("keys rows by position when the caller gives no row id, and lists nothing without rows", () => {
		const columns: Column[] = [{ key: "name", label: "Name" }];
		const cell = createRawSnippet((row: () => unknown) => ({
			render: () => `<span>${(row() as { name: string }).name}</span>`,
		}));
		const { container } = render(DataTable, {
			columns,
			rows: [{ name: "Pet" }, { name: "Order" }],
			cell,
		});
		const rows = container.querySelectorAll("tbody tr");
		expect(rows).toHaveLength(2);
		expect(rows[0]).not.toHaveAttribute("id");
		const bare = render(DataTable, { columns, cell });
		expect(bare.container.querySelector("table")).toBeNull();
		expect(bare.container.querySelector(".empty")).toHaveTextContent(
			"Nothing to show.",
		);
	});

	it("renders a sortable header with no label as an empty button rather than throwing", () => {
		const cell = createRawSnippet(() => ({ render: () => "<span>x</span>" }));
		const { container } = render(DataTable, {
			columns: [
				{ key: "name", label: undefined as unknown as string, sortable: true },
			],
			rows: [{ name: "Pet" }],
			cell,
		});
		expect(container.querySelector("thead button")?.textContent?.trim()).toBe(
			"",
		);
	});

	it("keeps sorting per group, and rows with no value for the key sort as empty", async () => {
		const { container } = render(Demo, {
			grouped: true,
			sortable: true,
			dense: true,
		});
		await fireEvent.click(screen.getByRole("button", { name: "Consumable" }));
		const first = names(container);
		expect(first[0]).toBe("PetRegistered");
		expect(first).toHaveLength(14);
	});

	it("says what would fill it when there is nothing to list", () => {
		const { container } = render(Demo, { empty: true });
		expect(container.querySelector("table")).toBeNull();
		expect(screen.getByText(/Provides nothing/)).toBeInTheDocument();
		const grouped = render(Demo, { empty: true, grouped: true });
		expect(grouped.container.querySelector("table")).toBeNull();
	});
});
