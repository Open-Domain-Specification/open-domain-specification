import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DiagramOptionsPanel.harness.svelte";
import { diagramOptions } from "./options.svelte";

installXyflowTestEnv();

describe("DiagramOptionsPanel", () => {
	it("changes handle placement and edge style through the selects", async () => {
		render(Harness);
		const handles = screen.getByLabelText(
			"Handle placement",
		) as HTMLSelectElement;
		const edges = screen.getByLabelText("Edge style") as HTMLSelectElement;
		const style = screen.getByLabelText("Diagram style") as HTMLSelectElement;
		await fireEvent.change(handles, { target: { value: "floating" } });
		await fireEvent.change(edges, { target: { value: "smoothstep" } });
		await fireEvent.change(style, { target: { value: "sketch" } });
		expect(diagramOptions.handles).toBe("floating");
		expect(diagramOptions.edges).toBe("smoothstep");
		expect(diagramOptions.style).toBe("sketch");
		await fireEvent.change(handles, { target: { value: "fixed" } });
		await fireEvent.change(edges, { target: { value: "bezier" } });
		await fireEvent.change(style, { target: { value: "cards" } });
		expect(diagramOptions.handles).toBe("fixed");
		expect(diagramOptions.style).toBe("cards");
	});
});

describe("DiagramOptionsPanel reflects stored choices", () => {
	it("selects the remembered values on render", async () => {
		diagramOptions.set({ handles: "floating", edges: "smoothstep" });
		render(Harness);
		expect(
			(screen.getByLabelText("Handle placement") as HTMLSelectElement).value,
		).toBe("floating");
		expect(
			(screen.getByLabelText("Edge style") as HTMLSelectElement).value,
		).toBe("smoothstep");
		diagramOptions.set({ handles: "fixed", edges: "bezier" });
	});
});

describe("DiagramOptionsPanel per diagram kind", () => {
	it("offers the style select for the context map only", () => {
		const consumable = render(Harness, { kind: "consumable" });
		expect(consumable.queryByLabelText("Diagram style")).toBeNull();
		expect(consumable.getByLabelText("Edge style")).toBeInTheDocument();
		consumable.unmount();
		const relation = render(Harness, { kind: "relation" });
		expect(relation.queryByLabelText("Diagram style")).toBeNull();
		relation.unmount();
		render(Harness, { kind: "context" });
		expect(screen.getByLabelText("Diagram style")).toBeInTheDocument();
	});
	it("shows the effective handle default per kind when there is no user override", () => {
		diagramOptions.set({ handles: undefined });
		const context = render(Harness, { kind: "context" });
		expect(
			(context.getByLabelText("Handle placement") as HTMLSelectElement).value,
		).toBe("floating");
		context.unmount();
		const consumable = render(Harness, { kind: "consumable" });
		expect(
			(consumable.getByLabelText("Handle placement") as HTMLSelectElement)
				.value,
		).toBe("fixed");
		consumable.unmount();
	});
});
