import { render } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import { createDiagramFit } from "./fit.svelte";
import Harness from "./PanelFit.harness.svelte";
import { crowded, fitPastPanels, NO_AIR } from "./panel-fit";
import { resetPanelChoices } from "./panel-state.svelte";

vi.mock("./panel-fit", async (original) => ({
	...(await original<typeof import("./panel-fit")>()),
	fitPastPanels: vi.fn(),
	crowded: vi.fn(() => false),
}));

installXyflowTestEnv();

/** The refit lands a tick and two frames after mount; wait for all three. */
const settled = () =>
	new Promise((resolve) =>
		requestAnimationFrame(() =>
			requestAnimationFrame(() => setTimeout(resolve, 0)),
		),
	);

/** Long enough for the whole order to be walked, a step per tick and frame. */
const walked = async () => {
	for (let i = 0; i <= 4; i += 1) await settled();
};

beforeEach(() => {
	sessionStorage.clear();
	resetPanelChoices();
});

describe("PanelFit", () => {
	it("refits the canvas past the panels once the diagram is laid out", async () => {
		const container = document.createElement("div");
		const { unmount } = render(Harness, { container });
		expect(fitPastPanels).not.toHaveBeenCalled();
		await settled();
		expect(fitPastPanels).toHaveBeenCalledWith(
			expect.objectContaining({ fitView: expect.any(Function) }),
			container,
			expect.any(Number),
		);
		unmount();
	});

	it("stops at the first step that gives the map its room", async () => {
		// Crowded once: the legend gives way and the second question says no.
		vi.mocked(crowded).mockReturnValueOnce(true);
		const container = document.createElement("div");
		const fit = createDiagramFit();
		const { unmount } = render(Harness, { container, fit });
		await walked();
		expect(fit.step).toBe("legend");
		expect(fit.legend.collapsed).toBe(true);
		expect(fit.options.collapsed).toBe(false);
		expect(fitPastPanels).toHaveBeenCalledWith(
			expect.anything(),
			container,
			fit.air,
		);
		unmount();
	});

	it("walks the whole order for a map that will not fit whatever it gives", async () => {
		vi.mocked(crowded).mockReturnValue(true);
		const container = document.createElement("div");
		const fit = createDiagramFit();
		const { unmount } = render(Harness, { container, fit });
		await walked();
		expect(fit.step).toBe("floor");
		expect(fit.legend.collapsed).toBe(true);
		expect(fit.options.collapsed).toBe(true);
		expect(fit.air).toBe(NO_AIR);
		expect(fitPastPanels).toHaveBeenCalledWith(
			expect.anything(),
			container,
			NO_AIR,
		);
		unmount();
	});

	it("measures nothing and fits nothing without a container", async () => {
		const { unmount } = render(Harness, {});
		await settled();
		expect(fitPastPanels).toHaveBeenCalledWith(
			expect.anything(),
			undefined,
			expect.any(Number),
		);
		unmount();
	});

	it("drops the pending frame when the diagram goes away first", async () => {
		const { unmount } = render(Harness, {
			container: document.createElement("div"),
		});
		unmount();
		await walked();
		expect(fitPastPanels).not.toHaveBeenCalled();
	});
});

describe("PanelFit after the fit lands", () => {
	/** Each observer made while rendering, with the elements it watches. */
	let observers: { report: () => void; watched: Element[] }[];
	/** The one watching the panels, which is PanelFit's; Svelte Flow makes its own. */
	const panels = (container: Element) => {
		const found = observers.find((o) =>
			o.watched.includes(container.children[0]),
		);
		if (!found) throw new Error("nothing watches the panels");
		return found;
	};

	beforeEach(() => {
		observers = [];
		vi.stubGlobal(
			"ResizeObserver",
			class {
				watched: Element[] = [];
				constructor(report: () => void) {
					observers.push({ report, watched: this.watched });
				}
				observe(el: Element) {
					this.watched.push(el);
				}
				disconnect() {}
			},
		);
		vi.mocked(fitPastPanels).mockClear();
	});
	afterEach(() => vi.unstubAllGlobals());

	/** A diagram's box with one of each panel the fit keeps clear of in it. */
	const withPanels = () => {
		const container = document.createElement("div");
		container.innerHTML = [
			'<div class="diagram-legend"></div>',
			'<div class="diagram-options"></div>',
			'<div class="svelte-flow__controls"></div>',
			'<div class="svelte-flow__minimap"></div>',
		].join("");
		return container;
	};

	it("watches every panel the fit keeps clear of", async () => {
		const container = withPanels();
		const { unmount } = render(Harness, { container });
		expect(panels(container).watched).toEqual([...container.children]);
		unmount();
	});

	it("refits when a panel changes size while the view is still the fit's", async () => {
		const container = withPanels();
		const { unmount } = render(Harness, { container });
		await walked();
		expect(fitPastPanels).toHaveBeenCalledTimes(1);
		panels(container).report();
		expect(fitPastPanels).toHaveBeenCalledTimes(2);
		unmount();
	});

	it("leaves a view the reader has moved alone", async () => {
		const container = withPanels();
		const fit = createDiagramFit();
		const { unmount } = render(Harness, { container, fit });
		await walked();
		// What the reader's zoom does: the view on screen is no longer the fit's.
		fit.landed({ x: 40, y: 40, zoom: 2 });
		panels(container).report();
		expect(fitPastPanels).toHaveBeenCalledTimes(1);
		unmount();
	});

	it("does not refit before the first fit lands, nor after the diagram goes", async () => {
		const container = withPanels();
		const { unmount } = render(Harness, { container });
		// The walk collapses panels before it lands: those resizes are its own.
		panels(container).report();
		expect(fitPastPanels).not.toHaveBeenCalled();
		await walked();
		unmount();
		panels(container).report();
		expect(fitPastPanels).toHaveBeenCalledTimes(1);
	});
});
