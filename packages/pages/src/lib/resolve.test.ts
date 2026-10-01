import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { pageRefs, resolvePage } from "./resolve";

describe("canonical page resolution", () => {
	it("resolves distinct encoded identities and keeps their canonical routes", () => {
		const ws = new Workspace("Pages", { description: "", version: "0" });
		const ids = [
			"a/b",
			"a~1b",
			"%2F",
			"returns",
			"",
			"é",
			".",
			"a\\b",
			"Case",
			"\ud800",
		];
		const domains = ids.map((id, index) =>
			ws.addDomain(`Domain ${index}`, { description: "", id }),
		);
		for (const domain of domains) {
			expect(resolvePage(ws, domain.ref)).toEqual({
				target: domain,
				pageRef: domain.ref,
			});
		}
		expect(new Set(pageRefs(ws)).size).toBe(ids.length + 2);
	});

	it("resolves a child anchor to its nearest page owner", () => {
		const ws = new Workspace("Pages", { description: "", version: "0" });
		const bc = ws.addBoundedContext("Context", {
			description: "",
			id: "a/b",
		});
		const service = bc.addService("Service", {
			description: "",
			type: "application",
			id: "returns",
		});
		const operation = service.provides("Operation", {
			description: "",
			type: "operation",
			id: "%2F",
		});
		expect(resolvePage(ws, `${operation.ref}/attributes/`)).toEqual({
			target: operation,
			pageRef: operation.ref,
		});
	});

	it("resolves the complete segmented identity of a named relationship", () => {
		const ws = new Workspace("Pages", { description: "", version: "0" });
		const slash = ws.addBoundedContext("Slash", {
			description: "",
			id: "a/b",
		});
		const literal = ws.addBoundedContext("Literal", {
			description: "",
			id: "a~1b",
		});
		const relationship = ws.addRelationship({
			type: "partnership",
			name: "Legacy Feed",
			participants: [slash, literal],
			description: "",
		});
		expect(resolvePage(ws, relationship.ref)).toEqual({
			target: relationship,
			pageRef: relationship.ref,
		});
	});
});
