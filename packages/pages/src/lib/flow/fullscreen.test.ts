import { describe, expect, it, vi } from "vitest";
import { createFullscreen } from "./fullscreen.svelte";

const pressEscape = () =>
	window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));

describe("createFullscreen", () => {
	it("starts closed and flips on each toggle", () => {
		const fullscreen = createFullscreen();
		expect(fullscreen.active).toBe(false);
		fullscreen.toggle();
		expect(fullscreen.active).toBe(true);
		fullscreen.toggle();
		expect(fullscreen.active).toBe(false);
		fullscreen.stop();
	});

	it("leaves on Escape", () => {
		const fullscreen = createFullscreen();
		fullscreen.toggle();
		pressEscape();
		expect(fullscreen.active).toBe(false);
	});

	it("ignores other keys while open", () => {
		const fullscreen = createFullscreen();
		fullscreen.toggle();
		window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
		expect(fullscreen.active).toBe(true);
		fullscreen.stop();
	});

	it("only listens for Escape while the overlay is up", () => {
		const add = vi.spyOn(window, "addEventListener");
		const remove = vi.spyOn(window, "removeEventListener");
		const fullscreen = createFullscreen();
		expect(add).not.toHaveBeenCalled();
		fullscreen.toggle();
		expect(add).toHaveBeenCalledTimes(1);
		fullscreen.exit();
		expect(remove).toHaveBeenCalledTimes(1);
		// Already closed: nothing more to unbind, and no second removal.
		fullscreen.exit();
		fullscreen.stop();
		expect(remove).toHaveBeenCalledTimes(1);
	});

	it("stays closed when asked to leave without having opened", () => {
		const fullscreen = createFullscreen();
		fullscreen.exit();
		expect(fullscreen.active).toBe(false);
	});
});
