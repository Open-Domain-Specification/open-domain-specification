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
