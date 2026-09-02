import { ODSRelationMap } from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { relationGraph } from "../flow/graph";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DiagramFigure.harness.svelte";

installXyflowTestEnv();

describe("DiagramFigure", () => {
	it("shows the empty text instead of a diagram when there are no nodes", () => {
		const model = petstoreModel();
		render(Harness, {
			model,
			caption: "Caption",
			dot: "digraph{}",
			nodeCount: 0,
			emptyText: "Nothing to show.",
		});
		expect(screen.getByText("Nothing to show.")).toBeInTheDocument();
	});

	it("renders the diagram and opens/closes the lightbox on click and keyboard", async () => {
		const model = petstoreModel();
		render(Harness, {
			model,
			caption: "Petstore",
			dot: "digraph{a -> b}",
			nodeCount: 1,
			emptyText: "unused",
		});
		const canvas = await screen.findByTitle("Open full size");

		await fireEvent.click(canvas);
		expect(document.getElementById("diagram-modal")).toBeInTheDocument();

		await fireEvent.click(document.querySelector(".modal-backdrop")!);
		expect(document.getElementById("diagram-modal")).not.toBeInTheDocument();

		await fireEvent.keyDown(canvas, { key: "Enter" });
		expect(document.getElementById("diagram-modal")).toBeInTheDocument();

		await fireEvent.keyDown(canvas, { key: "Escape" });
		expect(document.getElementById("diagram-modal")).not.toBeInTheDocument();

		await fireEvent.keyDown(canvas, { key: " " });
		expect(document.getElementById("diagram-modal")).toBeInTheDocument();

		await fireEvent.click(document.querySelector(".modal-close")!);
		expect(document.getElementById("diagram-modal")).not.toBeInTheDocument();

		// A key that isn't Enter, Space or Escape does nothing.
		await fireEvent.keyDown(canvas, { key: "a" });
		expect(document.getElementById("diagram-modal")).not.toBeInTheDocument();
	});

	it("shows the render error when the diagram fails to render", async () => {
		const model = {
			...petstoreModel(),
			renderDot: () => Promise.reject(new Error("dot binary not found")),
		};
		render(Harness, {
			model,
			caption: "Broken",
			dot: "not dot",
			nodeCount: 1,
			emptyText: "unused",
		});
		expect(
			await screen.findByText(
				/Diagram could not be rendered: dot binary not found/,
			),
		).toBeInTheDocument();
	});

	it("shows a non-Error rejection reason as-is", async () => {
		const model = {
			...petstoreModel(),
			renderDot: () => Promise.reject("boom"),
		};
		render(Harness, {
			model,
			caption: "Broken",
			dot: "not dot",
			nodeCount: 1,
			emptyText: "unused",
		});
		expect(
			await screen.findByText(/Diagram could not be rendered: boom/),
		).toBeInTheDocument();
	});

	it("shows nothing extra when the rejection carries no reason at all", async () => {
		const model = {
			...petstoreModel(),
			renderDot: () => Promise.reject(undefined),
		};
		render(Harness, {
			model,
			caption: "Broken",
			dot: "not dot",
			nodeCount: 1,
			emptyText: "unused",
		});
		expect(
			await screen.findByText(/Diagram could not be rendered:/),
		).toBeInTheDocument();
	});

	it("toggles between the static image and the interactive Svelte Flow view", async () => {
		const model = petstoreModel();
		const bc = [...model.workspace.boundedcontexts.values()][0];
		const aggregate = [...bc.aggregates.values()][0];
		const map = ODSRelationMap.fromAggregate(aggregate);
		render(Harness, {
			model,
			caption: "Structure",
			dot: "digraph{a -> b}",
			nodeCount: map.nodes.size,
			emptyText: "unused",
			graph: relationGraph(map),
		});

		const interactiveButton = await screen.findByRole("button", {
			name: "interactive",
		});
		await fireEvent.click(interactiveButton);
		expect(document.querySelector(".interactive")).toBeInTheDocument();

		await fireEvent.click(screen.getByRole("button", { name: "static" }));
		expect(document.querySelector(".interactive")).not.toBeInTheDocument();
	});
});
