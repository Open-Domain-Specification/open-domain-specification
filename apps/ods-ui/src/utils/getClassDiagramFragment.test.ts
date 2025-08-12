import { describe, expect, it } from "vitest";
import {
	type ClassDiagramDefinition,
	getClassDiagramFragment,
} from "./getClassDiagramFragment.ts";

describe("getClassDiagramFragment", () => {
	const def: ClassDiagramDefinition = {
		id: "my-domain-service",
		name: "MyDomainService",
		prototype: "Service",
		attributes: [
			{
				name: "attribute1",
				type: "string",
			},
			{
				name: "attribute2",
				type: "number",
			},
		],
		methods: [
			{
				name: "getData",
				returnType: "string",
				parameters: [{ name: "param1", type: "string" }],
			},
		],
	};

	it("should return a class diagram fragment", () => {
		const fragment = getClassDiagramFragment(def);
		expect(fragment).toMatchInlineSnapshot(`
			"class my-domain-service["<b>MyDomainService</b><br/>«<small>Service</small>»"] {
				+attribute1: string
				+attribute2: number
				+getData(param1: string): string
			}"
		`);
	});
});
