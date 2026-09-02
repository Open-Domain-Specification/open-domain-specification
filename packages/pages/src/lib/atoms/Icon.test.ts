import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Icon from "./Icon.svelte";

describe("Icon", () => {
	it("renders a codicon class from the given name", () => {
		const { container } = render(Icon, { name: "key" });
		expect(container.querySelector("i")).toHaveClass("codicon", "codicon-key");
	});

	it("updates the class when the name prop changes", async () => {
		const { container, rerender } = render(Icon, { name: "key" });
		await rerender({ name: "shield" });
		expect(container.querySelector("i")).toHaveClass("codicon-shield");
	});

	it("falls back to no suffix when the name is nullish", () => {
		const { container } = render(Icon, {
			name: undefined as unknown as string,
		});
		expect(container.querySelector("i")).toHaveClass("codicon");
		expect(container.querySelector("i")?.className.trim()).toBe(
			"codicon codicon-",
		);
	});
});
