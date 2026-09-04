# v2 specs

One short spec per organism and template in `packages/pages/src/lib/`, for
the implementation cards that move each one onto the
[design language v2](../design-language-v2.md). Each spec names the v2
primitives it uses and sketches the layout. Primitives are the files under
`packages/pages/src/lib/atoms/`; their stories are under `Atoms/` in Storybook.

Organisms: [AttributesSection](organism-attributes-section.md),
[DiagramFigure](organism-diagram-figure.md),
[HealthReport](organism-health-report.md),
[InteractiveDiagram](organism-interactive-diagram.md),
[InvariantsSection](organism-invariants-section.md),
[LanguageSection](organism-language-section.md),
[PageHeader](organism-page-header.md),
[RelationshipDetail](organism-relationship-detail.md),
[Section](organism-section.md), [Sidebar](organism-sidebar.md),
[StrategicPositionTable](organism-strategic-position-table.md),
[Toc](organism-toc.md).

Templates: [AggregatePage](template-aggregate-page.md),
[ConsumablePage](template-consumable-page.md),
[ContextPage](template-context-page.md), [DomainPage](template-domain-page.md),
[EntityPage](template-entity-page.md), [InvariantPage](template-invariant-page.md),
[PolicyPage](template-policy-page.md),
[RelationshipPage](template-relationship-page.md),
[SchemaPage](template-schema-page.md), [ServicePage](template-service-page.md),
[SubdomainPage](template-subdomain-page.md), [TeamPage](template-team-page.md),
[TermPage](template-term-page.md), [ValueObjectPage](template-value-object-page.md),
[WorkspacePage](template-workspace-page.md), and the layout,
[Page](template-page-layout.md).

Conventions every spec assumes:

- A page is `PageHeader`, then `Section`s. Nothing is in a card or a grid.
- Where a v1 template rendered a `Card` per item, the spec says "rows" and
  means a `DataTable` whose first column is a `Lockup`; where it says
  "subsection" it means a `Heading` level 3 with a `Lockup` in it, followed by
  the item's own content.
- Every empty branch keeps v1's sentence, rendered by `EmptyState`.
- Every list of refs is comma-separated `Ref`s (v1 `RefList`, restyled).
- Problems for a section render inside `Section`, restyled `Problems`.
