import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../Page.harness.svelte";

describe("ConsumablePage rejection rows", () => {
	it("renders a duplicate-declaration problem and retains repeated schema and reason rows", () => {
		const workspace = new Workspace("Contracts", {
			description: "",
			version: "test",
		});
		const context = workspace.addBoundedContext("Payments", {
			description: "",
		});
		const schema = context.addSchema("Declined");
		const service = context.addService("Gateway", {
			description: "",
			type: "application",
		});
		const operation = service.provides("Charge", {
			description: "",
			type: "operation",
			rejects: [
				{ schema, reasons: ["late", "late"] },
				{ schema, many: true, reasons: ["late"] },
			],
		});
		const diagnostics = workspace
			.validate()
			.filter((diagnostic) => diagnostic.rule === "rejects-duplicate");
		expect(diagnostics).toHaveLength(2);
		expect(
			diagnostics.every(
				(diagnostic) =>
					diagnostic.rule === "rejects-duplicate" &&
					diagnostic.ref === operation.ref,
			),
		).toBe(true);
		const { container } = render(Harness, {
			model: {
				workspace,
				fileLabel: "contracts.json",
				diagnostics,
			},
			ref: operation.ref,
		});

		expect(container).toHaveTextContent("rejects-duplicate");
		expect(container.querySelectorAll(".page-header .rejection")).toHaveLength(
			2,
		);
		expect(container.querySelectorAll("#rejects .subsection")).toHaveLength(2);
		expect(container.querySelectorAll("#rejects .subsection h3")).toHaveLength(
			2,
		);
		expect(
			container.querySelectorAll("#rejects .reasons .keyword"),
		).toHaveLength(3);
		expect(
			new Set(
				[...container.querySelectorAll("#rejects h3")].map((node) => node.id),
			).size,
		).toBe(2);
	});
});
