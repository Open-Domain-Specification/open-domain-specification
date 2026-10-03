import { expect, type Locator, type Page, test } from "@playwright/test";
import { openInteractiveDiagram, serveModel } from "./helpers";

/** The sketch style on the workspace context map, the default: ellipse nodes over a Voronoi backdrop. */

test("the sketch style is the default, cards can be chosen, and sketch comes back", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	await expect(flow.locator(".context-node.sketch").first()).toBeVisible();
	await expect(flow.locator(".cluster-node")).toHaveCount(0);

	const panel = flow.locator(".diagram-options");
	await panel.getByLabel("Diagram style").selectOption("cards");
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
	await expect(flow.locator(".sketch-backdrop")).toHaveCount(0);
	await panel.getByLabel("Diagram style").selectOption("sketch");

	// The backdrop sits under the nodes: one solid blob, dashed boundaries clipped to it, a label per group.
	const backdrop = flow.locator(".svelte-flow__viewport-back .sketch-backdrop");
	await expect(backdrop).toBeAttached();
	await expect(backdrop.locator(".blob")).toHaveAttribute("d", /^M.* C/);
	const boundaries = backdrop.locator(".boundaries");
	await expect(boundaries).toHaveAttribute("d", / L/);
	await expect(boundaries).toHaveCSS("stroke-dasharray", /\d/);
	expect(await backdrop.locator(".region-label").count()).toBeGreaterThan(1);
	// Domains are the union of their subdomains' cells: a thicker solid border with the name along it.
	const borders = backdrop.locator(".domain-borders");
	await expect(borders).toHaveAttribute("d", / L/);
	await expect(borders).toHaveCSS("stroke-width", "4px");
	await expect(borders).toHaveCSS("stroke-dasharray", "none");
	const domainLabels = backdrop.locator(".domain-label textPath");
	expect(await domainLabels.count()).toBeGreaterThan(0);
	const href = await domainLabels.first().getAttribute("href");
	await expect(backdrop.locator(`path${href}`)).toHaveAttribute("d", /^M/);
	await expect(backdrop.locator(".domain-label").first()).toHaveText(
		/Petstore Commerce|Customer Care|\S+/,
	);
	// Nodes are ellipses with the same content, handles and colours; the cluster regions are gone.
	const node = flow.locator(".context-node.sketch").first();
	await expect(node).toBeVisible();
	await expect(node).toHaveCSS("border-radius", /50%/);
	await expect(node).toHaveAttribute("style", /--band/);
	await expect(node.locator(".group")).toBeVisible();
	await expect(flow.locator(".cluster-node")).toHaveCount(0);
	await expect(flow.locator(".stereotype").first()).toBeVisible();
	await expect(flow.locator(".port.upstream").first()).toBeVisible();

	// Dragging a node well outside its cluster keeps it there (no parent extent clamps it) and reshapes the backdrop.
	await page.setViewportSize({ width: 1600, height: 1200 });
	const before = await backdrop.locator(".blob").getAttribute("d");
	// The legend panel overlays the top left, so drag a node that sits clear of it.
	const legend = (await flow.locator(".diagram-legend").boundingBox())!;
	const clear = async () => {
		for (const n of await flow.locator(".context-node.sketch").all()) {
			const b = (await n.boundingBox())!;
			if (b.x > legend.x + legend.width || b.y > legend.y + legend.height)
				return { node: n, box: b };
		}
		throw new Error("every node sits under the legend");
	};
	const { node: dragged, box } = await clear();
	/** The node's position in flow coordinates, from its wrapper's transform. */
	const wrapper = dragged.locator(
		"xpath=ancestor::div[contains(@class, 'svelte-flow__node')][1]",
	);
	const at = async () => {
		const [, x, y] = (await wrapper.getAttribute("style"))!.match(
			/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/,
		)!;
		return { x: Number(x), y: Number(y) };
	};
	const zoom = Number(
		(await flow.locator(".svelte-flow__viewport").getAttribute("style"))!.match(
			/scale\(([\d.]+)\)/,
		)![1],
	);
	const start = await at();
	const dx = 420;
	const dy = 260;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		box.x + box.width / 2 + dx,
		box.y + box.height / 2 + dy,
		{ steps: 8 },
	);
	await page.mouse.up();
	await expect
		.poll(() => backdrop.locator(".blob").getAttribute("d"))
		.not.toBe(before);
	// Dragged the full distance in flow space (the canvas auto-pans near its edge, so screen boxes lie).
	const end = await at();
	// The pointer's drag threshold eats a few pixels; a parent extent would have clamped far more.
	expect((end.x - start.x) * zoom).toBeGreaterThan(dx * 0.85);
	expect((end.y - start.y) * zoom).toBeGreaterThan(dy * 0.85);
	// The domain border followed the node.
	await expect(borders).toHaveAttribute("d", / L/);

	// The choice sticks, and cards return on switching back.
	await page.reload();
	await expect(flow.locator(".context-node.sketch").first()).toBeVisible();
	await flow
		.locator(".diagram-options")
		.getByLabel("Diagram style")
		.selectOption("cards");
	await expect(flow.locator(".sketch-backdrop")).toHaveCount(0);
	await expect(flow.locator(".context-node.sketch")).toHaveCount(0);
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
});

