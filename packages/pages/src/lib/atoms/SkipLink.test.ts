import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import SkipLink from "./SkipLink.svelte";

/** The page the link skips to: a `main` with its heading, after the link in the DOM. */
function page() {
	document.body.insertAdjacentHTML(
		"beforeend",
		"<main><h1>Customer</h1><a href='#/x'>first stop</a></main>",
	);
	return document.querySelector("main h1") as HTMLElement;
}

afterEach(() => {
	document.querySelector("main")?.remove();
	history.replaceState(null, "", "/");
});

describe("SkipLink", () => {
	it("is a link named for what it does, to the route being read", () => {
		render(SkipLink, { href: "#/boundedcontexts/sales_bc" });
		const link = screen.getByRole("link", { name: "Skip to content" });
		expect(link).toHaveAttribute("href", "#/boundedcontexts/sales_bc");
		// The router's click listener leaves an anchor with a target alone.
		expect(link).toHaveAttribute("target", "_self");
	});

	it("moves focus to the page heading without following the link or touching the hash", async () => {
		const heading = page();
		history.replaceState(null, "", "/#/boundedcontexts/sales_bc");
		const length = history.length;
		render(SkipLink, { href: "#/boundedcontexts/sales_bc" });
		const link = screen.getByRole("link", { name: "Skip to content" });
		link.focus();

		// `fireEvent` answers false when a listener prevented the default.
		expect(await fireEvent.click(link)).toBe(false);
		expect(document.activeElement).toBe(heading);
		expect(heading).toHaveAttribute("tabindex", "-1");
		expect(location.hash).toBe("#/boundedcontexts/sales_bc");
		expect(history.length).toBe(length);
	});

	it("does nothing further when the page has no heading yet", async () => {
		render(SkipLink, { href: "#" });
		const link = screen.getByRole("link", { name: "Skip to content" });
		link.focus();
		expect(await fireEvent.click(link)).toBe(false);
		expect(document.activeElement).toBe(link);
	});
});
