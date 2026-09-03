import { Workspace } from "@open-domain-specification/core";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import {
	petstoreEvidence,
	strategicPositionFixture,
} from "../evidence/fixtures";
import Harness from "../evidence/WithModel.harness.svelte";
import type { Model } from "../model";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

const show = (f: ReturnType<typeof strategicPositionFixture>) =>
	render(Harness, {
		model: f.model,
		component: StrategicPositionTable,
		args: { context: f.context, sheets: f.sheets },
	});

describe("StrategicPositionTable", () => {
	it("groups the petstore's Sales relationships by what they mean from Sales", () => {
		const { container } = show(petstoreEvidence());
		const headings = [...container.querySelectorAll("tr.group th")].map(
			(th) => th.textContent,
		);
		expect(headings).toEqual([
			"Depends on",
			"Depended on by",
			"Works alongside",
		]);
		expect(container.querySelectorAll("tr.position")).toHaveLength(4);
	});

	it("prints the description the model already carries, and the role and type chips with their meaning", () => {
		show(petstoreEvidence());
		expect(
			screen.getByText(
				"Sales needs pet availability; Catalog commits to the summary contract",
			),
		).toBeInTheDocument();
		expect(screen.getByText("customer-supplier")).toHaveAttribute(
			"title",
			"The downstream side is a customer whose needs the upstream side plans for.",
		);
		expect(screen.getAllByText("OHS")[0]).toHaveAttribute(
			"title",
			"The upstream side publishes a stable service contract for all comers.",
		);
	});

	it("marks only the relationships that are not by design", () => {
		const { container } = show(petstoreEvidence());
		// Sales→Inventory is tolerated; the other three Sales rows say nothing.
		const chips = [...container.querySelectorAll("tr.position .chip")].filter(
			(c) => c.textContent === "tolerated" || c.textContent === "refactor",
		);
		expect(chips.map((c) => c.textContent)).toEqual(["tolerated"]);
	});

	it("expands one row in place into the relationship detail, and collapses it again", async () => {
		const { container } = show(petstoreEvidence());
		const toggle = screen.getByRole("button", {
			name: "Evidence for Catalog BC and Sales BC",
		});
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(container.querySelector(".detail-row")).toBeNull();

		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		const detail = container.querySelector(".detail-row") as HTMLElement;
		expect(detail).toBeTruthy();
		expect(
			within(detail).getByRole("heading", { name: /Catalog BC → Sales BC/ }),
		).toBeInTheDocument();
		// Expanding never navigates: only one row is open at a time.
		await fireEvent.click(
			screen.getByRole("button", {
				name: "Evidence for Sales BC and Inventory BC",
			}),
		);
		expect(container.querySelectorAll(".detail-row")).toHaveLength(1);
		expect(toggle).toHaveAttribute("aria-expanded", "false");

		await fireEvent.click(
			screen.getByRole("button", {
				name: "Evidence for Sales BC and Inventory BC",
			}),
		);
		expect(container.querySelector(".detail-row")).toBeNull();
	});

	it("shows one group for a context with one relationship and all three at eight", () => {
		const one = show(strategicPositionFixture(1));
		expect(one.container.querySelectorAll("tr.group")).toHaveLength(1);
		expect(one.container.querySelectorAll("tr.position")).toHaveLength(1);
		one.unmount();
		const eight = show(strategicPositionFixture(8));
		expect(eight.container.querySelectorAll("tr.group")).toHaveLength(3);
		expect(eight.container.querySelectorAll("tr.position")).toHaveLength(8);
	});

	it("says so when a relationship has no description, and when the context has none at all", () => {
		const workspace = new Workspace("Bare", {
			id: "bare",
			odsVersion: "1.0.0",
			description: "Two contexts, one undescribed relationship.",
			version: "0.0.1",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		const c = workspace.addBoundedContext("C", { description: "Alone." });
		a.upstreamOf(b);
		const model: Model = {
			workspace,
			fileLabel: "bare.json",
			diagnostics: [],
		};
		render(Harness, {
			model,
			component: StrategicPositionTable,
			args: { context: a, sheets: {} },
		});
		expect(screen.getByText("no description")).toBeInTheDocument();

		render(Harness, {
			model,
			component: StrategicPositionTable,
			args: { context: c, sheets: {} },
		});
		expect(
			screen.getByText(
				"No explicit relationships. Consumptions imply upstream and downstream links.",
			),
		).toBeInTheDocument();
	});
});
