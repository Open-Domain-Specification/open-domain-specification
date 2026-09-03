import {
	type Comment,
	type Evidenced,
	PATTERNS,
} from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Pair from "./PatternHoverCard.harness.svelte";
import PatternHoverCard from "./PatternHoverCard.svelte";

/**
 * The card is a disclosure with a delay, so every test drives the clock
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
	render(PatternHoverCard, { pattern: "anti-corruption-layer", ...props });

/** Hover the trigger and let the open delay elapse. */
async function hoverOpen(container: HTMLElement) {
	const term = container.querySelector(".pattern-term") as HTMLElement;
	await fireEvent.mouseEnter(term);
	expect(container.querySelector(".hover-card")).toBeNull();
	await vi.advanceTimersByTimeAsync(200);
	return term;
}

describe("PatternHoverCard", () => {
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
		expect(screen.getByText(ACL.name)).toBeInTheDocument();
		expect(screen.getByText(ACL.summary)).toBeInTheDocument();
		expect(screen.getByText(ACL.architecturalNature)).toBeInTheDocument();
		// Trade-offs belong to the docs site, not to a hover.
		expect(screen.queryByText(ACL.tradeOffs[0])).not.toBeInTheDocument();
		vi.useRealTimers();
	});

	it("spells the keyword out when the surface asks for it", () => {
		show({ pattern: "customer-supplier", label: "customer-supplier" });
		expect(
			screen.getByRole("button", { name: "customer-supplier" }),
		).toBeInTheDocument();
	});

	it("closes again when the pointer leaves, and cancels a pause it never finished", async () => {
		vi.useFakeTimers();
		const { container } = show();
		const term = await hoverOpen(container);
		await fireEvent.mouseLeave(term);
		expect(container.querySelector(".hover-card")).toBeNull();

		// A pointer that only crosses the chip opens nothing at all.
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
		const term = container.querySelector(".pattern-term") as HTMLElement;
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
			container.querySelector(".pattern-term") as HTMLElement,
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

	it("discloses the relationship's disposition and comments under the meaning", async () => {
		const { container } = show({
			intent: intent({ comments: COMMENTS, disposition: "refactor" }),
		});
		await fireEvent.focusIn(
			container.querySelector(".pattern-term") as HTMLElement,
		);
		expect(screen.getByText("refactor")).toHaveClass("warn");
		expect(
			screen.getByText("PetSummaryClient is the translator."),
		).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: /sales\/acl\/PetSummaryClient\.ts/ }),
		).toBeInTheDocument();
	});

	it("shows a disposition with no comments, and nothing at all when there is neither", async () => {
		const marked = show({ intent: intent({ disposition: "tolerated" }) });
		await fireEvent.focusIn(
			marked.container.querySelector(".pattern-term") as HTMLElement,
		);
		expect(marked.container.querySelector(".specifics")).not.toBeNull();
		expect(screen.getByText("tolerated")).toBeInTheDocument();
		expect(marked.container.querySelector(".comments")).toBeNull();
		marked.unmount();

		// By design and nothing written down: the keyword still teaches itself,
		// but there is nothing specific to disclose.
		const bare = show({ intent: intent() });
		await fireEvent.focusIn(
			bare.container.querySelector(".pattern-term") as HTMLElement,
		);
		expect(bare.container.querySelector(".hover-card")).not.toBeNull();
		expect(bare.container.querySelector(".specifics")).toBeNull();
		bare.unmount();

		// No intent at all, as a legend or a glossary would use it.
		const none = show();
		await fireEvent.focusIn(
			none.container.querySelector(".pattern-term") as HTMLElement,
		);
		expect(none.container.querySelector(".specifics")).toBeNull();
	});

	it("gives up its listeners when it is destroyed while open", async () => {
		const { container, unmount } = show();
		await fireEvent.focusIn(
			container.querySelector(".pattern-term") as HTMLElement,
		);
		const remove = vi.spyOn(document, "removeEventListener");
		unmount();
		expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function), true);
	});
});
