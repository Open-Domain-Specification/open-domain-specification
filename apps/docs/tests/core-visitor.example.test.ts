import {
	AbstractVisitor,
	type Domain,
	type Visitable,
	Workspace,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";

const workspace = new Workspace("Example Workspace", {
	odsVersion: "0.0.0",
	homepage: "https://example.com",
	logoUrl: "https://example.com/logo.png",
	primaryColor: "#123456",
	description: "An example workspace for demonstrating the visitor pattern.",
	version: "1.0.0",
});

workspace.addDomain("Example Domain A", {
	description: "An example domain for testing.",
	type: "core",
});

workspace.addDomain("Example Domain B", {
	description: "Another example domain for testing.",
	type: "core",
});

class SimpleVisitor extends AbstractVisitor {
	visits = 0;

	constructor() {
		// This causes the visitor to follow consumptions and relations meaning
		// it will potentially visit multiple domains not part of the entrypoint tree
		super({
			followConsumptions: true,
			followRelations: true,
		});
	}

	visitDomain(node: Domain) {
		this.visits++;
		super.visitDomain(node);
	}

	protected before(node: Visitable) {
		console.log("Visiting:", node);
		super.before(node);
	}

	protected after(node: Visitable) {
		console.log("Finished visiting:", node);
		super.after(node);
	}
}

describe("Visitor Example", () => {
	it("should visit the domains twice", () => {
		const visitor = new SimpleVisitor();
		visitor.visitWorkspace(workspace);
		expect(visitor.visits).toBe(2);
	});
});
