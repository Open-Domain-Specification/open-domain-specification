import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import northbank from "../../../../../models/northbank/.ods/northbank.json";
import Harness from "../evidence/WithModel.harness.svelte";
import AggregatePage from "./AggregatePage.svelte";

const page = (workspace: Workspace, contextId: string, aggregateId: string) => {
	const aggregate = workspace.boundedcontexts
		.get(contextId)!
		.aggregates.get(aggregateId)!;
	return render(Harness, {
		model: { workspace, fileLabel: "northbank.json", diagnostics: [] },
		component: AggregatePage,
		args: { aggregate },
	}).container;
};

const timing = (container: HTMLElement, invariant: string) => {
	const section = container.querySelector("#invariants") as HTMLElement;
	const table = section.querySelector("table") as HTMLElement;
	const row = [...table.querySelectorAll("tbody tr")].find((tr) =>
		tr.textContent?.includes(invariant),
	);
	expect(row, `${invariant} is listed`).toBeDefined();
	return row!.querySelectorAll("td")[1].textContent?.trim();
};

describe("AggregatePage", () => {
	it("distinguishes NorthBank's preconditions, answer guarantees and persistent rules", () => {
		const workspace = Workspace.fromSchema(
			northbank as Parameters<typeof Workspace.fromSchema>[0],
		);
		for (const model of [
			workspace,
			Workspace.fromSchema(workspace.toSchema()),
		]) {
			const payment = page(model, "payments_hub", "payment_instruction");
			expect(timing(payment, "FundsAvailableAtInitiation")).toBe(
				"Checked before",
			);
			expect(timing(payment, "PayerNotPayee")).toBe("Holds after every change");
			expect(payment).not.toHaveTextContent(
				"The root enforces them on every change",
			);

			const card = page(model, "cards", "card");
			expect(timing(card, "AuthWithinAvailableBalance")).toBe("Checked after");
		}
	});
});
