import { describe, expect, it } from "vitest";
import type { WorkspaceSchema } from "./schema";
import { Workspace } from "./workspace";

describe("rejects-duplicate", () => {
	it.each([2, 3])(
		"reports each repeated schema declaration among %i copies",
		(copies) => {
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
				rejects: Array.from({ length: copies }, (_, index) => ({
					schema,
					many: index === 0,
					reasons: index === 0 ? ["late"] : ["other"],
				})),
			});
			const diagnostics = workspace
				.validate()
				.filter((d) => d.rule === "rejects-duplicate");

			expect(diagnostics).toHaveLength(copies - 1);
			expect(
				diagnostics.every(
					(d) => d.severity === "error" && d.ref === operation.ref,
				),
			).toBe(true);
			for (const [index, diagnostic] of diagnostics.entries())
				expect(diagnostic.message).toContain(`entries 1 and ${index + 2}`);
		},
	);

	it("preserves identical and conflicting authored entries in either order through JSON", () => {
		for (const conflicting of [false, true]) {
			for (const reverse of [false, true]) {
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
				const entries = [
					{ schema, many: false, reasons: ["late"] },
					{
						schema,
						many: conflicting,
						reasons: conflicting ? ["other"] : ["late"],
					},
				];
				service.provides("Charge", {
					description: "",
					type: "operation",
					rejects: reverse ? entries.reverse() : entries,
				});
				const authored = workspace.toSchema();
				const sourceDiagnostics = workspace
					.validate()
					.filter((d) => d.rule === "rejects-duplicate");
				const loaded = Workspace.fromSchema(structuredClone(authored));

				expect(sourceDiagnostics).toHaveLength(1);
				expect(
					loaded.validate().filter((d) => d.rule === "rejects-duplicate"),
				).toEqual(sourceDiagnostics);
				expect(loaded.toSchema()).toEqual(authored);
			}
		}
	});

	it.each([2, 3])(
		"reports each repeated nonempty reason among %i copies and preserves JSON",
		(copies) => {
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
			const named = service.provides("Named", {
				description: "",
				type: "operation",
				rejects: [
					{
						schema,
						reasons: [
							...Array.from({ length: copies }, () => "late"),
							"",
							"",
							"other",
						],
					},
				],
			});
			const authored = workspace.toSchema();
			const repeated = workspace
				.validate()
				.filter((d) => d.rule === "rejects-duplicate");
			const loaded = Workspace.fromSchema(structuredClone(authored));

			expect(repeated).toHaveLength(copies - 1);
			expect(repeated.every((d) => d.ref === named.ref)).toBe(true);
			for (const [index, diagnostic] of repeated.entries())
				expect(diagnostic.message).toContain(`reasons 1 and ${index + 2}`);
			expect(
				loaded.validate().filter((d) => d.rule === "rejects-duplicate"),
			).toEqual(repeated);
			expect(loaded.toSchema()).toEqual(authored);
			expect(
				named.answers.filter(
					(answer) => answer.schema === schema && answer.reason === undefined,
				),
			).toHaveLength(1);
		},
	);

	it("allows one empty reason and same-local-id schemas from distinct contexts", () => {
		const workspace = new Workspace("Contracts", {
			description: "",
			version: "test",
		});
		const local = workspace.addBoundedContext("Local", { description: "" });
		const foreign = workspace.addBoundedContext("Foreign", { description: "" });
		const own = local.addSchema("Declined", { id: "declined" });
		const theirs = foreign.addSchema("Declined", { id: "declined" });
		const service = local.addService("Gateway", {
			description: "",
			type: "application",
		});
		service.provides("Charge", {
			description: "",
			type: "operation",
			rejects: [{ schema: own, reasons: [""] }, { schema: theirs }],
		});
		expect(
			workspace.validate().filter((d) => d.rule === "rejects-duplicate"),
		).toEqual([]);
	});

	it.each([
		{ label: "string", reasons: "late", duplicateReasons: 0 },
		{ label: "number", reasons: 7, duplicateReasons: 0 },
		{ label: "object", reasons: { reason: "late" }, duplicateReasons: 0 },
		{
			label: "mixed array",
			reasons: ["late", 7, "late"],
			duplicateReasons: 1,
		},
	])(
		"validates duplicate schema declarations when reasons is a malformed $label",
		({ reasons, duplicateReasons }) => {
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
				rejects: [{ schema }, { schema }],
			});
			type RawRejectionWorkspace = {
				boundedcontexts: Record<
					string,
					{
						services: Record<
							string,
							{
								provides: Record<
									string,
									{ rejects: Array<{ reasons?: unknown }> }
								>;
							}
						>;
					}
				>;
			};
			const authored = structuredClone(
				workspace.toSchema(),
			) as unknown as RawRejectionWorkspace;
			authored.boundedcontexts.payments!.services.gateway!.provides.charge!
				.rejects[0]!.reasons = reasons;
			const loaded = Workspace.fromSchema(
				authored as unknown as WorkspaceSchema,
			);
			const diagnostics = loaded
				.validate()
				.filter((d) => d.rule === "rejects-duplicate");
			const loadedOperation = loaded.getConsumableByRefOrThrow(operation.ref);

			expect(diagnostics).toHaveLength(1 + duplicateReasons);
			expect(
				diagnostics.some((diagnostic) =>
					diagnostic.message.includes("entries 1 and 2"),
				),
			).toBe(true);
			expect(
				(loadedOperation.rejections[0] as unknown as { reasons: unknown })
					.reasons,
			).toEqual(reasons);
			if (duplicateReasons)
				expect(
					diagnostics.some((diagnostic) =>
						diagnostic.message.includes("reasons 1 and 3"),
					),
				).toBe(true);
		},
	);
});
