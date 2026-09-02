---
column: doing
labels: [frontend, ddd]
priority: high
agent: claude
live: true
status: Delegated to a Fable subagent
progress: 10
updatedAt: 2026-09-03T11:00:00.000Z
---
# Sketch only for the context map, domain borders, and proper UML for the other two maps

Three changes to the interactive diagrams. First, the sketch style applies to the DDD context map only: the style control is hidden on the other maps. On the context map nodes can be dragged outside their cluster and the backdrop follows. The backdrop's regions are subdomains; a domain is the union of its neighbouring subdomain regions, drawn with a thicker border and a label that runs along the border line in the style of map boundary labels, and the layout keeps a domain's subdomains adjacent. Second, the consumable map becomes a proper UML component diagram: «component» boxes with the component icon, provided interfaces as lollipops and required interfaces as sockets, assembly connectors between them, patterns as the port labels. Third, the relation map becomes a proper UML class diagram: class compartments, stereotypes, composition, aggregation, association and dependency markers per relation kind, navigability and multiplicities at the ends. Arrows, labels, port badges and colours from the current diagrams stay where UML allows. Follows boards/project-backlog/30-voronoi-sketch-style.md.

## Checklist

- [ ] Style select shown only for the context map; sketch never applied to the other two
- [ ] Context map: nodes free to leave their cluster; backdrop recomputes
- [ ] Domain regions: union of subdomain Voronoi regions, thick border, label along the border path; layout keeps subdomains of a domain adjacent
- [ ] Consumable map as a UML component diagram
- [ ] Relation map as a UML class diagram
- [ ] Unit coverage 100, e2e updated, stories, docs

## Comments

- **claude** (2026-09-03T11:00:00.000Z): Raised from the request after the sketch style landed. Delegated to a Fable subagent.
