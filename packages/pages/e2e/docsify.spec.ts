import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";
import {
	DOCSIFY_DIR,
	DOCSIFY_ORIGIN,
	WORKSPACE_NAME,
	watchForProblems,
} from "./helpers";

/**
 * The other half of what the toolchain produces: `toDoc` writes a docsify
 * folder, and nothing else in the suite ever opens one in a browser. The site
 * is served as a plain folder of files -- no docsify-cli, no rewrites -- so
 * the shell `toDoc` emits has to stand on its own. Docsify itself comes from
 * the CDN, so this spec needs network, like the docs build does.
 */

test.use({ baseURL: DOCSIFY_ORIGIN });

test.skip(
	!existsSync(DOCSIFY_DIR),
	`no generated site at ${DOCSIFY_DIR}: run \`npm run build -w @open-domain-specification/model-petstore\` first`,
);

/** The distinct `/...md` targets the generated `_sidebar.md` links to. */
function sidebarTargets(): string[] {
	const sidebar = readFileSync(join(DOCSIFY_DIR, "_sidebar.md"), "utf8");
	// A link target can itself contain brackets -- `/swagger_petstore_(v3)/...`
	// -- so anchor on the end of the line rather than the first `)`.
	return Array.from(
		new Set(Array.from(sidebar.matchAll(/\]\((\/.+)\)\s*$/gm), (m) => m[1])),
	);
}

/** Docsify renders asynchronously; the heading is the signal a route is done. */
async function heading(page: Page) {
	const h1 = page.locator(".markdown-section h1").first();
	await expect(h1).toBeVisible();
	return h1;
}

test("the generated folder is a complete static site", async ({ page }) => {
	const problems = watchForProblems(page);

	await page.goto("/");

	// `toDoc` emits no README.md, so the shell has to send a bare `/` at the
	// workspace index or the root route would 404.
	await expect(await heading(page)).toHaveText(WORKSPACE_NAME);
	// The workspace's own context map is beside its page, not at the site root.
	await expect(page.locator(".markdown-section img").first()).toBeVisible();
	await expect(page.locator(".sidebar-nav")).toBeVisible();

	expect(problems).toEqual([]);
});

test("every sidebar page renders, with no console errors or failed requests", async ({
	page,
}) => {
	const problems = watchForProblems(page);

	await page.goto("/");
	await heading(page);

	const links = await page.locator(".sidebar-nav a").evaluateAll((as) => {
		const byHref = new Map<string, string>();
		for (const a of as as HTMLAnchorElement[]) {
			const href = a.getAttribute("href");
			// `subMaxLevel` also lists the open page's own headings as `?id=`
			// anchors; those are not pages of their own.
			if (href && !href.includes("?id="))
				byHref.set(href, a.textContent?.trim() ?? "");
		}
		return [...byHref].map(([href, label]) => ({ href, label }));
	});
	// Every target `_sidebar.md` names must have made it into the rendered nav,
	// so the walk below really is every page the site offers.
	const hrefs = links.map((l) => l.href);
	for (const target of sidebarTargets()) {
		// Docsify routes are the target without its `.md` suffix.
		expect(hrefs, `${target} is missing from the rendered sidebar`).toContain(
			`#${target.replace(/\.md$/, "")}`,
		);
	}

	for (const { href, label } of links) {
		await page.goto(href);
		// The heading carries the sidebar's own label, so this proves the route
		// really swapped the page rather than leaving the last one on screen.
		await expect(
			await heading(page),
			`${href} did not render the page for "${label}"`,
		).toContainText(label);
	}

	expect(problems).toEqual([]);
});
