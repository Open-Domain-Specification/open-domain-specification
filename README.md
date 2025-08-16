# Open Domain Specification (ODS)

Open Domain Specification is a **Domain-Driven Design (DDD)**-inspired specification and toolkit for describing business
domains in a structured, discoverable, and reusable way.

With ODS, you can:

- Model your domains, subdomains, bounded contexts, services, and aggregates in a machine-readable format.
- Share these models across teams.
- Render them visually for exploration and documentation.

## Ecosystem

| Package / App                             | Description                                                                      |
|-------------------------------------------|----------------------------------------------------------------------------------|
| **`@open-domain-specification/core`**     | The TypeScript DSL & model classes for building ODS workspaces programmatically. |
| **`@open-domain-specification/graphviz`** | A library for visualizing ODS workspaces as Graphviz diagrams.                   |
| **`@open-domain-specification/doc`**      | A library for generating Markdown documentation from ODS workspace files.        |
| **[`open-ds.io`](https://open-ds.io)**    | A React + Vite web app for interactive browsing of ODS workspaces.               |

## Quickstart

### Install

Install ODS Core

```bash
npm install @open-domain-specification/core
```

Make a new ODS workspace

```ts
import { Workspace } from "@open-domain-specification/core";

export const workspace = new Workspace("eShop", {
  odsVersion: "0.0.0",
  homepage: "https://eshop.com",
  logoUrl: "https://cdn-icons-png.flaticon.com/512/1162/1162456.png",
  primaryColor: "#0F68BD",
  description:
          "Workspace for the eShop example, demonstrating the Open Domain Specification.",
  version: "1.0.0",
});

```

Compile the workspace to a JSON file

```ts
import {writeFileSync} from "fs";

writeFileSync("workspace.json", JSON.stringify(ws.toSchema(), null, 2));
```

### Explore

Open the workspace in the ODS web app by visiting [open-ds.io](https://open-ds.io) and uploading the `workspace.json`
file.

Alternatively, you can use the `@open-domain-specification/doc` package to generate Markdown documentation from your
workspace and view it in your favorite Markdown viewer or host as an internal site using Docusaurus, Docsify, or similar.

### Resources

- [Full Documentation](https://docs.open-ds.io/)
- [Domain-Driven Design (DDD)](https://www.domainlanguage.com/ddd/)

---

## Why DDD Instead of C4

The **C4 model** is great for showing how software is implemented — systems, containers, components, and code. But it’s
an **implementation view**:

* It reflects the “how” which can change rapidly as technology evolves.
* It’s mainly useful for technical stakeholders.
* It offers little-shared vocabulary for the business itself.

**Domain-Driven Design** — and by extension **Open Domain Specification** — starts from a different place:

* It focuses on the **language and concepts of the business domain**, not the current tech stack.
* It models *what* the business does and how concepts relate, providing a **shared vocabulary** between business and
  technical teams.
* It remains valuable even as implementation details change, because the domain language persists.

**In short:**
C4 documents the **solution’s structure** for engineers.
ODS documents the **problem space** and shared understanding for everyone.

### The Importance of Abstraction

The value of a map is in what it leaves out. C4 maps the implementation in detail, this is harder for non-technical
audiences to follow. ODS keeps the signal, drops the noise, and speaks in the language of the domain.

Reality is messy. Trying to capture it all in a model makes it unstable and overwhelming. ODS uses intentional
abstraction to create a stable map of the domain — one that stays relevant even when the implementation shifts.