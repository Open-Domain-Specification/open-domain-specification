import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";

installXyflowTestEnv();

/** jsdom never measures nodes, so the internal-node hook is replaced with placed, sized boxes. */
const boxes: Record<
	string,
	{ x: number; y: number; w: number; h: number } | undefined
> = {
	"#/a": { x: 0, y: 0, w: 100, h: 50 },
	"#/b": { x: 300, y: 120, w: 120, h: 60 },
};
vi.mock("@xyflow/svelte", async (importOriginal) => {
	const actual = await importOriginal<typeof import("@xyflow/svelte")>();
	return {
		...actual,
		useInternalNode: (id: string) => ({
			get current() {
				const b = boxes[id];
				return b
					? {
							internals: { positionAbsolute: { x: b.x, y: b.y } },
							measured: { width: b.w, height: b.h },
						}
					: undefined;
			},
		}),
	};
});

describe("FloatingEdge", () => {
	it("draws a path between the facing sides of both nodes with a label", async () => {
		const { default: Harness } = await import("./FloatingEdge.harness.svelte");
		const { diagramOptions } = await import("./options.svelte");
		const { container } = render(Harness, { label: "uses" });
		await waitFor(() => {
			expect(container.querySelector("path")).toBeTruthy();
		});
		expect(container.textContent).toContain("uses");
		for (const edges of ["straight", "step", "smoothstep", "bezier"] as const) {
			diagramOptions.set({ edges });
			await waitFor(() => expect(diagramOptions.edges).toBe(edges));
			expect(container.querySelector("path")?.getAttribute("d")).toBeTruthy();
		}
	});
	it("omits the label when there is none and renders nothing while a node is missing", async () => {
		const { default: Harness } = await import("./FloatingEdge.harness.svelte");
		const { container } = render(Harness, { label: "" });
		await waitFor(() => {
			expect(container.querySelector("path")).toBeTruthy();
		});
		expect(container.querySelector(".edge-label")).toBeNull();
		boxes["#/b"] = undefined;
		const { container: missing } = render(Harness, { label: "x" });
		expect(missing.querySelector("path")).toBeNull();
		boxes["#/b"] = { x: 300, y: 120, w: 120, h: 60 };
	});
	it("falls back to zero size when a node has not been measured", async () => {
		boxes["#/b"] = {
			x: 300,
			y: 120,
			w: undefined as unknown as number,
			h: undefined as unknown as number,
		};
		const { default: Harness } = await import("./FloatingEdge.harness.svelte");
		const { container } = render(Harness, { label: "" });
		await waitFor(() => {
			expect(container.querySelector("path")).toBeTruthy();
		});
		boxes["#/a"] = { x: 0, y: 0, w: 100, h: 50 };
		boxes["#/b"] = { x: 300, y: 120, w: 120, h: 60 };
	});
});
