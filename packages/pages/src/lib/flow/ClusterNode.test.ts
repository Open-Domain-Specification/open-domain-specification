import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import ClusterNode from "./ClusterNode.svelte";
import Harness from "./NodeHarness.svelte";

installXyflowTestEnv();

const cluster = (data: { label: string; depth: number }, size = 0) =>
	render(Harness, {
		node: ClusterNode,
		type: "cluster",
		data,
		width: size || undefined,
		height: size ? size / 2 : undefined,
	});

describe("ClusterNode", () => {
	it("draws a sized, shaded region with the label at the top left", async () => {
		const { container } = cluster({ label: "Commerce", depth: 1 }, 400);
		await waitFor(() =>
			expect(container.querySelector(".cluster-node")).toBeTruthy(),
		);
		const node = container.querySelector(".cluster-node") as HTMLElement;
		expect(node.style.width).toBe("400px");
		expect(node.style.height).toBe("200px");
		expect(node.getAttribute("style")).toContain("--shade: 0.11");
		expect(node.getAttribute("data-depth")).toBe("1");
		expect(node.querySelector(".cluster-label")?.textContent).toBe("Commerce");
	});
	it("lightens with depth down to a floor so deep clusters stay visible", async () => {
		const { container } = cluster({ label: "Deep", depth: 6 });
		await waitFor(() =>
			expect(container.querySelector(".cluster-node")).toBeTruthy(),
		);
		const node = container.querySelector(".cluster-node") as HTMLElement;
		expect(node.getAttribute("style")).toContain("--shade: 0.04");
	});
});
