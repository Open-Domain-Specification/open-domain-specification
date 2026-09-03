import {
	type BoundedContext,
	PATTERNS,
	Workspace,
} from "@open-domain-specification/core";
import { fireEvent, render, screen, within } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { strategicPositionFixture } from "../evidence/fixtures";
import Harness from "../evidence/WithModel.harness.svelte";
import { petstoreSales } from "../fixtures";
import type { Model } from "../model";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

const show = (f: { model: Model; context: BoundedContext }) =>
	render(Harness, {
		model: f.model,
		component: StrategicPositionTable,
		args: { context: f.context },
	});

describe("StrategicPositionTable", () => {
	it("groups the petstore's Sales relationships by what they mean from Sales", () => {
		const { container } = show(petstoreSales());
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
		show(petstoreSales());
		expect(
			screen.getByText(
				"Sales needs pet availability; Catalog commits to the summary contract",
			),
		).toBeInTheDocument();
		expect(screen.getByText("customer-supplier")).toHaveAttribute(
			"title",
			PATTERNS["customer-supplier"].summary,
		);
		expect(screen.getAllByText("OHS")[0]).toHaveAttribute(
			"title",
			PATTERNS["open-host-service"].summary,
		);
	});

	it("marks only the relationships that are not by design", () => {
		const { container } = show(petstoreSales());
		// Sales→Inventory is tolerated; the other three Sales rows say nothing.
		const chips = [...container.querySelectorAll("tr.position .chip")].filter(
			(c) => c.textContent === "tolerated" || c.textContent === "refactor",
		);
		expect(chips.map((c) => c.textContent)).toEqual(["tolerated"]);
	});

	it("expands one row in place into the relationship detail, and collapses it again", async () => {
		const { container } = show(petstoreSales());
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
		const { model, a, c } = bareWorkspace();
		render(Harness, {
			model,
			component: StrategicPositionTable,
			args: { context: a },
		});
		expect(screen.getByText("no description")).toBeInTheDocument();

		render(Harness, {
			model,
			component: StrategicPositionTable,
			args: { context: c },
		});
		expect(
			screen.getByText(
				"No explicit relationships. Consumptions imply upstream and downstream links.",
			),
		).toBeInTheDocument();
	});

	it("leaves out the toggle and the disposition column when nothing is recorded", () => {
		const { model, a } = bareWorkspace();
		const { container } = render(Harness, {
			model,
			component: StrategicPositionTable,
			args: { context: a },
		});
		expect(container.querySelectorAll("th.toggle")).toHaveLength(0);
		expect(screen.queryByText("Disposition")).not.toBeInTheDocument();
		expect(
			container.querySelector("tr.group th")?.getAttribute("colspan"),
		).toBe("5");
	});

	it("brings the toggle and the disposition column back as soon as one relationship carries a disposition", () => {
		const { model, a, b } = bareWorkspace();
		a.upstreamOf(b, { type: "customer-supplier", disposition: "tolerated" });
		const { container } = render(Harness, {
			model,
			component: StrategicPositionTable,
			args: { context: a },
		});
		expect(container.querySelectorAll("th.toggle")).toHaveLength(1);
		expect(screen.getByText("Disposition")).toBeInTheDocument();
		expect(container.querySelectorAll("td.toggle button")).toHaveLength(2);
	});
});

/** Two joined contexts and a lonely one, with nothing written down anywhere. */
function bareWorkspace(): {
	model: Model;
	a: BoundedContext;
	b: BoundedContext;
	c: BoundedContext;
} {
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
	return {
		model: { workspace, fileLabel: "bare.json", diagnostics: [] },
		a,
		b,
		c,
	};
}
