import { describe, expect, it, vi } from "vitest";
import { createFullscreen } from "./fullscreen.svelte";

/** The refit waits a tick and then a frame; give it both before reading back. */
const framed = () =>
	new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

const pressEscape = () =>
	window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

describe("createFullscreen", () => {
	it("starts closed and flips on each toggle", () => {
		const fullscreen = createFullscreen();
		expect(fullscreen.active).toBe(false);
		fullscreen.toggle(() => {});
		expect(fullscreen.active).toBe(true);
		fullscreen.toggle(() => {});
		expect(fullscreen.active).toBe(false);
		fullscreen.stop();
	});

	it("refits the canvas a frame after entering and after leaving, once the overlay has its size", async () => {
		const fit = vi.fn();
		const fullscreen = createFullscreen();
		fullscreen.toggle(fit);
		// Nothing yet: the element has not been laid out at its new size.
		expect(fit).not.toHaveBeenCalled();
		await framed();
		expect(fit).toHaveBeenCalledTimes(1);
		fullscreen.toggle(fit);
		await framed();
		expect(fit).toHaveBeenCalledTimes(2);
		fullscreen.stop();
	});

	it("leaves on Escape, and remembers the canvas to refit", async () => {
		const fit = vi.fn();
		const fullscreen = createFullscreen();
		fullscreen.toggle(fit);
		pressEscape();
		expect(fullscreen.active).toBe(false);
		await framed();
		expect(fit).toHaveBeenCalledTimes(2);
	});

	it("ignores other keys while open", () => {
		const fullscreen = createFullscreen();
		fullscreen.toggle(() => {});
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		expect(fullscreen.active).toBe(true);
		fullscreen.stop();
	});

	it("only listens for Escape while the overlay is up", () => {
		const add = vi.spyOn(window, "addEventListener");
		const remove = vi.spyOn(window, "removeEventListener");
		const fullscreen = createFullscreen();
		expect(add).not.toHaveBeenCalled();
		fullscreen.toggle(() => {});
		expect(add).toHaveBeenCalledTimes(1);
		fullscreen.exit();
		expect(remove).toHaveBeenCalledTimes(1);
		// Already closed: nothing more to unbind, and no second removal.
		fullscreen.exit();
		fullscreen.stop();
		expect(remove).toHaveBeenCalledTimes(1);
	});

	it("exits without a refit when it was never opened", async () => {
		const fit = vi.fn();
		const fullscreen = createFullscreen();
		fullscreen.exit();
		await framed();
		expect(fullscreen.active).toBe(false);
		expect(fit).not.toHaveBeenCalled();
	});
});
