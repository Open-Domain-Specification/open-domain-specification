import { describe, expect, it } from "vitest";
import { MARGIN, placeHover } from "./hover-placement";

/** A word 22px tall, as a table row's keyword is. */
const word = (top: number, left: number, width = 26) => ({
	top,
	left,
	bottom: top + 22,
	right: left + width,
});

const VIEWPORT = { width: 1300, height: 900 };

describe("placeHover", () => {
	it("hangs the card under the word with its left edge on the word's", () => {
		expect(
			placeHover(word(100, 100), { width: 400, height: 200 }, VIEWPORT),
		).toEqual({ top: 122, left: 100 });
	});

	it("shifts left near the right edge rather than flipping, and never past the left margin", () => {
		// The ACL code on the Sales page at 1300px: the card ran 60px past the edge.
		expect(
			placeHover(word(373, 869), { width: 491, height: 206 }, VIEWPORT),
		).toEqual({ top: 395, left: VIEWPORT.width - MARGIN - 491 });
		expect(
			placeHover(word(100, 0), { width: 2000, height: 100 }, VIEWPORT),
		).toEqual({ top: 122, left: MARGIN });
	});

	it("opens above the word when there is no room below and more above", () => {
		const at = placeHover(
			word(773, 640),
			{ width: 400, height: 206 },
			VIEWPORT,
		);
		expect(at).toEqual({ top: 773 - 206, left: 640 });
	});

	it("takes the larger side and scrolls inside itself when neither side has room", () => {
		const short = { width: 1300, height: 600 };
		// More room above: the card ends at the word's top and starts at the margin.
		expect(
			placeHover(word(300, 100), { width: 400, height: 800 }, short),
		).toEqual({ top: MARGIN, left: 100, maxHeight: 300 - MARGIN });
		// More room below: it starts under the word and ends at the margin.
		expect(
			placeHover(word(100, 100), { width: 400, height: 800 }, short),
		).toEqual({ top: 122, left: 100, maxHeight: 600 - MARGIN - 122 });
	});

	it("gives no height at all in a viewport with no room, as a test DOM has", () => {
		expect(
			placeHover(word(0, 0), { width: 0, height: 0 }, { width: 0, height: 0 }),
		).toEqual({ top: 0, left: MARGIN });
	});
});
