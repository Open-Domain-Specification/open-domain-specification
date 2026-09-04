import { ODSContextMap } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { contextGraph } from "../flow/graph";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DiagramFigure.harness.svelte";

installXyflowTestEnv();

describe("DiagramFigure", () => {
	it("says what would fill it, with no hairlines, when the graph is empty", () => {
		render(Harness, {
			model: petstoreModel(),
			caption: "Context map",
			emptyText: "No bounded contexts yet.",
			graph: { nodes: [], edges: [], groups: [] },
		});
		expect(screen.getByText("No bounded contexts yet.")).toHaveClass("empty");
		expect(document.querySelector("figure.diagram")).not.toBeInTheDocument();
	});

	it("is the canvas between two hairlines with the caption below it", () => {
		const model = petstoreModel();
		render(Harness, {
			model,
			caption: "Catalog BC context map",
			emptyText: "unused",
			graph: contextGraph(
				ODSContextMap.fromWorkspace(model.workspace),
				model.workspace.relationships,
			),
		});
		expect(
			document.querySelector("figure.diagram .canvas .interactive"),
		).toBeInTheDocument();
		expect(document.querySelector("figcaption")).toHaveTextContent(
			"Catalog BC context map",
		);
	});
});
