import { Workspace } from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import {
	type FactSheetIndex,
	petstoreEvidence,
	relationshipKey,
	strategicPositionFixture,
} from "../evidence/fixtures";
import Harness from "../evidence/WithModel.harness.svelte";
import type { Model } from "../model";
import HealthReport from "./HealthReport.svelte";

const show = (model: Model, sheets: FactSheetIndex) =>
	render(Harness, { model, component: HealthReport, args: { sheets } });

const counts = (container: HTMLElement) =>
	[...container.querySelectorAll(".summary strong")].map((s) => s.textContent);

describe("HealthReport", () => {
	it("counts what the architecture is unhappy with across the petstore", () => {
		const { model, sheets } = petstoreEvidence();
		const { container } = show(model, sheets);
		expect(counts(container)).toEqual(["1", "1", "2"]);
		expect(
			screen.getByText(/The kernel has grown past the status enum/),
		).toBeInTheDocument();
		expect(
			screen.getByText(/The projection conforms to the Sales order events/),
		).toBeInTheDocument();
	});

	it("groups the refactor backlog under the context that owns the change", () => {
		const { model, sheets } = petstoreEvidence();
		const { container } = show(model, sheets);
		const group = container.querySelector("h4") as HTMLElement;
		expect(group).toHaveTextContent("Catalog BC");
	});

	it("keeps the no-facts list collapsed until it is asked for", async () => {
		const { model, sheets } = petstoreEvidence();
		show(model, sheets);
		const toggle = screen.getByRole("button", { name: /No facts \(2\)/ });
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Nothing written down yet.")).toBeNull();
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		expect(
			screen.getAllByText("Nothing written down yet."),
		).toHaveLength(2);
		await fireEvent.click(toggle);
		expect(screen.queryByText("Nothing written down yet.")).toBeNull();
	});

	it("lists every refactor and tolerated intent in the dense fixture", () => {
		const { model, sheets } = strategicPositionFixture(8);
		const { container } = show(model, sheets);
		expect(counts(container)).toEqual(["2", "2", "2"]);
		expect(container.querySelectorAll("h4")).toHaveLength(2);
	});

	it("says there is nothing to do when every intent is by design and evidenced", async () => {
		const workspace = new Workspace("Clean", {
			id: "clean",
			odsVersion: "1.0.0",
			description: "Nothing to report.",
			version: "0.0.1",
		});
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		const r = a.upstreamOf(b, { description: "Plain." });
		const sheets: FactSheetIndex = {
			[relationshipKey(r)]: { facts: [{ text: "It is what it looks like." }] },
		};
		const { container } = show(
			{ workspace, fileLabel: "clean.json", diagnostics: [] },
			sheets,
		);
		expect(counts(container)).toEqual(["0", "0", "0"]);
		expect(container.querySelectorAll(".summary li.zero")).toHaveLength(3);
		expect(
			screen.getByText("Nothing is marked for refactoring."),
		).toBeInTheDocument();
		expect(screen.getByText("No compromises recorded.")).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: /No facts/ }));
		expect(
			screen.getByText("Every intent carries at least one fact."),
		).toBeInTheDocument();
	});
});
