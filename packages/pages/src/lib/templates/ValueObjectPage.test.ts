import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import ValueObjectPage from "./ValueObjectPage.svelte";

describe("ValueObjectPage", () => {
	it("names a foreign aggregate's rule that constrains a borrowed value, before and after round-trip", () => {
		const workspace = new Workspace("Review", {
			description: "",
			version: "test",
		});
		const subdomain = workspace
			.addDomain("Bank", { description: "" })
			.addSubdomain("Banking", { description: "", type: "core" });
		const ledger = subdomain.addBoundedcontext("Ledger", {
			description: "",
		});
		const cards = subdomain.addBoundedcontext("Cards", {
			description: "",
		});
		ledger.sharesKernelWith(cards);
		const money = ledger.addValueObject("Money", { description: "" });
		money.addAttribute("amount", { type: "int" });
		const card = cards.addAggregate("Card", { description: "" });
		const root = card.addRootEntity("Card", { description: "" });
		root.addAttribute("id", { type: "string", identity: true });
		root.addAttribute("balance", { type: "Money", valueobject: money });
		const rule = card.addInvariant("PositiveBalance", {
			description: "The held amount is positive.",
		});
		rule.constrains(money);

		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			expect(ws.validate()).toEqual([]);
			const valueobject = ws.getValueObjectByRefOrThrow(money.ref);
			const model = {
				workspace: ws,
				fileLabel: "review.json",
				diagnostics: [],
			};
			const { container } = render(Harness, {
				model,
				component: ValueObjectPage,
				args: { valueobject },
			});
			const section = container.querySelector("#constrained-by") as HTMLElement;
			expect(section.querySelectorAll("tbody tr")).toHaveLength(1);
			expect(section).toHaveTextContent("PositiveBalance");
			expect(section).not.toHaveTextContent(
				"No aggregate's rule names this value object.",
			);
			expect(
				[...section.querySelectorAll("thead th")].map((h) => h.textContent),
			).toEqual(["Invariant", "Kept by", "Description"]);
			const row = section.querySelector("tbody tr") as HTMLElement;
			expect(row.querySelectorAll("a")).toHaveLength(3);
			expect(row.querySelectorAll("td")[1]).toHaveTextContent("Cards / Card");
			expect(row.querySelectorAll("a")[0]).toHaveAttribute("href", rule.ref);
			expect(row.querySelectorAll("a")[1]).toHaveAttribute("href", cards.ref);
			expect(row.querySelectorAll("a")[2]).toHaveAttribute("href", card.ref);
		}
	});
});
