import { describe, expect, it } from "vitest";
import { makeTestWs } from "./makeTestWs";
import { getWorkspaceFromSchema } from "./workspace-from-schema";

describe("workspaceFromSchema", () => {
	const test = makeTestWs();
	const schema = test.ws.toSchema();
	const workspace = getWorkspaceFromSchema(schema);

	it("should create a workspace from a schema", async () => {
		expect(workspace.toSchema()).toEqual(schema);
	});
});
