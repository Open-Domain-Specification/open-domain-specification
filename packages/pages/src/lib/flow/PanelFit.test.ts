import { render } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import Harness from "./PanelFit.harness.svelte";
import { fitPastPanels } from "./panel-fit";

vi.mock("./panel-fit", async (original) => ({
	...(await original<typeof import("./panel-fit")>()),
	fitPastPanels: vi.fn(),
}));

installXyflowTestEnv();

/** The refit lands a tick and two frames after mount; wait for all three. */
const settled = () =>
	new Promise((resolve) =>
		requestAnimationFrame(() =>
			requestAnimationFrame(() => setTimeout(resolve, 0)),
		),
	);

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

	it("drops the pending frame when the diagram goes away first", async () => {
		const { unmount } = render(Harness, {
			container: document.createElement("div"),
		});
		unmount();
		await settled();
		expect(fitPastPanels).not.toHaveBeenCalled();
	});
});
