import { relationshipTitle } from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { health, healthCounts } from "../evidence/derive";
import Harness from "../evidence/WithModel.harness.svelte";
import {
	edgeCaseModel,
	emptyWorkspaceModel,
	petstoreModel,
	rivermartModel,
} from "../fixtures";
import { modelRefToHash } from "../ref-transport";
import HealthReport from "./HealthReport.svelte";

const report = (model: ReturnType<typeof petstoreModel>) =>
	render(Harness, { model, component: HealthReport, args: {} });

describe("HealthReport", () => {
	it("puts the three numbers in the heading badges the stat tiles used to hold", () => {
		const model = petstoreModel();
		const counts = healthCounts(health(model.workspace));
		const { container } = report(model);
		const badges = [...container.querySelectorAll(".count")].map(
			(b) => b.textContent,
		);
		// A badge is not drawn at zero (card 34): the petstore has nothing
		// without comments, so only the first two headings carry one.
		expect(counts.noComments).toBe(0);
		expect(badges).toEqual([String(counts.refactor), String(counts.tolerated)]);
		// No stat tile survives.
		expect(container.querySelector(".summary")).toBeNull();
	});

	it("groups refactor by the context that owns the change and reads the comments under each row", () => {
		const model = petstoreModel();
		const { container } = report(model);
		const groups = container.querySelectorAll("tr.group th");
		expect(groups.length).toBeGreaterThan(0);
		const detail = container.querySelector("tr.detail") as HTMLElement;
		expect(detail.querySelector("td")).toHaveAttribute("colspan", "3");
		expect(detail.querySelector(".codicon-comment")).toBeInTheDocument();
		// The intent cell names both ends with the arrow between them.
		expect(container.querySelector("tbody .arrow")).toBeInTheDocument();
	});

	it("keeps the reconciliation list collapsed until asked, and opens it without comment rows", async () => {
		// The edge-case workspace's one relationship has nothing written down.
		const { container } = report(edgeCaseModel());
		const toggle = screen.getByRole("button", { name: /No comments/ });
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		const before = container.querySelectorAll("table").length;

		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		const tables = container.querySelectorAll("table");
		expect(tables.length).toBe(before + 1);
		const opened = tables[tables.length - 1];
		expect(opened.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
		expect(opened.querySelector("tr.detail")).toBeNull();
	});

	it("says what would fill each section for a workspace with nothing recorded", async () => {
		const empty = emptyWorkspaceModel();
		report(empty);
		expect(screen.getByText("Nothing is marked for refactoring.")).toHaveClass(
			"empty",
		);
		expect(screen.getByText("No compromises recorded.")).toHaveClass("empty");
		await fireEvent.click(screen.getByRole("button", { name: /No comments/ }));
		expect(
			screen.getByText("Every intent carries at least one comment."),
		).toBeInTheDocument();
	});

	it("shows the petstore's own reconciliation list, whatever is in it", async () => {
		const model = petstoreModel();
		const counts = healthCounts(health(model.workspace));
		const { container } = report(model);
		await fireEvent.click(screen.getByRole("button", { name: /No comments/ }));
		const rows = container.querySelectorAll("table:last-of-type tbody tr");
		expect(rows.length >= counts.noComments).toBe(true);
	});

	it("reads each relationship as relationshipTitle does, with each end its own link", async () => {
		const seen = new Set<string>();
		const named = new Set<string>();
		// RiverMart's pair holds two named agreements (#74).
		for (const model of [petstoreModel(), edgeCaseModel(), rivermartModel()]) {
			const { container, unmount } = report(model);
			await fireEvent.click(
				screen.getByRole("button", { name: /No comments/ }),
			);
			const titles = new Map(
				model.workspace.relationships.map((r) => [relationshipTitle(r), r]),
			);
			const cells = [...container.querySelectorAll("td")].filter((td) =>
				td.querySelector(".arrow"),
			);
			expect(cells.length).toBeGreaterThan(0);
			for (const cell of cells) {
				// The two lockups, the glyph and a named agreement's name, less the
				// one-word warnings.
				const text = [...cell.querySelectorAll(".name, .arrow, .agreement")]
					.map((n) => n.textContent?.replace(/\s+/g, " ").trim())
					.join(" ");
				const r = titles.get(text);
				expect(r, `no relationship is titled "${text}"`).toBeDefined();
				const links = [...cell.querySelectorAll("a")];
				expect(links.map((a) => a.textContent)).toEqual([
					r?.source.name,
					r?.target.name,
				]);
				expect(links.map((a) => a.getAttribute("href"))).toEqual([
					modelRefToHash(r?.source.ref ?? "#"),
					modelRefToHash(r?.target.ref ?? "#"),
				]);
				seen.add(cell.querySelector(".arrow")?.textContent ?? "");
				if (r?.name) named.add(text);
			}
			unmount();
		}
		// Both a directed and a symmetric relationship were compared, and both
		// of RiverMart's named agreements, each under its own title.
		expect(seen.size).toBe(2);
		expect(named).toEqual(
			new Set([
				"Vendor Purchasing (legacy) → Warehouse · purchase order lookup",
				"Vendor Purchasing (legacy) → Warehouse · legacy stock feed",
			]),
		);
	});
});
