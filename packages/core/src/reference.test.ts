import { describe, expect, it } from "vitest";
import { ODSContextMap, type ODSContextMapNode } from "./context-map";
import { ODSFlowMap } from "./flow-map";
import {
	consumptionRef,
	decodeRefSegment,
	encodeRefSegment,
	parseConsumptionRef,
	parseRelationshipRef,
	relationshipRef,
} from "./reference";
import { Workspace } from "./workspace";

const roundTrip = (workspace: Workspace) =>
	Workspace.fromSchema(JSON.parse(JSON.stringify(workspace.toSchema())));

const owns = (record: object, key: PropertyKey) =>
	// biome-ignore lint/suspicious/noPrototypeBuiltins: core targets ES2016, before Object.hasOwn.
	Object.prototype.hasOwnProperty.call(record, key);

describe("reference segments", () => {
	it("round-trips the full admitted identity alphabet without normalization", () => {
		for (const raw of [
			"",
			"/",
			"~",
			"|",
			"%",
			"%2F",
			".",
			"..",
			"constructor",
			"__proto__",
			"with space",
			"é",
			"e\u0301",
			"猫/🐈~%",
			"\ud800",
			"\udfff",
		]) {
			const encoded = encodeRefSegment(raw);
			expect(decodeRefSegment(encoded)).toBe(raw);
		}
		expect(encodeRefSegment("/~")).toBe("~1~0");
	});

	it("rejects malformed escapes without rejecting raw string code units", () => {
		for (const segment of ["~", "~2", "a~xb", "a/b"])
			expect(decodeRefSegment(segment)).toBeUndefined();
		expect(decodeRefSegment(encodeRefSegment("\ud800"))).toBe("\ud800");
	});

	it("constructs and strictly parses derived refs", () => {
		const relationship = relationshipRef("a/b", "shared-kernel", "~", "%2F");
		expect(parseRelationshipRef(relationship)).toEqual({
			sourceId: "a/b",
			type: "shared-kernel",
			targetId: "~",
			nameId: "%2F",
		});
		const consumption = consumptionRef(
			"#/boundedcontexts/consumes/services/by",
			"#/boundedcontexts/consumes/aggregates/by/provides/consumes",
			"#/boundedcontexts/consumes/processes/by",
		);
		expect(parseConsumptionRef(consumption)).toEqual({
			consumerRef: "#/boundedcontexts/consumes/services/by",
			consumableRef:
				"#/boundedcontexts/consumes/aggregates/by/provides/consumes",
			callerRef: "#/boundedcontexts/consumes/processes/by",
		});
		for (const malformed of [
			"#/relationships/a/shared-kernel/b/",
			"#/relationships/a/shared-kernel/b/extra/tail",
			"#/relationships/~2/shared-kernel/b",
			"#/x/consumes/~2",
			"#/x/consumes/a/no/b",
		]) {
			expect(parseRelationshipRef(malformed)).toBeUndefined();
			expect(parseConsumptionRef(malformed)).toBeUndefined();
		}
	});
});

