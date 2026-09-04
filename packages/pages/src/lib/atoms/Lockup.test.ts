import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Lockup from "./Lockup.svelte";

describe("Lockup", () => {
	it("draws the kind's codicon in its symbol colour and links the name when it has a ref", () => {
		const { container } = render(Lockup, {
			kind: "boundedcontext",
			name: "Catalog BC",
			ref: "#/boundedcontexts/catalog_bc",
		});
		const icon = container.querySelector(
			".codicon-symbol-class",
		) as HTMLElement;
		expect(icon.style.color).toContain("symbolIcon-classForeground");
		expect(screen.getByRole("link", { name: "Catalog BC" })).toHaveAttribute(
			"href",
			"#/boundedcontexts/catalog_bc",
		);
		expect(container.querySelector(".id")).toBeNull();
		expect(container.querySelector(".detail")).toBeNull();
		expect(container.querySelector(".lockup")).toHaveClass("row");
	});

	it("shows the name as plain text when there is nowhere to go, with id and detail after it", () => {
		const { container } = render(Lockup, {
			kind: "team",
			name: "Pet Shop Team",
			id: "pet_shop_team",
			detail: "Team",
			size: "title",
		});
		expect(container.querySelector("a")).toBeNull();
		expect(container.querySelector(".name")).toHaveTextContent("Pet Shop Team");
		expect(container.querySelector(".id")).toHaveTextContent("pet_shop_team");
		expect(container.querySelector(".detail")).toHaveTextContent("Team");
		expect(container.querySelector(".lockup")).toHaveClass("title");
	});

	it("draws a bare codicon for a kind it does not know", () => {
		const { container } = render(Lockup, {
			kind: "nothing" as unknown as "team",
			name: "?",
		});
		expect(container.querySelector("i")?.className.trim()).toContain(
			"codicon-undefined",
		);
	});
});
