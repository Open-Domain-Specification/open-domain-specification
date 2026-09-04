import { describe, expect, it } from "vitest";
import { iconColor, kindIcon } from "./kinds";

describe("kinds", () => {
	it("colours a kind that VS Code draws as a coloured symbol with that symbol's token", () => {
		expect(iconColor("boundedcontext")).toBe(
			"var(--vscode-symbolIcon-classForeground, var(--vscode-icon-foreground))",
		);
		expect(iconColor("service")).toBe(
			"var(--vscode-symbolIcon-methodForeground, var(--vscode-icon-foreground))",
		);
	});

	it("leaves every other kind, and no kind at all, in the plain icon colour", () => {
		expect(iconColor("policy")).toBe("var(--vscode-icon-foreground)");
		expect(iconColor()).toBe("var(--vscode-icon-foreground)");
	});

	it("draws the shared codicon for a kind", () => {
		expect(kindIcon("event")).toBe("broadcast");
	});
});
