import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import {
	AA_TEXT,
	BLACK,
	type Layer,
	type Rgba,
	ratioOf,
	type Sample,
	WHITE,
} from "./contrast";
import {
	EXPORT_ORIGIN,
	modelHash,
	serveModel,
	servePetstore,
	viewerAt,
	WORKSPACE_NAME,
} from "./helpers";

/**
 * Every text role the contrast work touched, measured on a rendered page in
 * both themes and, on the context maps, both diagram styles: warning text and
 * the refactor port badge, the mud, external, boundary-only and relation
 * nodes, cluster labels, the legend and options panels, secondary text on the
 * row hover wash, and the import screen's example cards.
 *
 * "Effective" contrast is what the eye gets, not what one rule declares: the
 * text colour's alpha and every ancestor's `opacity` are multiplied in, and
 * the background is the translucent backgrounds of the element and its
 * ancestors composited over each other. Two roles sit on something that is
 * not an ancestor and are handled analytically rather than by pixels:
 *
 * - Cluster labels sit under their own cluster's translucent box and every
 *   other cluster box that contains them. The stack is composited over the
 *   map's own background, which is what the page paints here. (In dark the
 *   canvas actually painted behind the boxes is a little darker than that
 *   background, and light text on a darker backdrop only reads better, so the
 *   figure is the conservative one.)
 * - The legend and options panels can be dragged over any content, so their
 *   bound is not where they load. Each is composited over pure black and over
 *   pure white, the extremes, and the worse of the two must clear 4.5:1.
 *
 * Gradients and images are not modelled; none of these roles has one.
 */

type Role = "warn" | "mud" | "tinted" | "cluster" | "panel";
type Style = "cards" | "sketch";
type Scheme = "light" | "dark";

const STYLES: readonly Style[] = ["cards", "sketch"];

/** A route and the roles it must show: a role that never rendered proves nothing. */
type Route = {
	name: string;
	ref: string;
	map: boolean;
	needs: Role[];
	/** Needed only in the cards style (sketch draws region labels instead of cluster boxes). */
	needsInCards?: Role[];
	hover?: boolean;
};

const NORTHBANK: Route[] = [
	{
		name: "northbank workspace",
		ref: "#",
		map: true,
		needs: ["mud", "tinted", "warn", "panel"],
		needsInCards: ["cluster"],
		hover: true,
	},
	{
		name: "customer & kyc",
		ref: "#/boundedcontexts/customer_&_kyc",
		map: true,
		needs: ["cluster", "panel"],
	},
	{
		name: "account aggregate",
		ref: "#/boundedcontexts/accounts/aggregates/account",
		map: true,
		needs: ["tinted", "panel"],
	},
	{
		name: "branch & contact centre",
		ref: "#/boundedcontexts/branch_&_contact_centre",
		map: true,
		needs: ["warn", "cluster", "panel"],
		hover: true,
	},
	{
		name: "health",
		ref: "#/health",
		map: false,
		needs: ["warn"],
		hover: true,
	},
	{
		name: "refactor relationship",
		ref: "#/relationships/branch_&_contact_centre/separate-ways/credit_decisioning",
		map: false,
		needs: ["warn"],
	},
];

const PETSTORE: Route[] = [
	{
		name: "petstore workspace",
		ref: "#",
		map: true,
		needs: ["tinted", "warn", "panel"],
	},
	{
		name: "consumable with refactor",
		ref: "#/boundedcontexts/catalog_bc/services/pet_app/provides/reserve_pet_for_order",
		map: false,
		needs: ["warn"],
	},
];

/** Which elements carry each role's text: the root, and every text node's parent under it. */
const ROLE_ROOTS: Record<Role, string> = {
	warn: ".keyword.warn, .disposition.refactor, .port.refactor .port-label",
	mud: ".context-node.mud",
	tinted: ".context-node.external, .context-node.boundary-only, .relation-node",
	cluster: ".cluster-label",
	panel: ".diagram-legend, .diagram-options",
};

type Kind = "text" | "cluster" | "panel";
const KINDS: Record<Role, Kind> = {
	warn: "text",
	mud: "text",
	tinted: "text",
	cluster: "cluster",
	panel: "panel",
};

type Raw = Omit<Sample, "under">;

/**
 * Reads what the browser painted for every text element under `selector`:
 * colour, accumulated opacity and the background layers, outermost first.
 * The arithmetic stays in `contrast.ts`; this only reports computed style.
 */
