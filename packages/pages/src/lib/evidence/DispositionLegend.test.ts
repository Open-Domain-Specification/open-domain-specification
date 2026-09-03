import { ODSContextMap } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { contextGraph } from "../flow/graph";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DispositionLegend.harness.svelte";
import { petstoreEvidence } from "./fixtures";

installXyflowTestEnv();

const { model } = petstoreEvidence();
const graph = contextGraph(ODSContextMap.fromWorkspace(model.workspace));
const terms = (c: Element) =>
	[...c.querySelectorAll("dt")].map((dt) => dt.textContent);

describe("DispositionLegend", () => {
	it("keeps the shipped terms and adds a row for each mark the map draws", () => {
		const { container } = render(Harness, {
			graph,
			kind: "context",
			dispositions: ["by-design", "tolerated", "refactor"],
		});
		const panel = container.querySelector(".diagram-legend") as HTMLElement;
		expect(panel.closest(".svelte-flow__panel")).toHaveClass("top", "left");
		expect(terms(panel)).toContain("U/D");
		expect(terms(panel)).toContain("OHS");
		expect(terms(panel)).toContain("outlined badge");
		expect(terms(panel)).toContain("warning badge");
		expect(
			panel.querySelector("dd[title]")?.getAttribute("title"),
		).toBeTruthy();
	});

	it("names only the marks present, and never by-design, which is the unmarked default", () => {
		const { container } = render(Harness, {
			graph,
			kind: "context",
			dispositions: ["by-design", "refactor"],
		});
		const panel = container.querySelector(".diagram-legend") as HTMLElement;
		expect(terms(panel)).toContain("warning badge");
		expect(terms(panel)).not.toContain("outlined badge");
		expect(terms(panel)).not.toContain("filled badge");
	});

	it("adds no rule when every intent on the map is by design", () => {
		const { container } = render(Harness, {
			graph,
			kind: "context",
			dispositions: ["by-design"],
		});
		const panel = container.querySelector(".diagram-legend") as HTMLElement;
		expect(panel.querySelector("hr")).toBeNull();
		expect(panel.querySelectorAll("dl")).toHaveLength(1);
	});
});
