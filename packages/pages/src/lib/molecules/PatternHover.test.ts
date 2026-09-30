import {
	type Comment,
	type Evidenced,
	PATTERNS,
} from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import Pair from "./PatternHover.harness.svelte";
import PatternHover from "./PatternHover.svelte";

/**
 * The hover is a disclosure with a delay, so every test drives the clock
 * rather than waiting: what matters is that the pause exists and that the
 * card opens and closes for the four ways a reader reaches it.
 */

const ACL = PATTERNS["anti-corruption-layer"];

const COMMENTS: Comment[] = [
	{
		text: "PetSummaryClient is the translator.",
		link: {
			kind: "code",
			url: "https://example.com/PetSummaryClient.ts",
			label: "sales/acl/PetSummaryClient.ts",
		},
	},
];

const intent = (over: Partial<Evidenced> = {}): Evidenced => ({
	comments: [],
	...over,
});

const show = (props: Record<string, unknown> = {}) =>
	render(PatternHover, { pattern: "anti-corruption-layer", ...props });

/** Hover the trigger and let the open delay elapse. */
async function hoverOpen(container: HTMLElement) {
	const term = container.querySelector(".pattern-hover") as HTMLElement;
	await fireEvent.mouseEnter(term);
	expect(container.querySelector(".hover-card")).toBeNull();
	await vi.advanceTimersByTimeAsync(200);
	return term;
}