async function collect(
	page: Page,
	selector: string,
	kind: Kind,
	within?: string,
): Promise<Raw[]> {
	return page.evaluate(
		({ selector, kind, within }) => {
			const chainOf = (el: Element) => {
				const chain: Element[] = [];
				for (let n: Element | null = el; n; n = n.parentElement)
					chain.unshift(n);
				return chain;
			};
			const layersOf = (el: Element, from?: Element) => {
				let opacity = 1;
				let started = from === undefined;
				const layers: { bg: string; opacity: number }[] = [];
				for (const n of chainOf(el)) {
					const style = getComputedStyle(n);
					opacity *= Number(style.opacity);
					if (n === from) started = true;
					if (started) layers.push({ bg: style.backgroundColor, opacity });
				}
				return { layers, opacity };
			};
			const textParents = (root: Element): Element[] => {
				const found = new Set<Element>();
				const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
				for (let n = walker.nextNode(); n; n = walker.nextNode()) {
					const parent = n.parentElement;
					if (!parent || !n.textContent?.trim()) continue;
					if (parent.closest("option, script, style")) continue;
					if (parent.getClientRects().length === 0) continue;
					found.add(parent);
				}
				for (const select of root.querySelectorAll("select"))
					if (select.getClientRects().length) found.add(select);
				return [...found];
			};
			const roots = [
				...(within
					? (document.querySelector(within)?.querySelectorAll(selector) ?? [])
					: document.querySelectorAll(selector)),
			];
			const samples: {
				text: string;
				color: string;
				textOpacity: number;
				layers: Layer[];
			}[] = [];
			for (const root of roots) {
				for (const el of textParents(root)) {
					const { layers, opacity } = layersOf(
						el,
						kind === "panel" ? root : undefined,
					);
					let all = layers;
					if (kind === "cluster") {
						const flow = el.closest(".svelte-flow");
						if (!flow) continue;
						const box = el.getBoundingClientRect();
						const x = box.left + box.width / 2;
						const y = box.top + box.height / 2;
						const stack = [...flow.querySelectorAll(".cluster-node")]
							.map((c) => ({ c, r: c.getBoundingClientRect() }))
							.filter(
								({ r }) =>
									r.left <= x && x <= r.right && r.top <= y && y <= r.bottom,
							)
							.sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height);
						all = [
							...layersOf(flow).layers,
							...stack.map(({ c }) => ({
								bg: getComputedStyle(c).backgroundColor,
								opacity: layersOf(c).opacity,
							})),
						];
					}
					samples.push({
						text: (el.textContent ?? "").trim().slice(0, 40),
						color: getComputedStyle(el).color,
						textOpacity: opacity,
						layers: all,
					});
				}
			}
			return samples;
		},
		{ selector, kind, within },
	);
}

const describeFailure = (route: string, role: string, s: Raw, ratio: number) =>
	`${route} / ${role}: "${s.text}" ${s.color} is ${ratio.toFixed(3)}:1`;

function failures(
	where: string,
	role: string,
	samples: Raw[],
	bases: (Rgba | undefined)[],
): string[] {
	return samples.flatMap((s) => {
		const ratio = Math.min(...bases.map((base) => ratioOf(s, base)));
		return ratio >= AA_TEXT ? [] : [describeFailure(where, role, s, ratio)];
	});
}

/** The page is up when its h1 is: fail here, not as an empty measurement later. */
async function settle(page: Page, map: boolean): Promise<void> {
	await expect(page.locator("main h1").first()).toBeVisible();
	if (map) {
		await expect(
			page.locator("figure.diagram .svelte-flow__node").first(),
		).toBeVisible();
		for (const figure of await page.locator("figure.diagram").all())
			await figure.scrollIntoViewIfNeeded();
	}
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(400);
}

async function setStyle(page: Page, style: Style): Promise<void> {
	await page.addInitScript((value) => {
		localStorage.setItem(
			"ods-diagram-options",
			JSON.stringify({ edges: "bezier", style: value }),
		);
	}, style);
}

async function measureRoute(
	page: Page,
	route: Route,
	style: Style,
	scheme: Scheme,
): Promise<string[]> {
	const problems: string[] = [];
	const where = `${route.name} (${scheme}, ${style})`;
	const needs = [
		...route.needs,
		...(style === "cards" ? (route.needsInCards ?? []) : []),
	];
	for (const role of Object.keys(ROLE_ROOTS) as Role[]) {
		const samples = await collect(page, ROLE_ROOTS[role], KINDS[role]);
		if (needs.includes(role) && samples.length === 0) {
			problems.push(`${where}: no ${role} text rendered`);
			continue;
		}
		// The panels are judged over the extremes, everything else as painted.
		const bases = role === "panel" ? [BLACK, WHITE] : [undefined];
		problems.push(...failures(where, role, samples, bases));
	}
	if (route.hover) problems.push(...(await hoverRows(page, where)));
	return problems;
}

