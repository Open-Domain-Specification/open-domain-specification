# WorkspacePage

`packages/pages/src/lib/templates/WorkspacePage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `DefinitionList`, `Section`, `Heading` 3, `Markdown`,
`DataTable`, `Lockup`, `Keyword`, `Ref`, `DiagramFigure`, restyled
`Problems`, `HealthReport`, `EmptyState`.

## Layout

```
📦 Swagger Petstore (v3)  swagger_petstore_(v3)  Workspace
DDD/ODS model for Swagger Petstore v3 ...
Version   0.2.0
File      petstore.json

Problem space  (5)                               (Section)
  ⬚ Petstore Commerce                            (Heading 3: domain lockup)
  Core pet catalog, sales, and inventory capabilities ...
    Subdomain    Classification   Served by                      Description
    ⬚ Catalog    core             ⬚ Catalog BC, ⬚ Inventory BC   Pet definitions ...
    ⬚ Sales      core             ⬚ Sales BC                     Orders and order lifecycle ...
  ⬚ Identity & Accounts
  ...

Solution space  (5)                              (Section)
  [context map figure]
    Context          Serves               Team               Aggregates  Services
    ⬚ Catalog BC     Catalog              👥 Pet Shop Team   1           1
    ⬚ Identity BC  big ball of mud   Users  👥 Platform Team  1           1

Teams  (3)                                       (Section)
    Team               Owns                             Description
    👥 Pet Shop Team   ⬚ Catalog BC, ⬚ Inventory BC     Owns the catalog and ...

Model health                                     (Section)
  Structural rules ...                           (lead)
  ✓ No structural problems found.                (Problems list, or this sentence in the secondary colour)
  Refactor (1) / Tolerated (1) / No comments (2) (HealthReport)
```

The version and file chips beside the title become two definitions. Each
domain is a level-3 subsection with a subdomain table under it (one table
per domain keeps the domain's description in place). Contexts and teams are
tables; a big ball of mud is a `warn` keyword after the context lockup. The
green tick line loses its colour: `pass` codicon in `icon.foreground`,
sentence in the secondary colour.