type Rect = { x: number; y: number; width: number; height: number };
type Frame = {
	tx: number;
	ty: number;
	scale: number;
	pane: Rect;
	node: Rect;
	/** The node wrapper's own translate: its position in flow units, which the library paints. */
	flow: { x: number; y: number };
	cluster: Rect;
};

/**
 * Installed in the page: `snap` reads the viewport transform, the dragged node's wrapper (by its
 * stable data-id) and the outermost cluster box from one frame, and `watch` records one snapshot
 * per animation frame until three in a row are identical, bounded by a frame count, never a sleep.
 */
const installProbe = (root: Element) => {
	const snap = (id: string): Frame => {
		const viewport = root.querySelector<HTMLElement>(".svelte-flow__viewport");
		const m = viewport?.style.transform.match(
			/translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)\s*scale\(([-\d.e]+)\)/,
		);
		const rect = (e: Element | null | undefined): Rect => {
			const r = e?.getBoundingClientRect();
			if (!r) throw new Error("diagram element missing");
			return { x: r.x, y: r.y, width: r.width, height: r.height };
		};
		const node = root.querySelector(
			`.svelte-flow__node[data-id="${CSS.escape(id)}"]`,
		);
		const t = node instanceof HTMLElement ? node.style.transform : "";
		const at = t.match(/translate\(([-\d.e]+)px,\s*([-\d.e]+)px\)/);
		return {
			flow: { x: Number(at?.[1]), y: Number(at?.[2]) },
			tx: Number(m?.[1]),
			ty: Number(m?.[2]),
			scale: Number(m?.[3]),
			pane: rect(root),
			node: rect(node),
			cluster: rect(root.querySelector('.cluster-node[data-depth="0"]')),
		};
	};
	const w = window as unknown as {
		__dragProbe: {
			snap: typeof snap;
			watch: (id: string, bound: number) => Promise<Frame[]>;
			record: (id: string) => void;
			recorded: () => number;
			stop: () => Frame[];
		};
	};
	let recording: Frame[] = [];
	let running = false;
	w.__dragProbe = {
		snap,
		watch: (id, bound) =>
			new Promise((resolve, reject) => {
				const frames: Frame[] = [];
				let same = 0;
				const tick = () => {
					const f = snap(id);
					if (frames.length)
						same =
							JSON.stringify(f) === JSON.stringify(frames[frames.length - 1])
								? same + 1
								: 0;
					frames.push(f);
					if (same >= 3) return resolve(frames);
					if (frames.length > bound)
						return reject(new Error(`no settle in ${bound} frames`));
					requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			}),
		record: (id) => {
			recording = [];
			running = true;
			const tick = () => {
				if (!running) return;
				recording.push(snap(id));
				requestAnimationFrame(tick);
			};
			requestAnimationFrame(tick);
		},
		recorded: () => recording.length,
		stop: () => {
			running = false;
			return recording;
		},
	};
};

