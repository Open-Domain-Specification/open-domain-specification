import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { meaningful, paintedIn, watchForProblems } from "./helpers";

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
			// root and a thrown story both have to be caught separately. A flow
			// canvas carries the library's attribution and an SVG element even
			// when it drew nothing, so neither counts: a story painted something
			// only with readable text, an SVG shape with extent, or a flow node.
			// Some stories (diagrams, icons) paint only SVG with no text, which
			// the shape count covers.
			const painted = async () => meaningful(await paintedIn(root));
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

/**
 * The generic check above passes a story on any painted content, which is
 * enough to catch an empty root but not a canvas that holds a backdrop and no
 * geometry. The sketch backdrop's stories exist to show its curves, so they
 * are held to the geometry itself: the story's nodes are on the canvas and
 * the blob, boundary and domain-border paths carry a real `d` the browser
 * measures as having extent.
 */
const SKETCH_STORIES: {
	id: string;
	nodes: number;
	boundaries: boolean;
	domainBorders: boolean;
}[] = [
	{
		id: "flow-sketchbackdrop--two-regions-and-a-loose-node",
		nodes: 6,
		boundaries: true,
		domainBorders: false,
	},
	{
		id: "flow-sketchbackdrop--two-domains-with-subdomains",
		nodes: 8,
		boundaries: true,
		domainBorders: true,
	},
	{
		id: "flow-sketchbackdrop--tight-padding",
		nodes: 6,
		boundaries: true,
		domainBorders: false,
	},
	{
		id: "flow-sketchbackdrop--single-node",
		nodes: 1,
		boundaries: false,
		domainBorders: false,
	},
];

test.describe("the sketch backdrop stories draw their backdrop", () => {
	test.skip(
		stories.length === 0,
		"no storybook-static build; run `npm run build-storybook` first",
	);

	for (const s of SKETCH_STORIES) {
		test(s.id, async ({ page }) => {
			await page.goto(
				`${BASE}/iframe.html?viewMode=story&id=${encodeURIComponent(s.id)}`,
			);
			const root = page.locator("#storybook-root");
			await expect(
				root.locator(".svelte-flow__node"),
				"the story's nodes reach the canvas",
			).toHaveCount(s.nodes);
			const extent = (cls: string) =>
				root
					.locator(`.sketch-backdrop path.${cls}`)
					.evaluate((p: SVGGraphicsElement) => {
						const b = p.getBBox();
						return {
							d: (p.getAttribute("d") ?? "").length,
							width: b.width,
							height: b.height,
						};
					});
			const blob = await extent("blob");
			expect(blob.d, "the blob has a path").toBeGreaterThan(0);
			expect(blob.width, "the blob spans the nodes").toBeGreaterThan(50);
			expect(blob.height, "the blob spans the nodes").toBeGreaterThan(50);
			const boundaries = await extent("boundaries");
			if (s.boundaries) {
				expect(boundaries.d, "boundaries between regions").toBeGreaterThan(0);
				expect(boundaries.width + boundaries.height).toBeGreaterThan(50);
			}
			const borders = await extent("domain-borders");
			if (s.domainBorders) {
				expect(borders.d, "borders between domains").toBeGreaterThan(0);
				expect(borders.width + borders.height).toBeGreaterThan(50);
			}
		});
	}
});

/**
 * The predicate itself, against DOM that has the shape of a blank story: a
 * flow canvas holding only the library's attribution and SVG elements whose
 * paths are empty. This has to score zero or the check above is decoration.
 * Run against `setContent` so it needs no Storybook build and no blank story
 * has to ship in the catalogue.
 */
test.describe("the story check refuses a blank story", () => {
	const blank = `<div id="storybook-root">
		<div class="svelte-flow">
			<svg class="sketch-backdrop" width="1" height="1">
				<defs><clipPath id="c"><path d=""/></clipPath></defs>
				<path class="blob" d=""/>
				<path class="boundaries" d="  "/>
				<path class="domain-borders" d=""/>
				<rect width="0" height="0"/>
			</svg>
			<div class="svelte-flow__panel svelte-flow__attribution"><a href="https://svelteflow.dev">Svelte Flow</a></div>
		</div>
	</div>`;

	test("attribution and empty SVG elements score nothing", async ({ page }) => {
		await page.setContent(blank);
		const painted = await paintedIn(page.locator("#storybook-root"));
		expect(painted).toEqual({ text: 0, shapes: 0, nodes: 0 });
		expect(meaningful(painted)).toBe(0);
	});

	test("real geometry, a node or words each score", async ({ page }) => {
		await page.setContent(
			`<div id="a"><svg width="100" height="100"><path d="M0 0 L50 50"/></svg></div>
			 <div id="b"><div class="svelte-flow__node">x</div></div>
			 <div id="c"><p>words</p></div>`,
		);
		expect(meaningful(await paintedIn(page.locator("#a")))).toBe(1);
		expect(meaningful(await paintedIn(page.locator("#b")))).toBeGreaterThan(0);
		expect(meaningful(await paintedIn(page.locator("#c")))).toBe(5);
	});
});
