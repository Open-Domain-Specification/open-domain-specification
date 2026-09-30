import { render } from "@testing-library/svelte";
import type { SvelteFlowStore } from "@xyflow/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import { createDiagramFit, type DiagramFit } from "./fit.svelte";
import Harness from "./PanelFit.harness.svelte";
import { crowded, FLOOR_ZOOM, fitPastPanels } from "./panel-fit";
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
		expect(fitPastPanels).toHaveBeenCalledWith(expect.anything(), container);
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
		expect(fit.minZoom).toBe(FLOOR_ZOOM);
		expect(fitPastPanels).toHaveBeenCalledWith(expect.anything(), container);
		unmount();
	});

	it("measures nothing and fits nothing without a container", async () => {
		const { unmount } = render(Harness, {});
		await settled();
		expect(fitPastPanels).toHaveBeenCalledWith(expect.anything(), undefined);
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

	/** The tick PanelFit waits for the diagram to bind its box, and the continuation after it. */
	const bound = async () => {
		await tick();
		await Promise.resolve();
	};

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

	it("watches every panel the fit keeps clear of, once the diagram is bound", async () => {
		const container = withPanels();
		const { unmount } = render(Harness, { container });
		await bound();
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
		await bound();
		// The walk collapses panels before it lands: those resizes are its own.
		panels(container).report();
		expect(fitPastPanels).not.toHaveBeenCalled();
		await walked();
		unmount();
		panels(container).report();
		expect(fitPastPanels).toHaveBeenCalledTimes(1);
	});
});

describe("PanelFit when the canvas changes size", () => {
	beforeEach(() => vi.mocked(fitPastPanels).mockClear());

	/** Renders the fit and hands back Svelte Flow's store, to say what the canvas measured. */
	const mount = (props: { fit?: DiagramFit; fullscreen?: boolean } = {}) => {
		let store: SvelteFlowStore | undefined;
		const container = document.createElement("div");
		const view = render(Harness, {
			container,
			...props,
			onstore: (s: SvelteFlowStore) => {
				store = s;
			},
		});
		/** What Svelte Flow's ResizeObserver does once the new size is laid out. */
		const measure = async (width: number, height: number) => {
			if (!store) throw new Error("no store");
			store.width = width;
			store.height = height;
			await tick();
		};
		return { ...view, measure };
	};

	it("refits once Svelte Flow has measured the new size, while the view is the fit's", async () => {
		const { measure, unmount } = mount();
		await walked();
		expect(fitPastPanels).toHaveBeenCalledTimes(1);
		await measure(1300, 900);
		expect(fitPastPanels).toHaveBeenCalledTimes(2);
		unmount();
	});

	it("does not fit a canvas measured before the first fit lands", async () => {
		const { measure, unmount } = mount();
		await measure(1300, 900);
		expect(fitPastPanels).not.toHaveBeenCalled();
		unmount();
	});

	it("leaves the reader's view alone when only the canvas changes", async () => {
		const fit = createDiagramFit();
		const { measure, unmount } = mount({ fit });
		await walked();
		fit.landed({ x: 40, y: 40, zoom: 2 });
		await measure(1300, 900);
		expect(fitPastPanels).toHaveBeenCalledTimes(1);
		unmount();
	});

	it("takes the view back on entering and leaving fullscreen, and fits the new canvas", async () => {
		const fit = createDiagramFit();
		const { measure, rerender, unmount } = mount({ fit });
		await walked();
		for (const [fullscreen, width, height] of [
			[true, 1300, 900],
			[false, 760, 540],
		] as const) {
			// The reader had zoomed in: the view is theirs, until they ask for a new canvas.
			fit.landed({ x: 40, y: 40, zoom: 2 });
			await rerender({ fullscreen });
			const before = vi.mocked(fitPastPanels).mock.calls.length;
			await measure(width, height);
			expect(fitPastPanels).toHaveBeenCalledTimes(before + 1);
		}
		unmount();
	});
});
