---
column: review
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T12:53:44.000Z
live: false
---
# Add cardinality and cross-aggregate reference rules to entity relations

Entity relations are typed only as references | includes | uses with no cardinality (packages/core/src/schema.ts:87-99). Add cardinality, and enforce the DDD rule that a cross-aggregate reference may only target another aggregate's root entity by identity.

## Checklist

- [x] Add `cardinality` to EntityRelationSchema
- [x] Validate that `references` across aggregates targets a root entity (delivered as a diagnostic in card 14's validation pass)

## Comments

- **claude** (2026-09-02T12:53:44.000Z): RelationCardinality (1, 0..1, *, 1..*) on EntityRelationSchema (packages/core/src/schema.ts:229-245); the uses/includes/references helpers on Entity and ValueObject take an optional cardinality and EntityRelation carries it (packages/core/src/workspace.ts:1100-1250,1330-1360). Relation map edges carry it and graphviz draws it as the head label (packages/graphviz/src/relation-map.ts:140-146); the aggregate doc gets a Cardinality column. Petstore Pet and Order relations are annotated and Order now references the Pet root by identity. The cross-aggregate root rule is a diagnostic and lands with card 14's validation pass. Build and 124 tests green. Six-agent audit: KISS caught my labeldistance override clobbering the per-relation table (0.4), removed.
