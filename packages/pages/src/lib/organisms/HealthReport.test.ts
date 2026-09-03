import { Workspace } from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { strategicPositionFixture } from "../evidence/fixtures";
import Harness from "../evidence/WithModel.harness.svelte";
import { petstoreModel } from "../fixtures";
import type { Model } from "../model";
import HealthReport from "./HealthReport.svelte";

const show = (model: Model) =>
	render(Harness, { model, component: HealthReport, args: {} });

const counts = (container: HTMLElement) =>
	[...container.querySelectorAll(".summary strong")].map((s) => s.textContent);

describe("HealthReport", () => {
	it("counts what the architecture is unhappy with across the petstore", () => {
		const { container } = show(petstoreModel());
		// Petstore turns comments-required on, so its third count is zero.
		expect(counts(container)).toEqual(["1", "1", "0"]);
		expect(
			screen.getByText(/The kernel has grown past the status enum/),
		).toBeInTheDocument();
		expect(
			screen.getByText(/The projection conforms to the Sales order events/),
		).toBeInTheDocument();
	});

	it("groups the refactor backlog under the context that owns the change", () => {
		const { container } = show(petstoreModel());
		const group = container.querySelector("h4") as HTMLElement;
		expect(group).toHaveTextContent("Catalog BC");
	});

	it("keeps the no-comments list collapsed until it is asked for", async () => {
		show(strategicPositionFixture(8).model);
		const toggle = screen.getByRole("button", { name: /No comments \(2\)/ });
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Nothing written down yet.")).toBeNull();
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		expect(screen.getAllByText("Nothing written down yet.")).toHaveLength(2);
		await fireEvent.click(toggle);
		expect(screen.queryByText("Nothing written down yet.")).toBeNull();
	});

	it("lists every refactor and tolerated intent in the dense fixture", () => {
		const { container } = show(strategicPositionFixture(8).model);
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
		a.upstreamOf(b, {
			description: "Plain.",
			comments: [{ text: "It is what it looks like." }],
		});
		const { container } = show({
			workspace,
			fileLabel: "clean.json",
			diagnostics: [],
		});
		expect(counts(container)).toEqual(["0", "0", "0"]);
		expect(container.querySelectorAll(".summary li.zero")).toHaveLength(3);
		expect(
			screen.getByText("Nothing is marked for refactoring."),
		).toBeInTheDocument();
		expect(screen.getByText("No compromises recorded.")).toBeInTheDocument();
		await fireEvent.click(screen.getByRole("button", { name: /No comments/ }));
		expect(
			screen.getByText("Every intent carries at least one comment."),
		).toBeInTheDocument();
	});
});
