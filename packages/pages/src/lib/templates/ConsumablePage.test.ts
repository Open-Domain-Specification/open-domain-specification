import { readFileSync } from "node:fs";
import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { compile } from "svelte/compiler";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import Harness from "../Page.harness.svelte";
import { PETSTORE_REFS } from "./petstore.harness";

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

describe("ConsumablePage reached-events sentence (#79)", () => {
	it("underlines the links inside the sentence, not the lists of links beside it", () => {
		const css = compile(
			readFileSync(`${__dirname}/ConsumablePage.svelte`, "utf8"),
			{ filename: "ConsumablePage.svelte", css: "external" },
		).css?.code as string;
		expect(css).toMatch(
			/\.reached\.svelte-\w+ a\.ref\s*\{[^}]*text-decoration:\s*underline/,
		);
		const { container } = render(Harness, {
			model: petstoreModel(),
			ref: PETSTORE_REFS.operation,
		});
		const inSentence = container.querySelectorAll("p.reached a.ref");
		expect(inSentence.length).toBeGreaterThan(0);
		// A delimited list is not a sentence: its links are not under `.reached`.
		const lists = container.querySelectorAll("p.refs a.ref");
		for (const a of lists) expect(a.closest(".reached")).toBeNull();
	});
});
