# ODS UI

The ODS UI provides a static site build with React for you to explore and visualize your Open Domain Specification (ODS) maps. 

It includes interactive diagrams for context maps, consumable maps, and relation maps, allowing you to easily navigate and understand your domain models.

## Features

- **Interactive Diagrams**: View context maps, consumable maps, relation maps and flow maps with zoom and pan support
- **Searchable Components**: Quickly find domains, subdomains, contexts, aggregates, services, entities, value objects, events, commands, policies and glossary terms
- **Strategic View**: The home, domain, subdomain and context pages list declared and implied context relationships and consumptions; contexts show the subdomains they serve, their team, and a big-ball-of-mud badge
- **Tactical View**: Aggregate pages list commands, events, entities and value objects with their attributes, and invariants with what they constrain; context pages list policies with a flow map and the glossary
- **Diagnostics**: Loading a workspace runs `workspace.validate()`; the counts appear in the notification and the diagnostics on the home page link to the elements concerned

Pages are addressed by ref: `/domains/:domain`, `/domains/:domain/subdomains/:subdomain`, `/boundedcontexts/:context`, `/boundedcontexts/:context/aggregates/:aggregate` and `/boundedcontexts/:context/services/:service`.

Visit the ODS UI at https://open-ds.io/