/** Secondary and warning text on the row hover wash, for a few real rows. */
async function hoverRows(page: Page, where: string): Promise<string[]> {
	const rows = page.locator("main tbody tr:not(.group):not(.detail)");
	const count = await rows.count();
	expect(count, `${where}: table rows to hover`).toBeGreaterThan(0);
	const withWarn = rows.filter({
		has: page.locator(".keyword.warn, .disposition.refactor"),
	});
	const targets = [
		...((await withWarn.count()) ? [withWarn.first()] : []),
		rows.first(),
		rows.nth(Math.min(2, count - 1)),
	];
	const problems: string[] = [];
	for (const row of targets) {
		await row.scrollIntoViewIfNeeded();
		await row.hover();
		await page.waitForTimeout(250);
		const rowId = await row.evaluate((el) => {
			el.setAttribute("data-contrast-row", "");
			return el.textContent?.trim().slice(0, 30) ?? "";
		});
		const samples = await collect(page, "[data-contrast-row]", "text");
		await row.evaluate((el) => el.removeAttribute("data-contrast-row"));
		const painted = samples.some((s) =>
			s.layers.some(
				(l) => l.bg !== "rgba(0, 0, 0, 0)" && l.bg !== "transparent",
			),
		);
		expect(painted, `${where}: hover wash on "${rowId}"`).toBe(true);
		problems.push(
			...failures(`${where} hover "${rowId}"`, "row", samples, [undefined]),
		);
	}
	return problems;
}

async function checkAxe(page: Page, where: string): Promise<void> {
	const result = await new AxeBuilder({ page })
		.withRules(["color-contrast"])
		.analyze();
	expect(
		result.violations.flatMap((v) =>
			v.nodes.map((n) => `${where}: ${n.target.join(" ")} ${n.failureSummary}`),
		),
	).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
	test.describe(`contrast, ${scheme} theme`, () => {
		test.use({ colorScheme: scheme });
		test.setTimeout(60_000);

		const stylesFor = (route: Route) =>
			route.map ? STYLES : (["sketch"] as const);

		for (const route of NORTHBANK)
			for (const style of stylesFor(route))
				test(`viewer: ${route.name}, ${style}`, async ({ page }) => {
					const url = await serveModel(page, "northbank");
					await setStyle(page, style);
					await page.goto(
						`/?url=${encodeURIComponent(url)}${route.ref === "#" ? "" : modelHash(route.ref)}`,
					);
					await settle(page, route.map);
					expect(await measureRoute(page, route, style, scheme)).toEqual([]);
					await checkAxe(page, `${route.name} (${scheme}, ${style})`);
				});

		for (const route of PETSTORE)
			for (const style of stylesFor(route)) {
				test(`viewer: petstore ${route.name}, ${style}`, async ({ page }) => {
					await servePetstore(page);
					await setStyle(page, style);
					await page.goto(viewerAt(route.ref === "#" ? "" : route.ref));
					await settle(page, route.map);
					expect(await measureRoute(page, route, style, scheme)).toEqual([]);
					await checkAxe(page, `petstore ${route.name} (${scheme}, ${style})`);
				});

				test(`export: petstore ${route.name}, ${style}`, async ({ page }) => {
					await setStyle(page, style);
					await page.goto(
						`${EXPORT_ORIGIN}/${modelHash(route.ref === "#" ? "" : route.ref)}`,
					);
					await page.getByRole("link", { name: WORKSPACE_NAME }).click();
					await settle(page, route.map);
					expect(await measureRoute(page, route, style, scheme)).toEqual([]);
					await checkAxe(page, `export ${route.name} (${scheme}, ${style})`);
				});
			}

		test("viewer import screen: example card names", async ({ page }) => {
			// One card per reference model's own accent, the colours that
			// failed when the name took the tint (amber on white, blue on dark).
			await page.addInitScript(() => {
				const colors = ["#1d4ed8", "#0ea5e9", "#f59e0b", "#e11d48"];
				(window as unknown as { __ODS__: unknown }).__ODS__ = {
					examples: colors.map((color, i) => ({
						name: `Example ${i + 1}`,
						description: "A reference model.",
						url: `./examples/model-${i}.json`,
						color,
					})),
				};
			});
			await page.goto("/");
			await expect(
				page.getByRole("heading", { name: "Open a workspace" }),
			).toBeVisible();
			const names = await collect(page, ".example .card-head", "text");
			expect(names).toHaveLength(4);
			expect(
				failures("import screen", "example card name", names, [undefined]),
			).toEqual([]);
		});
	});
}
