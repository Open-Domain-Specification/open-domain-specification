import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./BottomSheet.harness.svelte";

/** The trigger the harness draws, which owns `aria-expanded`/`aria-controls`. */
const trigger = () => screen.getByRole("button", { name: /^Evidence for/ });
const sheet = () => document.getElementById("sheet-demo");

describe("BottomSheet", () => {
	it("frames its content as the platform's panel does: a named header, a close button, and the page leaving room for it", () => {
		render(Demo);
		const panel = sheet() as HTMLElement;
		expect(panel).toHaveClass("bottom-sheet");
		// A labelled section is the landmark; no role attribute is needed.
		expect(panel.tagName).toBe("SECTION");
		expect(panel).toHaveAttribute("aria-labelledby", "sheet-demo-title");
		// The header names the view; the content names which relationship.
		expect(panel.querySelector("h2")).toHaveTextContent("Relationship");
		expect(panel.querySelector(".body h3")).toHaveTextContent(
			"Catalog BC → Sales BC",
		);
		expect(trigger()).toHaveAttribute("aria-controls", "sheet-demo");
		expect(trigger()).toHaveAttribute("aria-expanded", "true");
		// A fixed panel that hid the last rows would be worse than the row it replaced.
		expect(document.body).toHaveClass("ods-sheet-open");
	});

	it("draws nothing while it is closed, and gives the page its height back", () => {
		render(Demo, { open: false });
		expect(sheet()).toBeNull();
		expect(document.body).not.toHaveClass("ods-sheet-open");
		expect(trigger()).toHaveAttribute("aria-expanded", "false");
	});

	it("renames itself without closing, so one sheet can serve more than one view", async () => {
		const { rerender } = render(Demo);
		// The name changes under the same id, then the id under the same name:
		// each part of the header is its own update, and neither closes it.
		await rerender({ id: "sheet-demo", title: "Consumption" });
		expect(sheet()?.querySelector("h2")).toHaveTextContent("Consumption");

		await rerender({ id: "sheet-other", title: "Consumption" });
		const panel = document.getElementById("sheet-other") as HTMLElement;
		expect(panel.querySelector("h2")).toHaveTextContent("Consumption");
		expect(panel).toHaveAttribute("aria-labelledby", "sheet-other-title");
		expect(
			screen.getByRole("button", { name: "Close Consumption" }),
		).toBeInTheDocument();
	});

	it("closes on its close button and returns focus to whatever opened it", async () => {
		render(Demo, { open: false });
		const open = trigger();
		open.focus();
		await fireEvent.click(open);
		expect(sheet()).not.toBeNull();

		const close = screen.getByRole("button", { name: "Close Relationship" });
		close.focus();
		await fireEvent.click(close);

		expect(sheet()).toBeNull();
		expect(document.body).not.toHaveClass("ods-sheet-open");
		expect(document.activeElement).toBe(open);
	});

	it("closes on Escape from anywhere on the page, and ignores every other key", async () => {
		render(Demo);
		await fireEvent.keyDown(window, { key: "ArrowDown" });
		expect(sheet()).not.toBeNull();

		await fireEvent.keyDown(window, { key: "Escape" });
		expect(sheet()).toBeNull();
	});

	it("stops listening once it is gone, so a later Escape is nobody's business", async () => {
		const { unmount } = render(Demo);
		expect(document.body).toHaveClass("ods-sheet-open");
		unmount();
		expect(document.body).not.toHaveClass("ods-sheet-open");
		await fireEvent.keyDown(window, { key: "Escape" });
	});
});
