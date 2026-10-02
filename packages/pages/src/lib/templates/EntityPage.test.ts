import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import northbank from "../../../../../models/northbank/.ods/northbank.json";
import Harness from "../evidence/WithModel.harness.svelte";
import { petstoreModel } from "../fixtures";
import EntityPage from "./EntityPage.svelte";

const page = (workspace: Workspace, ref: string) => {
	const model = { workspace, fileLabel: "model.json", diagnostics: [] };
	const entity = workspace.getEntityByRefOrThrow(ref);
	return render(Harness, {
		model,
		component: EntityPage,
		args: { entity },
	}).container;
};

describe("EntityPage", () => {
	it("names a relation from another aggregate to Petstore's Carrier", () => {
		const workspace = petstoreModel().workspace;
		const ref = workspace.boundedcontexts
			.get("fulfilment_bc")
			?.aggregates.get("carrier")
			?.entities.get("carrier")?.ref as string;
		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			expect(ws.validate()).toEqual([]);
			const relations = page(ws, ref).querySelector(
				"#relations",
			) as HTMLElement;
			const incoming = relations.querySelector("table") as HTMLElement;
			const row = [...incoming.querySelectorAll("tbody tr")].find((tr) =>
				tr.textContent?.includes("shipped-by"),
			) as HTMLElement;
			expect(row).toHaveTextContent("Shipment");
			expect(row).toHaveTextContent("references");
			expect(row.querySelectorAll("td")[1]).toHaveTextContent("Shipment");
			expect(relations).not.toHaveTextContent(
				"No relation names this entity directly.",
			);
		}
	});

	it("names the context rule constraining NorthBank's LoanApplication", () => {
		const workspace = Workspace.fromSchema(
			northbank as Parameters<typeof Workspace.fromSchema>[0],
		);
		const lending = workspace.boundedcontexts.get("lending")!;
		const ref = lending.aggregates
			.get("loan_application")!
			.entities.get("loan_application")!.ref;
		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			const section = page(ws, ref).querySelector("#invariants") as HTMLElement;
			const row = [...section.querySelectorAll("tbody tr")].find((tr) =>
				tr.textContent?.includes("OneOpenApplicationPerCustomer"),
			) as HTMLElement;
			expect(row).toHaveTextContent("Lending");
			expect(row.querySelectorAll("td")[1]).toHaveTextContent("Lending");
			expect(row.querySelector("a")).toHaveAttribute(
				"data-ref",
				ws.boundedcontexts
					.get("lending")!
					.invariants.get("one_open_application_per_customer")!.ref,
			);
			expect(section).not.toHaveTextContent("No invariant names this entity.");
			expect(section).not.toHaveTextContent(
				"The root enforces them on every change.",
			);
		}
	});

	it("names NorthBank Account rules aimed at its attributes", () => {
		const workspace = Workspace.fromSchema(
			northbank as Parameters<typeof Workspace.fromSchema>[0],
		);
		const account = workspace.boundedcontexts
			.get("accounts")!
			.aggregates.get("account")!;
		const ref = account.entities.get("account")!.ref;
		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			const section = page(ws, ref).querySelector("#invariants") as HTMLElement;
			for (const name of [
				"BalanceWithinOverdraft",
				"AvailableIsPostedLessHolds",
				"ClosedHasZeroBalance",
			]) {
				const row = [...section.querySelectorAll("tbody tr")].find((tr) =>
					tr.textContent?.includes(name),
				) as HTMLElement;
				expect(row).toHaveTextContent("Account");
				expect(row.querySelectorAll("td")[1]).toHaveTextContent("Account");
			}
			expect(section).not.toHaveTextContent(
				"No invariant names this entity or its attributes.",
			);
		}
	});

	it("names NorthBank PaymentInstruction rules on an attribute, including a context rule", () => {
		const workspace = Workspace.fromSchema(
			northbank as Parameters<typeof Workspace.fromSchema>[0],
		);
		const payments = workspace.boundedcontexts.get("payments_hub")!;
		const ref = payments.aggregates
			.get("payment_instruction")!
			.entities.get("payment_instruction")!.ref;
		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			const section = page(ws, ref).querySelector("#invariants") as HTMLElement;
			for (const name of ["AmountPositive", "FundsAvailableAtInitiation"]) {
				const row = [...section.querySelectorAll("tbody tr")].find((tr) =>
					tr.textContent?.includes(name),
				) as HTMLElement;
				expect(row.querySelectorAll("td")[1]).toHaveTextContent(
					"PaymentInstruction",
				);
			}
			const dailyLimit = [...section.querySelectorAll("tbody tr")].find((tr) =>
				tr.textContent?.includes("DailyLimit"),
			) as HTMLElement;
			expect(dailyLimit.querySelectorAll("td")[1]).toHaveTextContent(
				"Payments Hub",
			);
			expect(dailyLimit.querySelector("a")).toHaveAttribute(
				"data-ref",
				ws.boundedcontexts.get("payments_hub")!.invariants.get("daily_limit")!
					.ref,
			);
		}
	});

	it("shows a kind's inherited reference on its page and as an incoming use", () => {
		const workspace = new Workspace("Kinds", {
			description: "",
			version: "test",
		});
		const context = workspace
			.addDomain("Shipping", { description: "" })
			.addSubdomain("Fulfilment", { description: "", type: "core" })
			.addBoundedcontext("Fulfilment", { description: "" });
		const carrier = context.addAggregate("Carrier", { description: "" });
		const carrierRoot = carrier.addRootEntity("Carrier", { description: "" });
		carrierRoot.addAttribute("id", { type: "string", identity: true });
		const shipment = context.addAggregate("Shipment", { description: "" });
		const shipmentRoot = shipment.addRootEntity("Shipment", {
			description: "",
		});
		shipmentRoot.addAttribute("id", { type: "string", identity: true });
		shipment
			.addInvariant("ShipmentHasId", { description: "" })
			.constrains(shipmentRoot.attributes.get("id")!);
		shipmentRoot.references(carrierRoot, "shipped-by");
		const express = shipment.addEntity("ExpressShipment", {
			description: "",
			specialises: shipmentRoot,
		});

		expect(workspace.validate()).toEqual([]);
		const outgoing = page(workspace, express.ref).querySelector(
			"#relations table tbody tr",
		) as HTMLElement;
		expect(outgoing).toHaveTextContent("Carrier");
		expect(outgoing).toHaveTextContent("from Shipment");
		expect(
			page(workspace, express.ref).querySelector("#invariants"),
		).toHaveTextContent("ShipmentHasId");
		const incoming = page(workspace, carrierRoot.ref).querySelector(
			"#relations",
		) as HTMLElement;
		expect(incoming).toHaveTextContent("ExpressShipment");
		expect(incoming).toHaveTextContent("from Shipment");
	});
});
