import { render } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it } from "vitest";
import Joined from "./Joined.svelte";

describe("Joined", () => {
	it("wraps the items so the stylesheet can put a comma before each but the first", () => {
		const { container } = render(Joined, {
			children: createRawSnippet(() => ({
				render: () => "<span>Catalog</span>",
			})),
		});
		const joined = container.querySelector(".joined") as HTMLElement;
		// The separator is drawn by a ::before rule, so the markup carries no
		// comma of its own and a list of one reads as one name.
		expect(joined.textContent).toBe("Catalog");
		expect(joined.children).toHaveLength(1);
	});
});
