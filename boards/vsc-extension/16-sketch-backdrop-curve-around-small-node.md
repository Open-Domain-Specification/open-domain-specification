---
column: backlog
labels: [bug, frontend]
priority: high
live: false
updatedAt: 2026-09-03T12:35:00.000Z
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

- [ ] Add unit test in packages/pages/src/lib/flow/voronoi.test.ts testing single node and outlier node geometries for curve kinks or cusps
- [ ] Implement centripetal Catmull-Rom parameterization (`alpha = 0.5`) in `smoothPath` in packages/pages/src/lib/flow/voronoi.ts:178-201
- [ ] Ensure resampled points around tight node hulls transition smoothly in packages/pages/src/lib/flow/voronoi.ts:148-164
- [ ] Maintain 100% test coverage in packages/pages/src/lib/flow/voronoi.test.ts
- [ ] Visually verify smooth boundary rendering in packages/pages/src/lib/flow/SketchBackdrop.stories.svelte and the Petstore example

## Comments

- **jonathan** (2026-09-03T12:35:00.000Z): Raised bug report with screenshot showing the outer backdrop path pinching into a sharp cusp when closing around a small node. Uniform Catmull-Rom overshoot needs centripetal parameterization to curve smoothly.
