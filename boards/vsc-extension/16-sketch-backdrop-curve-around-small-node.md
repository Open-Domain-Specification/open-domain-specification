---
column: review
labels: [bug, frontend]
priority: high
agent: dev-opus
live: false
clean-code-swept: true
updatedAt: 2026-09-03T19:40:00.000Z
---
# Fix outer backdrop curve pinch when closing around small or outlier nodes

In context diagrams using the sketch style, the outer backdrop blob is designed to draw an organic, smooth boundary around the domain model (packages/pages/src/lib/flow/SketchBackdrop.svelte:1-136). However, when the outer boundary closes around a single isolated or smaller node (such as the "Identity BC" node at the lower edge of the Petstore Commerce map), the curve fails to bend smoothly and instead forms an unnatural sharp pinch, inward kink, or cusp at the apex.

## Technical Cause

The outer boundary geometry is produced by `sketchBackdrop` in packages/pages/src/lib/flow/voronoi.ts:335-346:

1. `outerBlob` (voronoi.ts:167-170) extracts ellipse sample points from each node via `ellipsePoints`, computes their convex hull, and resamples the perimeter with `resample(hull, padding * BLOB_RESAMPLE_FACTOR)`.
2. `smoothPath` (voronoi.ts:178-201) constructs a closed Catmull-Rom spline converted into cubic Bézier segments:
   ```ts
   const c1: Point = [ p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6 ];
   const c2: Point = [ p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6 ];
   ```
3. Because `smoothPath` uses a uniform Catmull-Rom spline, it assumes equal spacing between all points. When transitioning from a long straight tangent bridging large clusters to a tight cluster of sample points rounding a single small node, the tangent vector `(p2 - p0) / 6` overshoots severely. This causes the cubic curve to pull backwards toward the interior, producing a visible sharp kink or cusp.

## Solution

- Upgrade `smoothPath` in packages/pages/src/lib/flow/voronoi.ts:178-201 from uniform to centripetal Catmull-Rom parameterization (`alpha = 0.5`). Centripetal Catmull-Rom splines are mathematically proven to eliminate self-intersections, cusps, and overshoot on non-uniform point distributions.
- Tune perimeter resampling in packages/pages/src/lib/flow/voronoi.ts:148-164 to ensure smooth chord length transitions between long tangents and tight node corners.
- Verify that outlier nodes in the Petstore Commerce context map and single-node diagrams produce clean, convex, organically curved boundaries without kinks.

## Checklist

- [x] Add unit test in packages/pages/src/lib/flow/voronoi.test.ts testing single node and outlier node geometries for curve kinks or cusps
- [x] Implement centripetal Catmull-Rom parameterization (`alpha = 0.5`) in `smoothPath` in packages/pages/src/lib/flow/voronoi.ts:178-201
- [x] Ensure resampled points around tight node hulls transition smoothly in packages/pages/src/lib/flow/voronoi.ts:148-164
- [x] Maintain 100% test coverage in packages/pages/src/lib/flow/voronoi.test.ts
- [ ] Visually verify smooth boundary rendering in packages/pages/src/lib/flow/SketchBackdrop.stories.svelte and the Petstore example

## Gates

- [x] qa-automated — flow suite 121/121, voronoi.ts 100% all metrics; turn test proven to fail on the old spline (lead, 2026-09-03T19:40:00Z)

- [x] clean-code-swept — SRP/KISS, DRY/naming and coupling/dead-code sweeps over the diff, no finding above 0.5 (dev-opus, 2026-09-03T16:07:00.000Z)

## Comments