describe("model reference identity", () => {
	it("resolves only canonical attribute refs when owner IDs are ref keywords", () => {
		const workspace = new Workspace("Attributes", {
			description: "",
			version: "0",
		});
		const context = workspace.addBoundedContext("Context", {
			id: "attributes",
			description: "",
		});
		const aggregate = context.addAggregate("Aggregate", {
			id: "attributes",
			description: "",
		});
		const entity = aggregate.addEntity("Entity", {
			id: "attributes",
			description: "",
		});
		const entityAttribute = entity.addAttribute("Entity attribute", {
			id: "a/b",
			type: "string",
		});
		const value = context.addValueObject("Value", {
			id: "attributes",
			description: "",
		});
		const valueAttribute = value.addAttribute("Value attribute", {
			id: "",
			type: "string",
		});
		const schema = context.addSchema("Schema", { id: "attributes" });
		const schemaAttribute = schema.addAttribute("Schema attribute", {
			id: "~",
			type: "string",
		});
		const nonscalarAttribute = schema.addAttribute("Nonscalar attribute", {
			id: "\ud800",
			type: "string",
		});

		for (const model of [workspace, roundTrip(workspace)]) {
			for (const attribute of [
				entityAttribute,
				valueAttribute,
				schemaAttribute,
				nonscalarAttribute,
			]) {
				expect(model.getAttributeByRef(attribute.ref)?.ref).toBe(attribute.ref);
				expect(model.getByRef(attribute.ref)?.ref).toBe(attribute.ref);
			}
			for (const malformed of [
				"#/boundedcontexts",
				`${entity.ref}/attributes/a/b`,
				`${entity.ref}/attributes/~2`,
				`${entityAttribute.ref}/tail`,
			]) {
				expect(model.getAttributeByRef(malformed)).toBeUndefined();
				expect(model.getByRef(malformed)).toBeUndefined();
			}
		}
	});

	it.each([
		["a short nested attribute suffix", "/attributes/a".repeat(2)],
		["six thousand nested attribute suffixes", "/attributes/a".repeat(6000)],
	])("leaves %s unresolved without recursive lookup", (_name, suffix) => {
		const workspace = new Workspace("Malformed attribute ref", {
			description: "",
			version: "0",
		});
		const context = workspace.addBoundedContext("Context", {
			id: "c",
			description: "",
		});
		const schema = context.addSchema("Schema", { id: "s" });
		context.addTerm("Term", {
			id: "t",
			definition: "",
			embodiedBy: schema,
		});
		const malformedRef = `${schema.ref}${suffix}`;

		expect(workspace.getAttributeByRef(malformedRef)).toBeUndefined();
		expect(workspace.getByRef(malformedRef)).toBeUndefined();

		const written = workspace.toSchema();
		written.boundedcontexts.c.glossary!.t.embodiedBy = {
			$ref: malformedRef,
		};
		const loaded = Workspace.fromSchema(structuredClone(written));
		expect(loaded.getAttributeByRef(malformedRef)).toBeUndefined();
		expect(loaded.getByRef(malformedRef)).toBeUndefined();
		const unresolved = loaded
			.validate()
			.filter((diagnostic) => diagnostic.rule === "unresolved-ref");
		expect(unresolved).toHaveLength(1);
		expect(unresolved[0].message).toContain(malformedRef);
		expect(loaded.toSchema().boundedcontexts.c.glossary!.t.embodiedBy).toEqual({
			$ref: malformedRef,
		});
	});

	it("keeps compound map keys injective when parts contain old delimiters", () => {
		const node = (id: string): ODSContextMapNode => ({
			id,
			name: id,
			namespace: [],
		});
		const map = new ODSContextMap([], [], []);
		for (const [source, target] of [
			["a|b", "c"],
			["a", "b|c"],
		] as const)
			map.addEdge({
				source: node(source),
				target: node(target),
				type: "partnership",
				upstreamRoles: [],
				downstreamRoles: [],
				implied: false,
			});
		expect(map.edges.size).toBe(2);
	});

	it("keeps every ID-bearing namespace raw, injective and resolvable through JSON", () => {
		const workspace = new Workspace("Identity", {
			id: "%",
			description: "",
			version: "0",
		});
		const domain = workspace.addDomain("Domain", {
			id: "a/b",
			description: "",
		});
		const subdomain = domain.addSubdomain("Subdomain", {
			id: "~",
			description: "",
			type: "core",
		});
		const team = workspace.addTeam("Team", { id: "|", description: "" });
		const context = workspace
			.addBoundedContext("Context", { id: "", description: "" })
			.serves(subdomain)
			.ownedBy(team);
		const other = workspace.addBoundedContext("Other", {
			id: "猫/🐈~%",
			description: "",
		});
		const service = context.addService("Service", {
			id: "constructor",
			description: "",
			type: "application",
		});
		const aggregate = context.addAggregate("Aggregate", {
			id: "__proto__",
			description: "",
		});
		const entity = aggregate.addEntity("Entity", {
			id: "..",
			description: "",
		});
		const value = context.addValueObject("Value", {
			id: "%2F",
			description: "",
		});
		const attribute = entity.addAttribute("Attribute", {
			id: "e\u0301",
			type: "string",
		});
		const valueAttribute = value.addAttribute("Value attribute", {
			id: "constructor",
			type: "string",
		});
		const invariant = aggregate.addInvariant("Invariant", {
			id: ".",
			description: "",
		});
		invariant.constrains(entity);
		const schema = context.addSchema("Schema", { id: "%" });
		const schemaAttribute = schema.addAttribute("Schema attribute", {
			id: "__proto__",
			type: "string",
		});
		const contextInvariant = context.addInvariant("Context invariant", {
			id: "a/b",
			description: "",
		});
		const valueInvariant = value.addInvariant("Value invariant", {
			id: "~",
			description: "",
		});
		const operation = service.provides("Operation", {
			id: "rejects/returns~",
			description: "",
			type: "operation",
			returns: schema,
		});
		const policy = context.addPolicy("Policy", {
			id: "returns",
			description: "",
		});
		const process = context.addProcess("Process", {
			id: "completed",
			description: "",
		});
		const deadline = process.addDeadline("Deadline", {
			id: "",
			description: "",
			after: "later",
		});
		const term = context.addTerm("Term", {
			id: "with space",
			definition: "",
		});
		const relationship = workspace.addRelationship({
			type: "partnership",
			name: "A/B ~ %",
			participants: [context, other],
		});
		const consumption = aggregate.consumes(operation, { by: [operation] });

		const elements = [
			domain,
			subdomain,
			team,
			context,
			other,
			service,
			aggregate,
			entity,
			value,
			attribute,
			valueAttribute,
			schemaAttribute,
			invariant,
			contextInvariant,
			valueInvariant,
			schema,
			operation,
			policy,
			process,
			deadline,
			term,
		];
		for (const element of elements)
			expect(workspace.getByRef(element.ref)).toBe(element);
		expect(workspace.getDomainByRef(domain.ref)).toBe(domain);
		expect(workspace.getSubdomainByRef(subdomain.ref)).toBe(subdomain);
		expect(workspace.getTeamByRef(team.ref)).toBe(team);
		expect(workspace.getBoundedContextByRef(context.ref)).toBe(context);
		expect(workspace.getServiceByRef(service.ref)).toBe(service);
		expect(workspace.getAggregateByRef(aggregate.ref)).toBe(aggregate);
		expect(workspace.getEntityByRef(entity.ref)).toBe(entity);
		expect(workspace.getValueObjectByRef(value.ref)).toBe(value);
		expect(workspace.getAttributeByRef(attribute.ref)).toBe(attribute);
		expect(workspace.getInvariantByRef(valueInvariant.ref)).toBe(
			valueInvariant,
		);
		expect(workspace.getSchemaByRef(schema.ref)).toBe(schema);
		expect(workspace.getConsumableByRef(operation.ref)).toBe(operation);
		expect(workspace.getPolicyByRef(policy.ref)).toBe(policy);
		expect(workspace.getProcessByRef(process.ref)).toBe(process);
		expect(workspace.getDeadlineByRef(deadline.ref)).toBe(deadline);
		expect(workspace.getTermByRef(term.ref)).toBe(term);
		expect(workspace.findRelationship(relationship.ref)).toBe(relationship);
		expect(workspace.findConsumption(consumption.ref)).toBe(consumption);
		expect(new Set(elements.map((it) => it.ref)).size).toBe(elements.length);

		const schemaBefore = workspace.toSchema();
		expect(owns(schemaBefore.boundedcontexts, "")).toBe(true);
		expect(
			owns(schemaBefore.boundedcontexts[""].aggregates ?? {}, "__proto__"),
		).toBe(true);
		const rebuilt = roundTrip(workspace);
		expect(rebuilt.toSchema()).toEqual(schemaBefore);
		for (const element of elements)
			expect(rebuilt.getByRef(element.ref)?.ref).toBe(element.ref);
		expect(rebuilt.findRelationship(relationship.ref)?.ref).toBe(
			relationship.ref,
		);
		expect(rebuilt.findConsumption(consumption.ref)?.ref).toBe(consumption.ref);
	});

	it("separates the supplied operation/refusal collision before and after JSON", () => {
		const workspace = new Workspace("Collision", {
			description: "",
			version: "0",
		});
		const served = workspace
			.addDomain("D", { description: "" })
			.addSubdomain("S", { description: "", type: "core" });
		const context = workspace
			.addBoundedContext("B", {
				id: "b",
				description: "",
			})
			.serves(served);
		const schema = context.addSchema("Decline", { id: "decline" });
		const service = context.addService("H", {
			id: "h",
			description: "",
			type: "application",
		});
		const start = service.provides("Started", {
			description: "",
			type: "event",
			internal: true,
		});
		service
			.provides("Seed", {
				description: "",
				type: "operation",
				internal: true,
			})
			.raises(start);
		const completedA = service.provides("Completed A", {
			id: "a",
			description: "",
			type: "operation",
			internal: true,
			rejects: [{ schema, reasons: ["completed"] }],
		});
		const completedB = service.provides("Completed B", {
			id: "a/rejects/b/decline",
			description: "",
			type: "operation",
			internal: true,
		});
		const returnService = context.addService("K", {
			description: "",
			type: "application",
		});
		const returnedA = returnService.provides("Returned A", {
			id: "a",
			description: "",
			type: "operation",
			internal: true,
			rejects: [{ schema, reasons: ["returns"] }],
		});
		const returnedB = returnService.provides("Returned B", {
			id: "a/rejects/b/decline",
			description: "",
			type: "operation",
			internal: true,
			returns: schema,
		});
		const refusalCompleted = completedA.rejected(schema, "completed");
		const completion = completedB.completed();
		const refusalReturns = returnedA.rejected(schema, "returns");
		const returned = returnedB.returned();
		const process = context
			.addProcess("Run", { description: "" })
			.starts(start)
			.issues(completedA, completedB, returnedA, returnedB)
			.on(refusalCompleted, refusalReturns, returned)
			.ends(completion);
		expect(refusalCompleted.ref).not.toBe(completion.ref);
		expect(refusalReturns.ref).not.toBe(returned.ref);
		for (const model of [workspace, roundTrip(workspace)]) {
			expect(model.validate()).toEqual([]);
			expect(model.getAnswerByRef(refusalCompleted.ref)?.operation.id).toBe(
				"a",
			);
			expect(model.getAnswerByRef(completion.ref)?.ref).toBe(completion.ref);
			expect(model.getAnswerByRef(refusalReturns.ref)?.operation.id).toBe("a");
			expect(model.getAnswerByRef(returned.ref)?.ref).toBe(returned.ref);
			const answerEdges = [...ODSFlowMap.fromWorkspace(model).edges.values()]
				.filter((edge) => edge.target.id === process.ref && edge.answer)
				.map((edge) => [edge.answer?.ref, edge.kind])
				.sort();
			expect(answerEdges).toEqual(
				[
					[refusalCompleted.ref, undefined],
					[refusalReturns.ref, undefined],
					[returned.ref, undefined],
					[completion.ref, "ends"],
				].sort(),
			);
			expect(model.toSchema()).toEqual(workspace.toSchema());
		}
	});

	it("preserves unpaired UTF-16 identities through DSL and JSON", () => {
		const workspace = new Workspace("Strings", {
			id: "\ud800",
			description: "",
			version: "0",
		});
		const context = workspace.addBoundedContext("Context", {
			id: "\udfff",
			description: "",
		});
		const schema = context.addSchema("Failure", { id: "x\ud800y" });
		const service = context.addService("Service", {
			id: "\ud800\udfff",
			description: "",
			type: "application",
		});
		const operation = service.provides("Operation", {
			description: "",
			type: "operation",
			rejects: [{ schema, reasons: ["\udfff"] }],
		});
		const answer = operation.rejected(schema, "\udfff");
		const rebuilt = roundTrip(workspace);
		expect(rebuilt.toSchema()).toEqual(workspace.toSchema());
		expect(rebuilt.getByRef(context.ref)?.ref).toBe(context.ref);
		expect(rebuilt.getAnswerByRef(answer.ref)?.ref).toBe(answer.ref);
	});
});
