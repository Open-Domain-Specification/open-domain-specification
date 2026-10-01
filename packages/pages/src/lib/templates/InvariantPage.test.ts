import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import InvariantPage from "./InvariantPage.svelte";

describe("InvariantPage", () => {
	it("reads an external event postcondition as a payload guarantee", () => {
		const workspace = new Workspace("Feeds", {
			description: "",
			version: "test",
		});
		const context = workspace.addBoundedContext("Scheme", {
			description: "",
			external: true,
		});
		const payload = context.addSchema("Notification", { description: "" });
		const amount = payload.addAttribute("amount", { type: "number" });
		const service = context.addService("Feed", {
			type: "application",
			description: "",
		});
		const captured = service.provides("Captured", {
			type: "event",
			description: "",
			pattern: "published-language",
			schema: payload,
		});
		context
			.addInvariant("NonnegativeCapture", {
				description: "The captured amount is nonnegative.",
				postcondition: true,
			})
			.constrains(amount, captured);

		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			expect(ws.validate().filter((d) => d.severity === "error")).toEqual([]);
			const invariant = ws.boundedcontexts
				.get("scheme")!
				.invariants.get("nonnegative_capture")!;
			const model = { workspace: ws, fileLabel: "feeds.json", diagnostics: [] };
			const { container } = render(Harness, {
				model,
				component: InvariantPage,
				args: { invariant },
			});
			const guards = container.querySelector("#guards") as HTMLElement;
			expect(guards.querySelector("h2")).toHaveTextContent(
				"Guaranteed on event",
			);
			expect(guards).toHaveTextContent(
				"The event whose payload carries this guarantee.",
			);
			expect(guards.querySelector("a")).toHaveAttribute("href", captured.ref);
			expect(guards).not.toHaveTextContent(
				"The operations this rule is checked of.",
			);
		}
	});
});