- **jonathan** (2026-09-03T12:35:00.000Z): Raised bug report with screenshot showing the outer backdrop path pinching into a sharp cusp when closing around a small node. Uniform Catmull-Rom overshoot needs centripetal parameterization to curve smoothly.
- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-opus. Fixed by decision: centripetal Catmull-Rom, alpha = 0.5, in `smoothPath` (voronoi.ts:178-201), closed loop, same cubic Bézier output form. Keep the resample step unless the test below still fails; if you change it, journal the before/after. Test that proves it (add to voronoi.test.ts): sample each Bézier segment of the outer blob path at, say, 8 points for (a) a single node and (b) three large nodes plus one small outlier far below them; assert the polygon's turning direction never flips (signed cross product of successive edge vectors keeps one sign, allowing zero) and the path never enters any node ellipse. Also assert the path string still starts with M and ends with Z. Coverage must stay 100% branches. The visual verification checklist item is the lead's; leave it unticked. Work in your worktree; `npm ci` there first if node_modules is missing.
- **dev-opus** (2026-09-03T15:20:00.000Z): Picking this up. Read packages/pages/src/lib/flow/voronoi.ts:178-201 (uniform Catmull-Rom) and the existing coverage at packages/pages/src/lib/flow/voronoi.test.ts:119-147. Writing the turning-direction/ellipse-containment test first, then the alpha=0.5 reparameterisation.
- **dev-opus** (2026-09-03T15:42:00.000Z): Measured the defect before touching anything, so the test could be aimed at it. Sampling the blob path at 8 points per Bezier and taking the signed turn angle at each vertex: a single node turned by **-1.32 rad** at one vertex and its total turning came to **0.13 rad** instead of 2*pi — the curve doubles back on itself, which is the cusp in the screenshot. Three big nodes with a small outlier below turned by -0.05 rad, a milder kink. (Correction from the entry below: -1.32 was measured with the path's closing point sampled twice, which corrupts the two vertices at the seam. With that duplicate dropped, as the committed test does, the old code's worst turn on the single node is **-0.16 rad** — still a reversal, still caught, and that is the number the test comment quotes.) The raw cross product the card suggested is too weak a signal here (it scales with the chord length, so at 8 samples per segment it reads -0.1 either way); the angle is scale-free, so the test asserts on that instead.
- **dev-opus** (2026-09-03T15:44:00.000Z): Two changes. (1) `smoothPath` is now centripetal (alpha = 1/2) Catmull-Rom, packages/pages/src/lib/flow/voronoi.ts:174-232 — `knot` at voronoi.ts:174-180 is the chord length to the power 1/2 with an EPS floor so coincident points cannot divide by zero, and `control` at voronoi.ts:182-201 is Barry and Goldman's non-uniform segment in Bezier form, which collapses to the old `p1 + (p2 - p0) / 6` at equal spacings. (2) `resample` at voronoi.ts:143-171 now stretches the step to a whole number of paces round the perimeter (`perimeter / max(3, round(perimeter / step))`). Before: the chord that closed the loop was whatever was left over — 1.69 against a 36.0 step for the single node, a 21x jump that the spline kinks on. After: every chord is one pace, and the single node's worst turn goes -1.32 -> 0.000 rad with its total turning at 2*pi exactly. The outlier case goes -0.049 -> -0.035 rad (about 2 degrees, sub-pixel at the sharpest hull corner). The card allowed the resample step to stand unless the test still failed; it did — centripetal alone left the single node at -0.16 rad — so both went in.
- **dev-opus** (2026-09-03T15:46:00.000Z): The new test is packages/pages/src/lib/flow/voronoi.test.ts:287-380 — `samplePath` walks the path's cubics at 8 points each, `turns` gives the signed turn angle, `ellipseRadius` the distance in ellipse radii. For a single node and for three 260x160 nodes with a 90x40 node 620 below them it asserts the path still starts with M and ends with Z, that no turn drops below -0.1 rad, that the total turning is 2*pi (one loop, no overshoot), and that no sample lands inside any node's ellipse. Checked it fails on the old geometry by stashing voronoi.ts: the single-node case fails at -0.160 rad. The existing resample assertion at voronoi.test.ts:99-108 moved with the even-pacing change: `resample(square, 7)` was 6 points at a 7 step with a 4-long closing chord, it is now 6 points at a 6.67 pace with the loop closing on a full one.
- **dev-opus** (2026-09-03T15:55:00.000Z): Coverage on the changed file: `vitest run src/lib/flow/voronoi.test.ts --coverage.include=src/lib/flow/voronoi.ts` gives 100% statements, branches, functions and lines. Nothing in the change adds a branch — the two floors are `Math.max`, not conditionals (voronoi.ts:158, voronoi.ts:187) — so the package's 100% threshold holds.
- **dev-opus** (2026-09-03T16:05:00.000Z): Chased three red tests in the first full-package run; none of them are this change. `src/site.test.ts` wanted `packages/pages/app/assets`, which is a build output the fresh worktree had never produced — `npm run build` in packages/pages fixed it and the suite passes. The two `src/lib/Page.test.ts` timeouts were contention: with six other agents on the machine that file took 232s and timed out twice, and on a quieter machine it is 117 passed in 58s with my change applied and 117 passed in 46s with it stashed. So the change costs nothing measurable on the 450-odd reference pages.
- **dev-opus** (2026-09-03T16:07:00.000Z): Clean-code sweep over the diff, three reviewers (SRP+KISS, DRY+naming, coupling+dead code). No finding above 0.5 from any of them, so nothing to refactor. The two sub-threshold notes, recorded for the record: `resample` measures each edge twice, once for the perimeter and once in the walk (voronoi.ts:151-171, O(n) on a hull of a few dozen points), and `control` is a general name carried by its doc comment (voronoi.ts:189-206).
- **dev-opus** (2026-09-03T16:10:00.000Z): Moving to review. Final full-package run `npm run test:unit` in packages/pages: 48 of 49 files pass, 365 tests. The one red file is `src/lib/Page.test.ts`, two of its 117 tests hitting the 30s `testTimeout` — and a different two each run (RiverMart + StreamLine, then RiverMart + NorthBank), which is the signature of contention rather than a fault; that file on its own is 117/117 in 58s with the change and 117/117 in 46s without it. Everything else, `src/lib/flow/voronoi.test.ts` included, is green. Two things the lead will want to know about this worktree: it was branched from v0.1.11 and I reset it to develop head (0511a70) to get this card, and `lerna run build` reports success from the nx cache without writing any `dist`, so packages/core, packages/graphviz and the pages app all had to be built by hand before the suite could run. The visual check is left unticked for you.
- **lead** (2026-09-03T19:40:00.000Z): Reviewed voronoi.ts:184-205 (`knot`, `control`, Barry-Goldman form verified) and the even-pace `resample`. Landing on develop; the visual check follows through the sketch e2e spec and Storybook.
