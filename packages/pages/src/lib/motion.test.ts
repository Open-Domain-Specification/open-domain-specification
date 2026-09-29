import { describe, expect, it } from "vitest";
import {
	createReducedMotion,
	prefersReducedMotion,
	scrollBehavior,
} from "./motion.svelte";
import { stubReducedMotion } from "./xyflow-test-env";

describe("prefersReducedMotion", () => {
	it("asks the browser's reduced-motion query, each time it is asked", () => {
		const motion = stubReducedMotion(false);
		expect(prefersReducedMotion()).toBe(false);
		motion.set(true);
		expect(prefersReducedMotion()).toBe(true);
	});
});

describe("scrollBehavior", () => {
	it("scrolls smoothly unless the reader asked for less motion, and then jumps", () => {
		const motion = stubReducedMotion(false);
		expect(scrollBehavior()).toBe("smooth");
		motion.set(true);
		expect(scrollBehavior()).toBe("auto");
	});
});

describe("createReducedMotion", () => {
	it("starts from the setting, follows a change made while the page is open, and stops listening on teardown", () => {
		const motion = stubReducedMotion(false);
		const watched = createReducedMotion();
		expect(watched.reduced).toBe(false);
		expect(motion.listeners.size).toBe(1);
		motion.set(true);
		expect(watched.reduced).toBe(true);
		watched.stop();
		expect(motion.listeners.size).toBe(0);
		motion.set(false);
		expect(watched.reduced).toBe(true);
	});
});