describe("PatternHover", () => {
	it("shows the abbreviation until the pointer rests on it, then what the keyword means", async () => {
		vi.useFakeTimers();
		const { container } = show();
		expect(screen.getByRole("button", { name: "ACL" })).toHaveAttribute(
			"aria-expanded",
			"false",
		);

		await hoverOpen(container);

		expect(screen.getByRole("button", { name: "ACL" })).toHaveAttribute(
			"aria-expanded",
			"true",
		);
		// The frame's heading names the pattern; the body teaches it.
		expect(container.querySelector(".hover-card .heading")).toHaveTextContent(
			`${ACL.name} (${ACL.abbreviation})`,
		);
		expect(screen.getByText(ACL.summary)).toBeInTheDocument();
		expect(screen.getByText(ACL.architecturalNature)).toBeInTheDocument();
		// Trade-offs belong to the docs site, not to a hover.
		expect(screen.queryByText(ACL.tradeOffs[0])).not.toBeInTheDocument();
		vi.useRealTimers();
	});

	it("spells the keyword out when the surface asks for it, and sets a role code in the editor font", () => {
		const { container } = show({
			pattern: "customer-supplier",
			label: "customer-supplier",
		});
		expect(
			screen.getByRole("button", { name: "customer-supplier" }),
		).toBeInTheDocument();
		expect(container.querySelector(".keyword")).not.toHaveClass("mono");

		const role = show({ mono: true });
		expect(role.container.querySelector(".keyword")).toHaveClass("mono");
	});

	it("closes again when the pointer leaves, and cancels a pause it never finished", async () => {
		vi.useFakeTimers();
		const { container } = show();
		const term = await hoverOpen(container);
		await fireEvent.mouseLeave(term);
		expect(container.querySelector(".hover-card")).toBeNull();

		// A pointer that only crosses the keyword opens nothing at all.
		await fireEvent.mouseEnter(term);
		await fireEvent.mouseLeave(term);
		await vi.advanceTimersByTimeAsync(200);
		expect(container.querySelector(".hover-card")).toBeNull();

		// Re-entering a card that is already open starts no second pause.
		await hoverOpen(container);
		await fireEvent.mouseEnter(term);
		expect(container.querySelector(".hover-card")).not.toBeNull();
		vi.useRealTimers();
	});

	it("opens at once for the keyboard, with no pause to wait through", async () => {
		const { container } = show();
		const term = container.querySelector(".pattern-hover") as HTMLElement;
		await fireEvent.focusIn(term);
		expect(container.querySelector(".hover-card")).not.toBeNull();
		// Focus moving between the trigger and its own card changes nothing.
		await fireEvent.focusIn(term);
		expect(container.querySelectorAll(".hover-card")).toHaveLength(1);
	});

	it("pins on a click, so the pointer can leave, and unpins on a second click", async () => {
		const { container } = show();
		const button = screen.getByRole("button", { name: "ACL" });
		await fireEvent.click(button);
		await fireEvent.mouseLeave(
			container.querySelector(".pattern-hover") as HTMLElement,
		);
		expect(container.querySelector(".hover-card")).not.toBeNull();

		await fireEvent.click(button);
		expect(container.querySelector(".hover-card")).toBeNull();
	});

	it("closes on Escape and on a click outside, but not on a click inside", async () => {
		const { container } = show({ intent: intent({ comments: COMMENTS }) });
		await fireEvent.click(screen.getByRole("button", { name: "ACL" }));

		await fireEvent.pointerDown(
			container.querySelector(".hover-card") as HTMLElement,
		);
		expect(container.querySelector(".hover-card")).not.toBeNull();

		await fireEvent.pointerDown(document.body);
		expect(container.querySelector(".hover-card")).toBeNull();

		await fireEvent.click(screen.getByRole("button", { name: "ACL" }));
		await fireEvent.keyDown(document, { key: "Escape" });
		expect(container.querySelector(".hover-card")).toBeNull();
		// Any other key leaves it alone.
		await fireEvent.click(screen.getByRole("button", { name: "ACL" }));
		await fireEvent.keyDown(document, { key: "Enter" });
		expect(container.querySelector(".hover-card")).not.toBeNull();
	});

	it("leaves only one card open across the whole page", async () => {
		const { container } = render(Pair);
		const [first, second] = [
			...container.querySelectorAll("button"),
		] as HTMLElement[];
		await fireEvent.click(first);
		expect(container.querySelectorAll(".hover-card")).toHaveLength(1);
		await fireEvent.click(second);
		expect(container.querySelectorAll(".hover-card")).toHaveLength(1);
		expect(first).toHaveAttribute("aria-expanded", "false");
	});

	it("discloses the relationship's disposition and comments under the meaning, split by the frame's rule", async () => {
		const { container } = show({
			intent: intent({ comments: COMMENTS, disposition: "refactor" }),
		});
		await fireEvent.focusIn(
			container.querySelector(".pattern-hover") as HTMLElement,
		);
		// The rule is what separates what the keyword means from what this one
		// relationship says about it; part 1 alone draws none.
		expect(container.querySelector(".hover-card hr")).toBeInTheDocument();
		expect(
			container.querySelector(".disposition.refactor"),
		).toBeInTheDocument();
		expect(
			screen.getByText("PetSummaryClient is the translator.", { exact: false }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /sales\/acl\/PetSummaryClient\.ts/ }),
		).toBeInTheDocument();
	});

	it("shows a disposition with no comments, and nothing at all when there is neither", async () => {
		const marked = show({ intent: intent({ disposition: "tolerated" }) });
		await fireEvent.focusIn(
			marked.container.querySelector(".pattern-hover") as HTMLElement,
		);
		expect(
			marked.container.querySelector(".disposition.tolerated"),
		).toBeInTheDocument();
		// No comments means no list and no empty state: the hover says only what
		// it has.
		expect(marked.container.querySelector(".comments")).toBeNull();
		expect(marked.container.querySelector(".empty")).toBeNull();
		marked.unmount();

		// By design and nothing written down: the keyword still teaches itself,
		// but there is nothing specific to disclose.
		const bare = show({ intent: intent() });
		await fireEvent.focusIn(
			bare.container.querySelector(".pattern-hover") as HTMLElement,
		);
		expect(bare.container.querySelector(".hover-card")).not.toBeNull();
		expect(bare.container.querySelector("hr")).toBeNull();
		bare.unmount();

		// No intent at all, as a legend or a glossary would use it.
		const none = show();
		await fireEvent.focusIn(
			none.container.querySelector(".pattern-hover") as HTMLElement,
		);
		expect(none.container.querySelector("hr")).toBeNull();
	});

	it("closes when the page scrolls or the window resizes, but not when the card itself scrolls", async () => {
		const { container } = show({ intent: intent({ comments: COMMENTS }) });
		const button = screen.getByRole("button", { name: "ACL" });
		await fireEvent.click(button);
		// A card given less room than it needs scrolls inside itself; that is
		// the reader using it, not leaving it.
		await fireEvent.scroll(container.querySelector(".layer") as HTMLElement);
		expect(container.querySelector(".hover-card")).not.toBeNull();

		await fireEvent.scroll(document);
		expect(container.querySelector(".hover-card")).toBeNull();

		await fireEvent.click(button);
		await fireEvent(window, new Event("resize"));
		expect(container.querySelector(".hover-card")).toBeNull();
	});

	it("keeps an explanation the keyboard opened when focus scrolls a container to reveal the keyword, and places it again where the keyword now is", async () => {
		Object.defineProperty(document.documentElement, "clientWidth", {
			get: () => 2000,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			get: () => 1000,
			configurable: true,
		});
		let left = 415;
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				const word = this.classList.contains("trigger");
				return {
					top: 100,
					left: word ? left : 0,
					bottom: 122,
					right: word ? left + 30 : 0,
					width: word ? 30 : 400,
					height: word ? 22 : 200,
				} as DOMRect;
			},
		);
		const { container } = show();
		const term = container.querySelector(".pattern-hover") as HTMLElement;
		const button = screen.getByRole("button", { name: "ACL" });
		button.focus();
		await fireEvent.focusIn(term);
		const layer = () => container.querySelector(".layer") as HTMLElement;
		const first = layer().style.left;
		// The browser scrolled the container after the card opened, and reports it
		// a frame later: the keyword is somewhere else and nothing was left.
		left = 590;
		await fireEvent.scroll(container);
		await tick();
		expect(container.querySelector(".hover-card")).not.toBeNull();
		expect(layer().style.left).not.toBe(first);
		// With focus elsewhere, the same scroll is the reader leaving.
		button.blur();
		await fireEvent.scroll(container);
		expect(container.querySelector(".hover-card")).toBeNull();
	});

	it("does not place the explanation again when its own content scrolls, focus being in it", async () => {
		const { container } = show({ intent: intent({ comments: COMMENTS }) });
		const term = container.querySelector(".pattern-hover") as HTMLElement;
		screen.getByRole("button", { name: "ACL" }).focus();
		await fireEvent.focusIn(term);
		const layer = container.querySelector(".layer") as HTMLElement;
		// A placement clears and reassigns the offsets, so a mark left in one is
		// gone if the explanation was placed again.
		layer.style.top = "77px";
		// Focus moves to the citation in it, and the browser scrolls it into view.
		const link = layer.querySelector("a") as HTMLElement;
		link.focus();
		await fireEvent.scroll(layer);
		await fireEvent.scroll(link);
		await tick();
		expect(layer.style.top).toBe("77px");
		expect(container.querySelector(".hover-card")).not.toBeNull();

		// A scroll that is not in it is the keyword moving, and places it again.
		await fireEvent.scroll(container);
		await tick();
		expect(layer.style.top).not.toBe("77px");
	});

	it("keeps the reader's place in a scrolled explanation when the keyword moves and it is placed again", async () => {
		const { container } = show({ intent: intent({ comments: COMMENTS }) });
		const term = container.querySelector(".pattern-hover") as HTMLElement;
		screen.getByRole("button", { name: "ACL" }).focus();
		await fireEvent.focusIn(term);
		const layer = container.querySelector(".layer") as HTMLElement;
		// jsdom does not scroll: stand in for a box that is scrolled 90px down,
		// and record what placing it again puts back.
		const writes: number[] = [];
		let top = 90;
		Object.defineProperty(layer, "scrollTop", {
			get: () => top,
			set: (value: number) => {
				writes.push(value);
				top = value;
			},
			configurable: true,
		});
		await fireEvent.scroll(container);
		await tick();
		expect(writes).toEqual([90]);
		expect(layer.scrollTop).toBe(90);
	});

	it("gives the same cap every time it places a card taller than the room: repeated, and moved by a scroll", async () => {
		// An 800x400 viewport and a keyword at top 200, bottom 220, over content
		// that is naturally 500px tall.
		Object.defineProperty(document.documentElement, "clientWidth", {
			get: () => 800,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			get: () => 400,
			configurable: true,
		});
		const NATURAL = 500;
		let word = { top: 200, bottom: 220 };
		// The layer is as tall as its content, or as its inline cap if it has one:
		// what the browser does for a box with `overflow-y: auto`.
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				if (this.classList.contains("trigger"))
					return {
						...word,
						left: 100,
						right: 130,
						width: 30,
						height: 20,
					} as DOMRect;
				const cap = Number.parseFloat(this.style.maxHeight);
				const height = Number.isNaN(cap) ? NATURAL : Math.min(NATURAL, cap);
				const top = Number.parseFloat(this.style.top) || 0;
				return {
					top,
					bottom: top + height,
					left: 0,
					right: 400,
					width: 400,
					height,
				} as DOMRect;
			},
		);
		const { container } = show();
		const term = container.querySelector(".pattern-hover") as HTMLElement;
		const button = screen.getByRole("button", { name: "ACL" });
		button.focus();
		await fireEvent.focusIn(term);
		const layer = () => container.querySelector(".layer") as HTMLElement;
		/** What the layer is on screen: its box, and whether it is inside the viewport. */
		const placed = () => {
			const box = layer().getBoundingClientRect();
			return {
				top: box.top,
				height: box.height,
				bottom: box.bottom,
				cap: layer().style.maxHeight,
			};
		};

		// Above the word: 192px of room (200 - 8), so the card is capped to it.
		const first = placed();
		expect(first).toEqual({ top: 8, height: 192, bottom: 200, cap: "192px" });

		// The same anchor, placed again by scrolls the keyboard caused: identical.
		for (let i = 0; i < 3; i += 1) {
			await fireEvent.scroll(container);
			await tick();
			expect(placed()).toEqual(first);
			expect(placed().bottom).toBeLessThanOrEqual(400 - 8);
		}

		// A scroll that moved the keyword: 252px of room now, capped to that and
		// still inside the viewport.
		word = { top: 260, bottom: 280 };
		await fireEvent.scroll(container);
		await tick();
		expect(placed()).toEqual({
			top: 8,
			height: 252,
			bottom: 260,
			cap: "252px",
		});

		// And back: the cap comes back down with it, not left at the larger one.
		word = { top: 200, bottom: 220 };
		await fireEvent.scroll(container);
		await tick();
		expect(placed()).toEqual(first);
	});

	it("keeps an explanation the keyboard opened when the pointer crosses the keyword and leaves, and closes it once focus is elsewhere", async () => {
		const { container } = show();
		const term = container.querySelector(".pattern-hover") as HTMLElement;
		const button = screen.getByRole("button", { name: "ACL" });
		button.focus();
		await fireEvent.focusIn(term);
		await fireEvent.mouseEnter(term);
		await fireEvent.mouseLeave(term);
		expect(container.querySelector(".hover-card")).not.toBeNull();

		button.blur();
		await fireEvent.mouseLeave(term);
		expect(container.querySelector(".hover-card")).toBeNull();
	});

	it("places the card against the word, inside the viewport, and caps it to the room it has", async () => {
		const viewport = { width: 1000, height: 800 };
		Object.defineProperty(document.documentElement, "clientWidth", {
			get: () => viewport.width,
			configurable: true,
		});
		Object.defineProperty(document.documentElement, "clientHeight", {
			get: () => viewport.height,
			configurable: true,
		});
		const rect = vi
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				const word = this.classList.contains("trigger");
				return {
					top: 100,
					left: word ? 900 : 0,
					bottom: 122,
					right: word ? 930 : 0,
					width: word ? 30 : 400,
					height: word ? 22 : 200,
				} as DOMRect;
			});
		const { container } = show();
		const term = container.querySelector(".pattern-hover") as HTMLElement;

		await fireEvent.focusIn(term);
		const layer = container.querySelector(".layer") as HTMLElement;
		// Under the word, shifted left so it ends 8px inside the right edge.
		expect(layer.style.top).toBe("122px");
		expect(layer.style.left).toBe(`${1000 - 8 - 400}px`);
		expect(layer.style.maxHeight).toBe("");

		// A short viewport with more room below than above: the card keeps its
		// place under the word and takes only the room down to the margin.
		await fireEvent.keyDown(document, { key: "Escape" });
		viewport.height = 300;
		await fireEvent.focusIn(term);
		const capped = container.querySelector(".layer") as HTMLElement;
		expect(capped.style.top).toBe("122px");
		expect(capped.style.maxHeight).toBe(`${300 - 8 - 122}px`);
		rect.mockRestore();
	});

	it("gives up its listeners when it is destroyed while open", async () => {
		const { container, unmount } = show();
		await fireEvent.focusIn(
			container.querySelector(".pattern-hover") as HTMLElement,
		);
		const remove = vi.spyOn(document, "removeEventListener");
		const removeFromWindow = vi.spyOn(window, "removeEventListener");
		unmount();
		expect(remove).toHaveBeenCalledWith(
			"pointerdown",
			expect.any(Function),
			true,
		);
		// And it is off the stack that Escape closes, so the key is nobody's now.
		expect(removeFromWindow).toHaveBeenCalledWith(
			"keydown",
			expect.any(Function),
			true,
		);
	});

	describe("in the top layer", () => {
		/** A browser with popovers: `showPopover` is recorded, and what the layer measured at that moment. */
		const withPopovers = (order: string[] = []) => {
			const shown: HTMLElement[] = [];
			const proto = HTMLElement.prototype as unknown as {
				showPopover?: () => void;
			};
			proto.showPopover = function (this: HTMLElement) {
				shown.push(this);
				order.push("shown");
			};
			return {
				shown,
				restore: () => {
					delete proto.showPopover;
				},
			};
		};

		it("is a manual popover shown when it opens and before it is placed, and stays the keyword's child with its tooltip and expanded state intact", async () => {
			const order: string[] = [];
			const popovers = withPopovers(order);
			const rect = vi
				.spyOn(HTMLElement.prototype, "getBoundingClientRect")
				.mockImplementation(function (this: HTMLElement) {
					if (this.classList.contains("layer")) order.push("measured");
					return {
						top: 0,
						bottom: 0,
						left: 0,
						right: 0,
						width: 0,
						height: 0,
					} as DOMRect;
				});
			const { container } = show();
			expect(container.querySelector(".layer")).toBeNull();
			await fireEvent.focusIn(
				container.querySelector(".pattern-hover") as HTMLElement,
			);
			const layer = container.querySelector(".layer") as HTMLElement;

			expect(popovers.shown).toEqual([layer]);
			// Shown first: a popover that is not open has no box to measure.
			expect(order[0]).toBe("shown");
			expect(order).toContain("measured");
			expect(layer).toHaveAttribute("popover", "manual");
			// Not moved: still inside the keyword, so Tab, the pointer and the
			// outside-click test all still treat it as part of the keyword.
			expect(layer.parentElement).toBe(
				container.querySelector(".pattern-hover"),
			);
			// (jsdom hides a `[popover]` that is not open, so the role is asked
			// for with `hidden`.)
			expect(screen.getByRole("tooltip", { hidden: true })).toBe(
				layer.querySelector(".hover-card"),
			);
			expect(
				screen.getByRole("button", { name: "ACL", hidden: true }),
			).toHaveAttribute("aria-expanded", "true");
			rect.mockRestore();
			popovers.restore();
		});

		it("is not shown again when a scroll places it again, and is gone from the document when it closes", async () => {
			const popovers = withPopovers();
			const { container } = show();
			const term = container.querySelector(".pattern-hover") as HTMLElement;
			screen.getByRole("button", { name: "ACL" }).focus();
			await fireEvent.focusIn(term);
			await fireEvent.scroll(container);
			await tick();
			expect(popovers.shown).toHaveLength(1);

			await fireEvent.keyDown(window, { key: "Escape" });
			expect(document.querySelector(".layer")).toBeNull();
			expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
			expect(screen.getByRole("button", { name: "ACL" })).toHaveAttribute(
				"aria-expanded",
				"false",
			);
			popovers.restore();
		});

		it("leaves nothing behind when it is destroyed while open", async () => {
			const popovers = withPopovers();
			const { container, unmount } = show();
			await fireEvent.focusIn(
				container.querySelector(".pattern-hover") as HTMLElement,
			);
			expect(document.querySelector(".layer")).not.toBeNull();
			unmount();
			expect(document.querySelector(".layer")).toBeNull();
			expect(document.querySelector('[role="tooltip"]')).toBeNull();
			popovers.restore();
		});

		it("still opens where the browser has no popover, placed as it always was", async () => {
			expect("showPopover" in HTMLElement.prototype).toBe(false);
			const { container } = show();
			await fireEvent.focusIn(
				container.querySelector(".pattern-hover") as HTMLElement,
			);
			const layer = container.querySelector(".layer") as HTMLElement;
			expect(layer.style.top).not.toBe("");
			expect(screen.getByRole("tooltip")).toBeInTheDocument();
		});
	});
});
