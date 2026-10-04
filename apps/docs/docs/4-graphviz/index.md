# ODS Graphviz

A TypeScript library for generating Graphviz visualizations from Open Domain Specification (ODS) maps. This package provides utilities to convert domain models into visual diagrams using Graphviz's DOT format and SVG rendering.

## Features

- **Context Map Visualization**: Generate visual representations of bounded context relationships and patterns
- **Consumable Map Visualization**: Visualize service consumption patterns and relationships
- **Relation Map Visualization**: Draw entities and value objects as a UML class diagram with attribute compartments, UML arrows and cardinalities, plus PlantUML source export
- **Flow Map Visualization**: Draw how policies react to event consumables by issuing operations, and what those operations raise
- **Multiple Output Formats**: Export diagrams as DOT format or SVG
- **Namespace Support**: Organize nodes into hierarchical namespaces with visual clustering
- **DDD Pattern Support**: Directed and symmetric context relationships, upstream and downstream roles, implied edges, big-ball-of-mud contexts and team ownership

## Installation

```bash
npm install @open-domain-specification/graphviz
```

## Usage

The Library provides several functions to convert ODS maps into Graphviz diagrams:

- **Context Map Visualization**: Convert a context map into a visual diagram showing bounded context relationships.
- **Consumable Map Visualization**: Visualize service consumption patterns and API relationships.
- **Relation Map Visualization**: Create entity relationship diagrams with typed relationships.
- **Flow Map Visualization**: Show the event → policy → command flow of a bounded context.

See the specific examples in the next pages.

## Over a set of workspaces

Every map is built from a workspace, a part of one, or from a whole `WorkspaceSet` (`ODSContextMap.fromSet(set)` and the same for the consumable, relation and flow maps). A node's id in a set is the element's identity across the set, its file and its local ref, so two contexts that are both `ledger` in different files are two nodes, and an edge joins the two it names. The context and consumable maps cluster nodes under the workspace they are in, then under the domain and subdomain, so two files read as two clusters with their own labels.

Where one map draws nodes of more than one workspace, a label says which when it would otherwise read the same: the clusters of a relation map lead with the workspace name (`Team A / Bank / Core / Ledger / Account`), and a flow map ends each node with `in <workspace>`. A map inside one workspace is labelled exactly as it always was. A workspace id that two files share is reported by `workspace-id-unique`; the context and consumable maps still draw their nodes apart, but the two files' workspace cluster is one.
