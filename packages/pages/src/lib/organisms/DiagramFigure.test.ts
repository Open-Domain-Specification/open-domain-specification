import { ODSRelationMap } from "@open-domain-specification/core";
import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { relationGraph } from "../flow/graph";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DiagramFigure.harness.svelte";

installXyflowTestEnv();

describe("DiagramFigure", () => {
	it("shows the empty text instead of a diagram when the graph has no nodes", () => {
		render(Harness, {
			model: petstoreModel(),
			caption: "Caption",
			emptyText: "Nothing to show.",
			graph: { nodes: [], edges: [], groups: [] },
		});
		expect(screen.getByText("Nothing to show.")).toBeInTheDocument();
		expect(document.querySelector(".interactive")).not.toBeInTheDocument();
	});

	it("renders the interactive Svelte Flow view with its caption", () => {
		const model = petstoreModel();
		const bc = [...model.workspace.boundedcontexts.values()][0];
		const aggregate = [...bc.aggregates.values()][0];
		const map = ODSRelationMap.fromAggregate(aggregate);
		render(Harness, {
			model,
			caption: "Structure",
			emptyText: "unused",
			graph: relationGraph(map),
		});
		expect(
			document.querySelector("figure.diagram .interactive"),
		).toBeInTheDocument();
		expect(screen.getByText("Structure")).toBeInTheDocument();
	});
});
