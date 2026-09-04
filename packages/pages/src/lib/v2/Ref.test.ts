import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Ref from "./Ref.svelte";

describe("Ref", () => {
	it("links a ref as the hash route and marks it for the host", () => {
		render(Ref, { ref: "#/boundedcontexts/sales_bc", label: "Sales BC" });
		const a = screen.getByRole("link", { name: "Sales BC" });
		expect(a).toHaveAttribute("href", "#/boundedcontexts/sales_bc");
		expect(a).toHaveAttribute("data-ref", "#/boundedcontexts/sales_bc");
		expect(a).not.toHaveAttribute("rel");
		expect(a.querySelector(".codicon")).toBeNull();
	});

	it("draws a kind icon in the kind's symbol colour before the label", () => {
		const { container } = render(Ref, {
			ref: "#/x",
			label: "Catalog BC",
			icon: "symbol-class",
			kind: "boundedcontext",
		});
		const icon = container.querySelector(
			".codicon-symbol-class",
		) as HTMLElement;
		expect(icon).toBeInTheDocument();
		expect(icon.style.color).toContain("symbolIcon-classForeground");
	});

	it("draws an icon in the plain icon colour when the link has no kind", () => {
		const { container } = render(Ref, { ref: "#/x", label: "x", icon: "code" });
		const icon = container.querySelector(".codicon-code") as HTMLElement;
		expect(icon.style.color).toBe("var(--vscode-icon-foreground)");
	});

	it("marks a link that leaves the model with rel and the external codicon", () => {
		const { container } = render(Ref, {
			ref: "https://example.com/adr/14",
			label: "ADR-014",
			external: true,
			title: "decision",
		});
		const a = screen.getByRole("link", { name: "ADR-014" });
		expect(a).toHaveAttribute("rel", "external noreferrer");
		expect(a).not.toHaveAttribute("data-ref");
		expect(a).toHaveAttribute("title", "decision");
		expect(
			container.querySelector(".codicon-link-external"),
		).toBeInTheDocument();
	});
});
