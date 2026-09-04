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
 * The designed surfaces: the evidence designs of card 19 and the v2 design
 * language primitives of card 28. The rest of the sidebar is other cards'
 * work.
 */
const DESIGNED_TITLES = [
	"Atoms/DispositionChip",
	"Organisms/StrategicPositionTable",
	"Organisms/RelationshipDetail",
	"Organisms/HealthReport",
	"Molecules/PatternHoverCard",
	"Evidence/",
	"V2/",
];

type Entry = { id: string; title: string; name: string; type: string };

function designedStories(): Entry[] {
	if (!existsSync(INDEX)) return [];
	const index = JSON.parse(readFileSync(INDEX, "utf8")) as {
		entries: Record<string, Entry>;
	};
	return Object.values(index.entries).filter(
		(e) =>
			e.type === "story" &&
			DESIGNED_TITLES.some((prefix) => e.title.startsWith(prefix)),
	);
}

const stories = designedStories();

test.describe("built Storybook renders every designed surface", () => {
	test.skip(
		stories.length === 0,
		"no storybook-static build; run `npm run build-storybook` first",
	);

	test("the index lists every designed surface", () => {
		const titles = new Set(stories.map((s) => s.title));
		for (const prefix of DESIGNED_TITLES)
			expect(
				[...titles].some((t) => t.startsWith(prefix)),
				`no story found under ${prefix}`,
			).toBe(true);
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
			// root and a thrown story both have to be caught separately.
			await expect
				.poll(async () => (await root.innerText()).trim().length, {
					message: "the story rendered nothing",
				})
				.toBeGreaterThan(0);
			// Chromium asks every navigated page for a favicon; Storybook's
			// iframe has none, and that 404 is not the story's fault.
			const real = problems.filter((p) => !p.includes("favicon.ico"));
			expect(real, `story ${story.id} reported problems`).toEqual([]);
		});
	}
});
