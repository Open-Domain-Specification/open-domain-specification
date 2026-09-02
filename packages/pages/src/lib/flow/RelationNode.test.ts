import { render, waitFor } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { installXyflowTestEnv } from "../xyflow-test-env";
import type { GraphNode } from "./graph";
import Harness from "./NodeHarness.svelte";
import RelationNode from "./RelationNode.svelte";

installXyflowTestEnv();

const relation = (data: GraphNode & { floating?: boolean; sketch?: boolean }) =>
	render(Harness, { node: RelationNode, type: "relation", data });

describe("RelationNode", () => {
	it("draws a class box with stereotype, name, attributes and the cluster path", async () => {
		const { container } = relation({
			id: "#/order",
			type: "relation",
			label: "Order",
			icon: "symbol-field",
			groupPath: "Sales / Order",
			chips: ["root entity"],
			tone: "core",
			attributes: [
				{ name: "id", type: "string", identity: true },
				{ name: "total", type: "Money", identity: false },
			],
		});
		await waitFor(() =>
			expect(container.querySelector(".relation-node")).toBeTruthy(),
		);
		const box = container.querySelector(".relation-node");
		expect(box).toHaveClass("core");
		expect(box).toHaveAttribute("title", "#/order");
		expect(container.querySelector(".stereotype")).toHaveTextContent(
			"«root entity»",
		);
		expect(container.querySelector("strong")).toHaveTextContent("Order");
		const rows = container.querySelectorAll(".attrs li");
		expect(rows).toHaveLength(2);
		expect(rows[0]).toHaveTextContent("{id} id: string");
		expect(rows[0].querySelector(".identity")).toBeTruthy();
		expect(rows[1].querySelector(".identity")).toBeNull();
		expect(rows[1].querySelector(".type")).toHaveTextContent("Money");
		expect(container.querySelector(".group")).toHaveTextContent(
			"Sales / Order",
		);
		expect(container.querySelector(".handle-hidden")).toBeNull();
	});

	it("keeps an empty compartment, defaults the stereotype and hides handles when floating", async () => {
		const { container } = relation({
			id: "#/v",
			type: "relation",
			label: "V",
			icon: "symbol-constant",
			chips: [],
			floating: true,
		});
		await waitFor(() =>
			expect(container.querySelector(".relation-node")).toBeTruthy(),
		);
		const box = container.querySelector(".relation-node");
		for (const tone of ["core", "warn", "muted"])
			expect(box?.classList.contains(tone)).toBe(false);
		expect(container.querySelector(".stereotype")).toHaveTextContent(
			"«entity»",
		);
		expect(container.querySelectorAll(".attrs li.empty")).toHaveLength(1);
		expect(container.querySelector(".group")).toBeNull();
		expect(container.querySelectorAll(".handle-hidden").length).toBe(2);
	});

	it("dashes a value object", async () => {
		const { container } = relation({
			id: "#/v",
			type: "relation",
			label: "V",
			icon: "symbol-constant",
			chips: ["value object"],
			tone: "muted",
		});
		await waitFor(() =>
			expect(container.querySelector(".relation-node")).toHaveClass("muted"),
		);
	});
});

describe("RelationNode in sketch style", () => {
	it("takes the sketch class for the ellipse style", () => {
		const { container } = relation({
			id: "#/x",
			type: "relation",
			label: "X",
			icon: "entity",
			sketch: true,
		});
		expect(container.querySelector(".relation-node.sketch")).toBeTruthy();
	});
});