const SETTLE_FRAMES = 150;
const right = (r: Rect) => r.x + r.width;
const bottom = (r: Rect) => r.y + r.height;
/** The cluster's own padding round its members, in flow units (cluster-fit.ts PAD). */
const PAD_SIDE = 16;
const PAD_BOTTOM = 16;

/** The cluster box contains the node on all four edges and keeps its padding on the sides the node was dragged towards. */
const expectContains = (f: Frame) => {
	expect(f.node.x).toBeGreaterThan(f.cluster.x);
	expect(f.node.y).toBeGreaterThan(f.cluster.y);
	expect(right(f.cluster) - right(f.node)).toBeGreaterThanOrEqual(
		PAD_SIDE * f.scale - 1,
	);
	expect(bottom(f.cluster) - bottom(f.node)).toBeGreaterThanOrEqual(
		PAD_BOTTOM * f.scale - 1,
	);
};

/** Two frames are the same picture: nothing moved by more than half a pixel. */
const expectSame = (a: Frame, b: Frame) => {
	for (const k of ["node", "cluster"] as const)
		for (const d of ["x", "y", "width", "height"] as const)
			expect(
				Math.abs(a[k][d] - b[k][d]),
				`${k}.${d} moved after release`,
			).toBeLessThanOrEqual(0.5);
	expect(b.tx).toBe(a.tx);
	expect(b.ty).toBe(a.ty);
	expect(b.scale).toBe(a.scale);
};

const openCards = async (page: Page) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	await page.setViewportSize({ width: 1600, height: 1200 });
	await flow
		.locator(".diagram-options")
		.getByLabel("Diagram style")
		.selectOption("cards");
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
	await flow.evaluate(installProbe);
	const legend = (await flow.locator(".diagram-legend").boundingBox())!;
	// The legend overlays the top left, so drag a node that sits clear of it, tracked by its data-id.
	for (const n of await flow.locator(".context-node").all()) {
		const b = (await n.boundingBox())!;
		if (b.x > legend.x + legend.width || b.y > legend.y + legend.height) {
			const id = await n.evaluate(
				(e) => e.closest(".svelte-flow__node")!.getAttribute("data-id")!,
			);
			return {
				flow,
				id,
				grab: { x: b.x + b.width / 2, y: b.y + b.height / 2 },
			};
		}
	}
	throw new Error("every node sits under the legend");
};

const snapOf = (flow: Locator, id: string) =>
	flow.evaluate(
		(_, i) =>
			(
				window as unknown as {
					__dragProbe: { snap: (id: string) => Frame };
				}
			).__dragProbe.snap(i),
		id,
	);
const settleOf = (flow: Locator, id: string) =>
	flow.evaluate(
		(_, [i, n]) =>
			(
				window as unknown as {
					__dragProbe: {
						watch: (id: string, bound: number) => Promise<Frame[]>;
					};
				}
			).__dragProbe.watch(i as string, n as number),
		[id, SETTLE_FRAMES],
	);

/** Svelte Flow pans the canvas while the pointer is within this many pixels of its edge. */
const AUTO_PAN_EDGE = 40;
/** How far a point sits outside the auto-pan zone of `pane`, the nearest of its four sides; negative is inside it. */
const clearOfAutoPan = (pane: Rect, p: { x: number; y: number }) =>
	Math.min(p.x - pane.x, right(pane) - p.x, p.y - pane.y, bottom(pane) - p.y) -
	AUTO_PAN_EDGE;
const centreOf = (r: Rect) => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });

