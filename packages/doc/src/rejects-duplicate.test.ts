import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { toDoc } from "./index";

describe("duplicate refusal declarations in Markdown", () => {
	it("prints every authored schema entry and reason occurrence", async () => {
		const workspace = new Workspace("Contracts", {
			description: "",
			version: "test",
		});
		const context = workspace.addBoundedContext("Payments", {
			description: "",
		});
		const schema = context.addSchema("Declined", { description: "" });
		schema.addAttribute("code", { type: "string" });
		const service = context.addService("Gateway", {
			description: "",
			type: "application",
		});
		service.provides("Charge", {
			description: "Declines a charge with a reason.",
			type: "operation",
			rejects: [
				{ schema, reasons: ["late", "late"] },
				{ schema, many: true, reasons: ["late", "unknown"] },
			],
		});

		const workspaceSchema = workspace.toSchema();
		const roundTripped = Workspace.fromSchema(
			JSON.parse(JSON.stringify(workspaceSchema)),
		);
		const persisted = roundTripped.toSchema();
		const paymentContext = Object.values(persisted.boundedcontexts)[0];
		const gateway = Object.values(paymentContext.services ?? {})[0];
		const charge = Object.values(gateway.provides ?? {}).find(
			(consumable) => consumable.name === "Charge",
		);
		expect(JSON.parse(JSON.stringify(charge?.rejects))).toEqual([
			{ $ref: schema.ref, reasons: ["late", "late"] },
			{
				$ref: schema.ref,
				many: true,
				reasons: ["late", "unknown"],
			},
		]);
		const docs = await toDoc(roundTripped);
		const servicePage =
			docs["boundedcontexts/payments/services/gateway/index.md"];

		expect(servicePage).toContain(
			"[Declined](../../index.md#schemas) (late, late), many [Declined](../../index.md#schemas) (late, unknown)",
		);
	});
});
