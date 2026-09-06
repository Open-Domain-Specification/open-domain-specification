import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Demo from "./Modal.harness.svelte";

/** The trigger the harness draws, which owns `aria-expanded`/`aria-controls`. */
const trigger = () => screen.getByRole("button", { name: /^Evidence for/ });
const modal = () => document.getElementById("modal-demo");
const closeButton = () =>
	screen.getByRole("button", { name: "Close Relationship" });

describe("Modal", () => {
	it("frames its content as the platform's dialog does: a named panel over a scrim", () => {
		render(Demo);
		const panel = modal() as HTMLElement;
		expect(panel).toHaveClass("modal");
		expect(panel).toHaveAttribute("role", "dialog");
		expect(panel).toHaveAttribute("aria-modal", "true");
		expect(panel).toHaveAttribute("aria-labelledby", "modal-demo-title");
		// The header names the dialog; the content names which relationship.
		expect(panel.querySelector("h2")).toHaveTextContent("Relationship");
		expect(panel.querySelector(".body h3")).toHaveTextContent(
			"Catalog BC → Sales BC",
		);
		// The page behind it is dimmed, which is what says it cannot be reached.
		expect(document.querySelector(".modal-layer .scrim")).toBeInTheDocument();
		expect(trigger()).toHaveAttribute("aria-controls", "modal-demo");
		expect(trigger()).toHaveAttribute("aria-expanded", "true");
	});

	it("draws nothing while it is closed", () => {
		render(Demo, { open: false });
		expect(modal()).toBeNull();
		expect(document.querySelector(".scrim")).toBeNull();
		expect(trigger()).toHaveAttribute("aria-expanded", "false");
	});

	it("renames itself without closing, so one modal can serve more than one view", async () => {
		const { rerender } = render(Demo);
		// The name changes under the same id, then the id under the same name:
		// each part of the header is its own update, and neither closes it.
		await rerender({ id: "modal-demo", title: "Consumption" });
		expect(modal()?.querySelector("h2")).toHaveTextContent("Consumption");

		await rerender({ id: "modal-other", title: "Consumption" });
		const panel = document.getElementById("modal-other") as HTMLElement;
		expect(panel.querySelector("h2")).toHaveTextContent("Consumption");
		expect(panel).toHaveAttribute("aria-labelledby", "modal-other-title");
		expect(
			screen.getByRole("button", { name: "Close Consumption" }),
		).toBeInTheDocument();
	});

	it("takes focus when it opens and hands it back to whatever opened it", async () => {
		render(Demo, { open: false });
		const open = trigger();
		open.focus();
		await fireEvent.click(open);

		// The panel itself, so a reader lands on the title rather than on "close".
		expect(document.activeElement).toBe(modal());

		await fireEvent.click(closeButton());

		expect(modal()).toBeNull();
		expect(document.activeElement).toBe(open);
	});

	it("closes on a click on the scrim", async () => {
		render(Demo);
		await fireEvent.click(document.querySelector(".scrim") as HTMLElement);
		expect(modal()).toBeNull();
	});

	it("closes on Escape from inside it, and ignores every other key", async () => {
		render(Demo);
		const panel = modal() as HTMLElement;
		await fireEvent.keyDown(panel, { key: "ArrowDown" });
		expect(modal()).not.toBeNull();

		await fireEvent.keyDown(panel, { key: "Escape" });
		expect(modal()).toBeNull();
	});

	it("keeps Tab inside the panel, in both directions", async () => {
		render(Demo);
		const panel = modal() as HTMLElement;
		const inside = [...panel.querySelectorAll<HTMLElement>("button, a[href]")];
		const first = inside[0];
		const last = inside[inside.length - 1];
		expect(first).not.toBe(last);

		// Shift+Tab from the panel, where focus starts, wraps to the last thing in it.
		await fireEvent.keyDown(panel, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(last);

		// Tab off the end comes back to the first.
		await fireEvent.keyDown(panel, { key: "Tab" });
		expect(document.activeElement).toBe(first);

		// Shift+Tab off the front goes to the last.
		await fireEvent.keyDown(panel, { key: "Tab", shiftKey: true });
		expect(document.activeElement).toBe(last);

		// In the middle it is the browser's business, not ours.
		inside[1].focus();
		const tab = new KeyboardEvent("keydown", {
			key: "Tab",
			bubbles: true,
			cancelable: true,
		});
		panel.dispatchEvent(tab);
		expect(tab.defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(inside[1]);
	});

	describe("locks the document behind it while open", () => {
		const locked = () =>
			document.documentElement.classList.contains("modal-open") &&
			document.documentElement.style.overflow === "hidden";

		it("is unlocked before the modal ever opens", () => {
			render(Demo, { open: false });
			expect(locked()).toBe(false);
		});

		it("locks on open and unlocks on the close button", async () => {
			render(Demo);
			expect(locked()).toBe(true);
			await fireEvent.click(closeButton());
			expect(locked()).toBe(false);
		});

		it("unlocks on Escape", async () => {
			render(Demo);
			expect(locked()).toBe(true);
			await fireEvent.keyDown(modal() as HTMLElement, { key: "Escape" });
			expect(locked()).toBe(false);
		});

		it("unlocks on a scrim click", async () => {
			render(Demo);
			expect(locked()).toBe(true);
			await fireEvent.click(document.querySelector(".scrim") as HTMLElement);
			expect(locked()).toBe(false);
		});
	});
});
