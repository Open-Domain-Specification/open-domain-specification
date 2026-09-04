import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { watchForProblems } from "./helpers";

/**
 * Every evidence design surface actually renders in the built Storybook.
 *
 * A green `build-storybook` only proves the bundle compiled; it says nothing
 * about whether a story draws anything. These designs exist to be looked at,
 * so the suite opens each one's iframe from `storybook-static` and asserts
 * that nothing threw and that something was painted.
 *
 * Skips cleanly when `storybook-static` is absent, so `npm run test:e2e`
 * without a Storybook build still runs the rest of the suite.
 */
const STORYBOOK_DIR = join(__dirname, "../storybook-static");
const INDEX = join(STORYBOOK_DIR, "index.json");
const BASE = "http://localhost:4176";

/**
 * Stories that are correct to paint nothing: an explicit allow-list, not a
 * guess from the assertion. Anything else with an empty root is a bug.
 */
const RENDERS_NOTHING = new Set(["atoms-markdown--empty"]);

type Entry = { id: string; title: string; name: string; type: string };

function allStories(): Entry[] {
	if (!existsSync(INDEX)) return [];
	const index = JSON.parse(readFileSync(INDEX, "utf8")) as {
		entries: Record<string, Entry>;
	};
	return Object.values(index.entries).filter((e) => e.type === "story");
}

const stories = allStories();

test.describe("built Storybook renders every story", () => {
	test.skip(
		stories.length === 0,
		"no storybook-static build; run `npm run build-storybook` first",
	);

	test("the index lists at least one story", () => {
		expect(stories.length).toBeGreaterThan(0);
	});

	for (const story of stories) {
		test(`${story.title} — ${story.name}`, async ({ page }) => {
			const problems = watchForProblems(page);
			await page.goto(
				`${BASE}/iframe.html?viewMode=story&id=${encodeURIComponent(story.id)}`,
			);
			const root = page.locator("#storybook-root");
			await expect(root).toBeAttached();
			// Storybook paints its own error screen into the root, so an empty
			// root and a thrown story both have to be caught separately. Some
			// stories (diagrams, icons) paint only SVG with no text, so either
			// counts as rendered.
			const painted = async () => {
				const text = (await root.innerText()).trim().length;
				const svg = await root.locator("svg").count();
				return text + svg;
			};
			if (RENDERS_NOTHING.has(story.id)) {
				// Give the story a moment to (not) paint before asserting the
				// negative, so this isn't just checking before it had a chance to.
				await page.waitForTimeout(200);
				expect(
					await painted(),
					`story ${story.id} was expected to render nothing`,
				).toBe(0);
			} else {
				await expect
					.poll(painted, { message: "the story rendered nothing" })
					.toBeGreaterThan(0);
			}
			// Chromium asks every navigated page for a favicon; Storybook's
			// iframe has none, and that 404 is not the story's fault.
			const real = problems.filter((p) => !p.includes("favicon.ico"));
			expect(real, `story ${story.id} reported problems`).toEqual([]);
		});
	}
});