test("in the cards style the cluster boxes follow a dragged node", async ({
	page,
}) => {
	const { flow, id } = await openCards(page);
	// Switching style does not refit the view, so the camera is whatever the last fit left. Ask for the fit the way a reader does, with the Fit View control. Clusters are drawn nodes in this style, so a requested fit contains the whole outer cluster. Wait for the cluster to be measured first, since a fit counts only measured nodes.
	await expect
		.poll(async () => {
			const f = await snapOf(flow, id);
			return f.cluster.width > 0 && f.cluster.height > 0;
		})
		.toBe(true);
	await settleOf(flow, id);
	await flow.locator(".svelte-flow__controls-fitview").click();
	let before = (await settleOf(flow, id)).at(-1)!;
	expect(before.cluster.x).toBeGreaterThanOrEqual(before.pane.x);
	expect(before.cluster.y).toBeGreaterThanOrEqual(before.pane.y);
	expect(right(before.cluster)).toBeLessThanOrEqual(right(before.pane));
	expect(bottom(before.cluster)).toBeLessThanOrEqual(bottom(before.pane));
	// Real clicks on the zoom-out control give the target room beyond the cluster, and move every node towards the middle of the canvas, away from its auto-pan edges (a pan left would carry the grab into the left one).
	const roomy = (f: Frame) =>
		right(f.pane) - right(f.cluster) >= 160 &&
		clearOfAutoPan(f.pane, centreOf(f.node)) >= 60;
	for (let i = 0; i < 4 && !roomy(before); i++) {
		await flow.locator(".svelte-flow__controls-zoomout").click();
		before = (await settleOf(flow, id)).at(-1)!;
	}
	expect(roomy(before)).toBe(true);
	// The same node, grabbed where it is now, and the pointer really lands on it.
	const grab = centreOf(before.node);
	expect(
		await page.evaluate(
			([x, y]) =>
				document
					.elementFromPoint(x, y)
					?.closest(".svelte-flow__node")
					?.getAttribute("data-id"),
			[grab.x, grab.y],
		),
	).toBe(id);
	// Aimed inside the canvas (clear of its 40px auto-pan edge) and meaningfully beyond the old cluster, so the viewport stays put.
	const target = {
		x: right(before.pane) - 60,
		y: Math.min(bottom(before.cluster) + 150, bottom(before.pane) - 60),
	};
	expect(target.x).toBeGreaterThan(right(before.cluster) + 60);
	expect(target.y).toBeGreaterThan(grab.y);
	// The whole pointer path (grab, first step, target: a straight line between clear points) stays clear of the auto-pan edge on all four sides.
	for (const p of [grab, { x: grab.x + 4, y: grab.y + 4 }, target])
		expect(clearOfAutoPan(before.pane, p)).toBeGreaterThanOrEqual(15);

	await page.mouse.move(grab.x, grab.y);
	await page.mouse.down();
	await flow.evaluate((_, i) => {
		(
			window as unknown as { __dragProbe: { record: (id: string) => void } }
		).__dragProbe.record(i);
	}, id);
	// A real pointer starts a drag with a small move; the library anchors the node there.
	await page.mouse.move(grab.x + 4, grab.y + 4);
	await page.mouse.move(target.x, target.y, { steps: 8 });
	const held = (await settleOf(flow, id)).at(-1)!;

	// While the button is held: no auto-pan, the node tracks the pointer (no one-step lag), and the cluster follows it.
	expect(held.tx).toBe(before.tx);
	expect(held.ty).toBe(before.ty);
	expect(held.scale).toBe(before.scale);
	expect(Math.abs(held.node.x + held.node.width / 2 - target.x)).toBeLessThan(
		8,
	);
	expect(Math.abs(held.node.y + held.node.height / 2 - target.y)).toBeLessThan(
		8,
	);
	expect(right(held.node)).toBeGreaterThan(right(before.cluster));
	expectContains(held);
	// The box grew with the node, by at least the distance it was dragged past the old edge.
	expect(right(held.cluster)).toBeGreaterThan(right(before.cluster));
	expect(held.cluster.width).toBeGreaterThan(before.cluster.width);

	await page.mouse.up();
	const released = await settleOf(flow, id);
	// Releasing changes nothing: every frame after it is the held picture, so no post-release jump and no reverse jump.
	for (const f of released) expectSame(held, f);
	const trail = await flow.evaluate(() =>
		(
			window as unknown as { __dragProbe: { stop: () => Frame[] } }
		).__dragProbe.stop(),
	);
	// Across the whole gesture the node only ever moves forward, and no painted frame has it outside the box.
	for (let i = 1; i < trail.length; i++)
		expect(right(trail[i].node)).toBeGreaterThanOrEqual(
			right(trail[i - 1].node) - 0.5,
		);
	for (const f of trail) {
		expect(f.node.x).toBeGreaterThanOrEqual(f.cluster.x - 1);
		expect(f.node.y).toBeGreaterThanOrEqual(f.cluster.y - 1);
		expect(right(f.node)).toBeLessThanOrEqual(right(f.cluster) + 1);
		expect(bottom(f.node)).toBeLessThanOrEqual(bottom(f.cluster) + 1);
	}
	expectContains(released.at(-1)!);
});

