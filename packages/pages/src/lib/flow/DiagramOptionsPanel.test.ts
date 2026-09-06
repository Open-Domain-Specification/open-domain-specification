import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./DiagramOptionsPanel.harness.svelte";
import { createFullscreen } from "./fullscreen.svelte";
import { diagramOptions } from "./options.svelte";
import { resetPanelChoices } from "./panel-state.svelte";

installXyflowTestEnv();

beforeEach(() => {
	sessionStorage.clear();
	resetPanelChoices();
});

describe("DiagramOptionsPanel gives way", () => {
	it("opens and closes from its header, keeping the fullscreen action either way", async () => {
		const { container } = render(Harness);
		const header = screen.getByRole("button", { name: "Options" });
		const controls = container.querySelector(
			".options-controls",
		) as HTMLElement;
		expect(header).toHaveAttribute("aria-expanded", "true");
		expect(header.getAttribute("aria-controls")).toBe(controls.id);
		expect(controls.hidden).toBe(false);
		await fireEvent.click(header);
		expect(header).toHaveAttribute("aria-expanded", "false");
		expect(controls.hidden).toBe(true);
		// The one command action stays: a map too big for the canvas is exactly
		// when a reader reaches for fullscreen.
		expect(screen.getByLabelText("Enter fullscreen")).toBeInTheDocument();
		await fireEvent.click(header);
		expect(controls.hidden).toBe(false);
	});

	it("comes up collapsed when the fit has run out of room", () => {
		const { container } = render(Harness, { crowded: true });
		expect(screen.getByRole("button", { name: "Options" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);
		expect(
			(container.querySelector(".options-controls") as HTMLElement).hidden,
		).toBe(true);
	});
});

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

/** The refit runs a frame after the toggle; wait for it so `fitView` really is called. */
const framed = () =>
	new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

describe("DiagramOptionsPanel fullscreen toggle", () => {
	it("flips the diagram in and out of the overlay, swapping the codicon and its label", async () => {
		const fullscreen = createFullscreen();
		const { getByLabelText, container } = render(Harness, { fullscreen });
		const button = () => getByLabelText("Enter fullscreen");
		expect(button()).toHaveAttribute("title", "Enter fullscreen");
		expect(container.querySelector(".codicon-screen-full")).toBeTruthy();
		await fireEvent.click(button());
		await framed();
		expect(fullscreen.active).toBe(true);
		expect(getByLabelText("Exit fullscreen")).toBeInTheDocument();
		expect(container.querySelector(".codicon-screen-normal")).toBeTruthy();
		await fireEvent.click(getByLabelText("Exit fullscreen"));
		await framed();
		expect(fullscreen.active).toBe(false);
		expect(container.querySelector(".codicon-screen-full")).toBeTruthy();
		fullscreen.stop();
	});
});
