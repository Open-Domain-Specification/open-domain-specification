import { afterEach, describe, expect, it } from "vitest";
import { focusArrival } from "./focus";

afterEach(() => {
	document.body.innerHTML = "";
});

describe("focusArrival", () => {
	it("makes a plain element a programmatic target that is not a tab stop, and focuses it", () => {
		document.body.innerHTML = "<section>plain</section>";
		const el = document.querySelector("section") as HTMLElement;
		focusArrival(el);
		expect(el).toHaveAttribute("tabindex", "-1");
		expect(document.activeElement).toBe(el);
	});

	it("leaves a link, a button or an element that already has a tabindex as it was", () => {
		document.body.innerHTML =
			'<a href="#x">link</a><button>b</button><h2 tabindex="-1">h</h2>';
		for (const el of document.body.children) {
			const before = el.getAttribute("tabindex");
			focusArrival(el as HTMLElement);
			expect(el.getAttribute("tabindex")).toBe(before);
			expect(document.activeElement).toBe(el);
		}
	});

	it("passes its focus options on", () => {
		document.body.innerHTML = "<p>x</p>";
		const el = document.querySelector("p") as HTMLElement;
		let seen: FocusOptions | undefined;
		el.focus = (options) => {
			seen = options;
		};
		focusArrival(el, { preventScroll: true });
		expect(seen).toEqual({ preventScroll: true });
	});
});
