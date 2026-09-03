---
column: done
labels: [ddd, backend, docs]
priority: med
agent: claude
live: false
updatedAt: 2026-09-03T13:20:00.000Z
---
# Render the relation map as a UML class diagram

Where DDD has no notation of its own, use UML. The relation map (entities, value objects and their relations) is a class diagram, so draw it as one: attribute compartments with `{id}` marks, UML association, composition and dependency arrows, cardinality at the target end, one cluster per aggregate instead of five nested namespace boxes. Also emit PlantUML source for users with their own PlantUML tooling. Rendering PlantUML ourselves was assessed and rejected, see decisions/10-uml-via-graphviz-not-plantuml.md. Context, consumable and flow maps stay custom DDD diagrams.

## Checklist

- [x] Core: relation map nodes carry their attributes
- [x] graphviz: shared theme module
- [x] graphviz: relation map as UML class diagram with toPlantUML()
- [x] graphviz tests updated and extended
- [x] Docs site relation page and example regenerated
- [x] Whole-repo build and test green

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T14:55:00.000Z): Spike concluded that in-process PlantUML rendering is not viable (JVM, server or a CheerpJ runtime, none of which fit the wasm-in-extension-host and Node build pipeline in apps/ods-vscode/src/pages/graphviz.ts:7 and packages/doc/src/index.ts:41-118). Taking the UML styling into the existing Graphviz relation map in packages/graphviz/src/relation-map.ts instead, plus a PlantUML text exporter.
- **claude** (2026-09-02T16:05:00.000Z): Core relation map nodes now carry attributes (name, type, identity, description) via ODSRelationMapAttribute in packages/core/src/relation-map.ts:23-37 and packages/core/src/relation-map.ts:160-176. New shared theme module packages/graphviz/src/theme.ts:1-49 (font, halo stylesheet, namespace cluster attributes, HTML escaping). Relation map rewritten as a UML class diagram in packages/graphviz/src/relation-map.ts:20-60 (stereotypes, UML arrows), :75-87 (HTML-like class label with attribute compartment and {id} marks), :118-142 (relationMapToPlantUML, one package per aggregate) and :145-199 (one cluster per aggregate labelled with the context path, toPlantUML on the result). Tests in packages/graphviz/src/relation-map.test.ts:1-70 cover DOT, HTML escaping, SVG content and PlantUML. Docs page apps/docs/docs/4-graphviz/3-relations.md:1-28 and the example test apps/docs/tests/relationship.example.test.ts:54-63 gained attributes and a cardinality; example SVG and snapshots regenerated. Decision decisions/10-uml-via-graphviz-not-plantuml.md records the PlantUML rejection. Consumers (doc generator, ods-ui, VS Code extension) needed no code changes since the function signature only grew. Lerna build (7 projects) and test (5 projects) green.
