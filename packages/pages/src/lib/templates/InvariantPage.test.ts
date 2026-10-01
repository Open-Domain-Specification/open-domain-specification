import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import InvariantPage from "./InvariantPage.svelte";

describe("InvariantPage", () => {
	it("describes an aggregate postcondition that relates request and answer", () => {
		const workspace = new Workspace("Plans", {
			description: "",
			version: "test",
		});
		const context = workspace.addBoundedContext("Planning", {
			description: "",
		});
		const aggregate = context.addAggregate("Plan", { description: "" });
		const root = aggregate.addRootEntity("Plan", { description: "" });
		root.addAttribute("id", { type: "string", identity: true });
		const request = context.addSchema("Plan Request", { description: "" });
		const deadline = request.addAttribute("deadline", { type: "date" });
		const answer = context.addSchema("Plan Answer", { description: "" });
		const arrival = answer.addAttribute("arrival", { type: "date" });
		const service = context.addService("Planner", {
			description: "",
			type: "application",
		});
		const plan = service.provides("Plan Trip", {
			description: "",
			type: "operation",
			schema: request,
			returns: answer,
		});
		aggregate
			.addInvariant("Arrives By Deadline", {
				description: "The answer meets the requested deadline.",
				postcondition: true,
			})
			.constrains(plan, deadline, arrival);

		for (const ws of [workspace, Workspace.fromSchema(workspace.toSchema())]) {
			expect(ws.validate().filter((d) => d.severity === "error")).toEqual([]);
			const invariant = ws.boundedcontexts
				.get("planning")!
				.aggregates.get("plan")!
				.invariants.get("arrives_by_deadline")!;
			const { container } = render(Harness, {
				model: { workspace: ws, fileLabel: "plans.json", diagnostics: [] },
				component: InvariantPage,
				args: { invariant },
			});
			const section = container.querySelector("#constrains") as HTMLElement;
			const guards = container.querySelector("#guards") as HTMLElement;
			expect(section).toHaveTextContent("guarded call's request");
			expect(section).toHaveTextContent("answer or refusal");
			expect(section).toHaveTextContent("deadline");
			expect(section).toHaveTextContent("arrival");
			expect(guards).toHaveTextContent(
				"without claiming an aggregate keeps that answer true afterward",
			);
			expect(section).not.toHaveTextContent(
				"which are the fields of what the guarded call answers or refuses with",
			);
		}
	});

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

		const lookup = service.provides("Get Capture", {
			type: "operation",
			description: "",
			pattern: "open-host-service",
			returns: payload,
		});
		context.invariants.get("nonnegative_capture")!.constrains(lookup);
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
			expect(guards.querySelector("h2")).toHaveTextContent("Guaranteed by");
			expect(guards).toHaveTextContent(
				"The operations and events that carry this guarantee.",
			);
			expect(guards).toHaveTextContent("Captured");
			expect(guards).toHaveTextContent("Get Capture");
		}
	});
});
