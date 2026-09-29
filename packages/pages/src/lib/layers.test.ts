import type { ContextRelationship } from "@open-domain-specification/core";
import { describe, expect, it, vi } from "vitest";
import { createDisclosure } from "./flow/disclosure.svelte";
import { createFullscreen } from "./flow/fullscreen.svelte";
import { openLayer } from "./layers";
import { createHover } from "./molecules/hover.svelte";

const press = (key: string) => {
	const event = new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
	});
	document.body.dispatchEvent(event);
	return event;
};

describe("openLayer", () => {
	it("closes only the top layer on Escape, and takes the key so nothing else on the page sees it", () => {
		const below = { dismiss: vi.fn() };
		const top = { dismiss: vi.fn() };
		const elsewhere = vi.fn();
		document.addEventListener("keydown", elsewhere);
		const releaseBelow = openLayer(below);
		const releaseTop = openLayer(top);
		press("Escape");
		expect(top.dismiss).toHaveBeenCalledTimes(1);
		expect(below.dismiss).not.toHaveBeenCalled();
		expect(elsewhere).not.toHaveBeenCalled();
		// A layer closes itself by releasing; the next Escape reaches the one under it.
		releaseTop();
		press("Escape");
		expect(below.dismiss).toHaveBeenCalledTimes(1);
		releaseBelow();
		document.removeEventListener("keydown", elsewhere);
	});

	it("ignores every other key", () => {
		const layer = { dismiss: vi.fn() };
		const release = openLayer(layer);
		const event = press("Enter");
		expect(layer.dismiss).not.toHaveBeenCalled();
		expect(event.cancelBubble).toBe(false);
		release();
	});

	it("listens only while a layer is up, and lets go of a layer from anywhere in the stack, once", () => {
		const add = vi.spyOn(window, "addEventListener");
		const remove = vi.spyOn(window, "removeEventListener");
		const [a, b] = [{ dismiss: vi.fn() }, { dismiss: vi.fn() }];
		expect(add).not.toHaveBeenCalled();
		const releaseA = openLayer(a);
		const releaseB = openLayer(b);
		expect(add).toHaveBeenCalledTimes(1);
		// The lower one goes first: the top is still the top.
		releaseA();
		releaseA();
		expect(remove).not.toHaveBeenCalled();
		press("Escape");
		expect(b.dismiss).toHaveBeenCalledTimes(1);
		expect(a.dismiss).not.toHaveBeenCalled();
		releaseB();
		expect(remove).toHaveBeenCalledTimes(1);
		// With none up, Escape is nobody's.
		const spent = press("Escape");
		expect(spent.cancelBubble).toBe(false);
	});
});

describe("Escape through a whole page's layers", () => {
	const relationship = { ref: "#/relationships/r" } as ContextRelationship;

	it("closes the pattern explanation, then the evidence card, then the fullscreen, one layer a key", () => {
		const badge = document.createElement("button");
		document.body.append(badge);
		const fullscreen = createFullscreen();
		fullscreen.toggle(() => {});
		const disclosure = createDisclosure();
		disclosure.show(relationship, { x: 0, y: 0 }, badge);
		const hover = createHover(() => undefined);
		hover.focus();
		expect(hover.open).toBe(true);

		press("Escape");
		expect(hover.open).toBe(false);
		expect(disclosure.open).toBeDefined();
		expect(fullscreen.active).toBe(true);

		press("Escape");
		expect(disclosure.open).toBeUndefined();
		expect(document.activeElement).toBe(badge);
		expect(fullscreen.active).toBe(true);

		press("Escape");
		expect(fullscreen.active).toBe(false);
		badge.remove();
	});

	it("still closes a card opened before a keyword when the keyword's explanation is not open", () => {
		const disclosure = createDisclosure();
		disclosure.show(relationship, { x: 0, y: 0 });
		const hover = createHover(() => undefined);
		hover.stop();
		press("Escape");
		expect(disclosure.open).toBeUndefined();
	});
});
