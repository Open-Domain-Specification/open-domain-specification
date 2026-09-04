import {
	type Comment,
	type Evidenced,
	PATTERNS,
} from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
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
		unmount();
		expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function), true);
	});
});