/** What a painted frame may differ by and still be the same picture: sub-pixel rounding, never a pan step (15px). */
const PIXEL = 1;

test("on a context map the canvas auto-pans a node dragged to its edge and the boxes stay with it", async ({
	page,
}) => {
	const { flow, id, grab } = await openCards(page);
	const before = await snapOf(flow, id);
	// Inside the pane's 40px auto-pan zone, and held there for the whole gesture.
	const edge = { x: right(before.pane) - 20, y: grab.y + 150 };

	await page.mouse.move(grab.x, grab.y);
	await page.mouse.down();
	await page.mouse.move(grab.x + 4, grab.y + 4);
	await page.mouse.move(edge.x, edge.y, { steps: 8 });
	// The pan is measured, not guessed: it has begun once the canvas has moved under the pointer.
	await expect
		.poll(async () => before.tx - (await snapOf(flow, id)).tx)
		.toBeGreaterThan(45);
	await flow.evaluate((_, i) => {
		(
			window as unknown as { __dragProbe: { record: (id: string) => void } }
		).__dragProbe.record(i);
	}, id);
	// The pointer does not move. Every frame of the next stretch is a frame of the canvas panning under it.
	await expect
		.poll(() =>
			flow.evaluate(() =>
				(
					window as unknown as { __dragProbe: { recorded: () => number } }
				).__dragProbe.recorded(),
			),
		)
		.toBeGreaterThanOrEqual(40);
	const held = await snapOf(flow, id);

	// Let go with the pointer still in the edge zone.
	await page.mouse.up();
	const released = await settleOf(flow, id);
	const trail = await flow.evaluate(() =>
		(
			window as unknown as { __dragProbe: { stop: () => Frame[] } }
		).__dragProbe.stop(),
	);

	// The canvas really was panning, steadily, under the held pointer.
	const first = trail[0];
	expect(first.tx - held.tx).toBeGreaterThan(100);
	for (let i = 1; i < trail.length; i++)
		expect(trail[i].tx).toBeLessThanOrEqual(trail[i - 1].tx);
	for (const f of trail) {
		expect(f.scale).toBe(first.scale);
		expect(f.ty).toBe(first.ty);
	}

	// A held pointer holds the node still on screen, frame after frame: no step back, no alternation, no stall.
	const panning = trail.filter((f) => f.tx > held.tx);
	for (const [n, f] of panning.entries())
		for (const k of ["x", "y"] as const)
			expect(
				Math.abs(f.node[k] - first.node[k]),
				`frame ${n}: node.${k} left the pointer`,
			).toBeLessThanOrEqual(PIXEL);
	// The world moved under it: flow displacement is the screen displacement plus the pan, as painted.
	for (const [n, f] of trail.entries()) {
		const world = (f.flow.x - first.flow.x) * f.scale;
		const screen = f.node.x - first.node.x + (first.tx - f.tx);
		expect(
			Math.abs(world - screen),
			`frame ${n}: world vs screen`,
		).toBeLessThanOrEqual(PIXEL);
	}
	// The box keeps its side of the node, and holds it on all four edges in every frame.
	for (const f of trail) {
		expectContains(f);
		expect(
			Math.abs(right(f.cluster) - right(first.cluster)),
		).toBeLessThanOrEqual(PIXEL);
		expect(
			Math.abs(bottom(f.cluster) - bottom(first.cluster)),
		).toBeLessThanOrEqual(PIXEL);
	}

	// Letting go moves nothing forward or back and the box does not snap back.
	const settled = released.at(-1)!;
	const last = panning.at(-1)!;
	for (const k of ["x", "y"] as const)
		expect(Math.abs(settled.node[k] - last.node[k])).toBeLessThanOrEqual(PIXEL);
	expect(
		Math.abs(right(settled.cluster) - right(last.cluster)),
	).toBeLessThanOrEqual(PIXEL);
	expect(
		Math.abs(bottom(settled.cluster) - bottom(last.cluster)),
	).toBeLessThanOrEqual(PIXEL);
	expectContains(settled);
});

test("on a context map a node that is alone in its cluster stays under a held pointer in the bottom-right corner and does not move when the pointer is let go", async ({
	page,
}) => {
	// northbank at this size is zoomed out far enough (a pan step is more than the 16px cluster padding in flow units)
	// for a parent's stale measurement to hold a cluster, and the one node in it, behind the pointer.
	// The probe records after auto-pan's frame callback, so this fails when a stale parent measurement holds the
	// drag state back (store and DOM state read before the resize observer runs), even though the paint is correct.
	await page.setViewportSize({ width: 1600, height: 1200 });
	const url = await serveModel(page, "northbank");
	await page.goto(`/?url=${encodeURIComponent(url)}`);
	const figure = page.locator("figure.diagram", { hasText: "Context map" });
	await figure.scrollIntoViewIfNeeded();
	const flow = figure.locator(".svelte-flow");
	const style = figure.getByLabel("Diagram style");
	if (!(await style.isVisible()))
		await figure.getByRole("button", { name: "Options" }).click();
	await style.selectOption("cards");
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
	await flow.evaluate(installProbe);
	// Alone in its subdomain cluster, so the cluster's origin follows it.
	const id = "#/boundedcontexts/payments_hub";
	const before = (await settleOf(flow, id)).at(-1)!;
	const grab = {
		x: before.node.x + before.node.width / 2,
		y: before.node.y + before.node.height / 2,
	};
	const corner = { x: right(before.pane) - 20, y: bottom(before.pane) - 20 };

	await page.mouse.move(grab.x, grab.y);
	await page.mouse.down();
	await page.mouse.move(grab.x + 4, grab.y + 4);
	await page.mouse.move(corner.x, corner.y, { steps: 8 });
	await expect
		.poll(async () => {
			const f = await snapOf(flow, id);
			return Math.min(before.tx - f.tx, before.ty - f.ty);
		})
		.toBeGreaterThan(45);
	await flow.evaluate((_, i) => {
		(
			window as unknown as { __dragProbe: { record: (id: string) => void } }
		).__dragProbe.record(i);
	}, id);
	await expect
		.poll(() =>
			flow.evaluate(() =>
				(
					window as unknown as { __dragProbe: { recorded: () => number } }
				).__dragProbe.recorded(),
			),
		)
		.toBeGreaterThanOrEqual(40);
	const held = await snapOf(flow, id);
	await page.mouse.up();
	const released = await settleOf(flow, id);
	const trail = await flow.evaluate(() =>
		(
			window as unknown as { __dragProbe: { stop: () => Frame[] } }
		).__dragProbe.stop(),
	);

	// The canvas panned on both axes under the held pointer.
	const first = trail[0];
	expect(first.tx - held.tx).toBeGreaterThan(100);
	expect(first.ty - held.ty).toBeGreaterThan(100);
	const panning = trail.filter((f) => f.tx > held.tx && f.ty > held.ty);
	expect(panning.length).toBeGreaterThanOrEqual(30);
	// Held still on screen, frame after frame, and the boxes keep their side of it.
	for (const [n, f] of panning.entries()) {
		for (const k of ["x", "y"] as const)
			expect(
				Math.abs(f.node[k] - first.node[k]),
				`frame ${n}: node.${k} left the pointer`,
			).toBeLessThanOrEqual(PIXEL);
		expectContains(f);
	}
	// Letting go moves nothing: the node was already where the pointer holds it in the last frame the canvas panned.
	const settled = released.at(-1)!;
	const last = panning.at(-1)!;
	for (const k of ["x", "y"] as const)
		expect(
			Math.abs(settled.node[k] - last.node[k]),
			`node.${k} moved on release`,
		).toBeLessThanOrEqual(PIXEL);
	expectContains(settled);
});
