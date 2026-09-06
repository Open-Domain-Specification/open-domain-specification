# Reconciliation

A model is a claim about a real system. Reconciliation is checking the claim: for each strategic
intent, go and look in the repository for the evidence behind it, then write down what is
actually there. The result is `comments` on the intent — grounded statements, each backed by a
link — and, where the code disagrees with the model, a proposed `disposition`.

Strategic intents are the three things evidence hangs off: a **relationship** between two
contexts, a **consumable** that crosses a boundary, and a **consumption** of one. Internal
consumables never cross a boundary, so they are not strategic and are never reconciled.

## When to reconcile

- The user asks: "check the model against the code", "is the ACL actually there", "reconcile".
- After the interview, for the intents just created, if the codebase is at hand.
- On opening a workspace whose intents carry no comments: offer it, once, and let the user
  choose. Do not start a reconciliation nobody asked for.

The worklist is every intent with no comments — the "No comments" list on the health report,
and `intentsWithoutComments(workspace)` in the DSL. Work it in the order the report shows and
stop when the user says enough.

## What to look for, per pattern

The pattern names the thing that should exist. Search for that thing, in the code of the side
that owns it. Terms below are starting points, not a script: read the repository's own
vocabulary first and search in it.

| Pattern | Owned by | What should exist | Where to look |
|---|---|---|---|
| `anti-corruption-layer` | downstream | An adapter or translator on the downstream side: a mapper between the upstream payload and the downstream model, so no upstream type reaches the domain | The downstream context's code. Names like `adapter`, `translator`, `mapper`, `acl`, `client`, `gateway`; a function taking an upstream DTO and returning a domain type |
| `conformist` | downstream | Direct use of the upstream types: the upstream's own classes, DTOs or generated client, imported into the downstream domain, with no mapping | Imports in the downstream context from the upstream package, module or generated client |
| `open-host-service` | upstream | A published contract: an OpenAPI, GraphQL, gRPC or AsyncAPI document that others build against, versioned and documented | The upstream context's repository root and its `docs/`, `api/`, `contracts/`, `proto/` folders; a published API reference |
| `published-language` | upstream | A shared interchange format independent of either side: a JSON Schema, Protobuf, Avro or industry format the events are emitted in | A schema registry, a `schemas/` or `proto/` folder, a package holding only message definitions |
| `shared-kernel` | both | A shared package, library or schema both sides depend on, small and jointly owned | A workspace package both contexts declare as a dependency; a shared database schema or migration folder |
| `partnership` | both | Joint planning and release: one pipeline, one release cadence, or features that land in both at once | Release workflows, a shared changelog, commits that touch both sides together |
| `customer-supplier` | upstream | The downstream's requirements visible on the upstream side: contract tests, a consumer-driven test suite, downstream tickets in the upstream backlog | Contract test folders (`pact`, `contract`, `consumer`), the upstream's issue references |
| `upstream-downstream` | downstream | A directed dependency, and nothing on the upstream side that plans for the downstream | The downstream's dependency on the upstream, and the absence of the customer-supplier evidence above |
| `separate-ways` | neither | Nothing: no dependency, no shared package, no calls between the two | Search for the dependency and report that there is none. Finding one is the interesting result |

## The three outcomes

Every intent you look at ends in exactly one of these. Write a comment in all three cases; a
reconciliation that says nothing is worse than one that says "I looked and found nothing".

**It is there.** Write one comment saying what you found and where, with a link to it. Leave the
disposition alone; an absent disposition already means `by-design`.

**It is not what the model says.** Write one comment saying what is there instead, with a link,
and propose a disposition:

- `tolerated` — the code disagrees with the pattern, the reason is understood, and nobody plans
  to change it. A compromise someone is living with.
- `refactor` — the intent should be removed or replaced, and someone means to do it. Say in the
  comment what it should become.

Propose, never apply. The disposition is the author's judgement about their own architecture:
show the comment and the disposition you would set, say why in one sentence, and wait.

**You cannot tell.** Write one comment naming what you searched for and where, and propose no
disposition. Then ask the user where it lives. "No adapter or translator found in the Sales
context; searched for a mapper between the Catalog pet payload and Sales' own types" is useful
evidence. A guess is not.

## Writing the comment

A comment is `{ text, link? }`. The text is one or two sentences, in the present tense, saying
what is in the system — not what you did, and not what the pattern means in general. The link is
`{ kind, url, label? }` with `kind` one of `code`, `contract`, `adr`, `runbook`, `dashboard`.

- Cite what you actually opened. A path or a URL, never a guess at where a file probably is.
- One statement per comment. Two findings are two comments; the report lists them separately.
- `label` is what a reader should see instead of the URL: the repo-relative path, the endpoint,
  the ADR's title.
- Use the repository's own words for its own parts, and the model's words for the model's.
- Never delete or rewrite a comment an author wrote. Add yours next to it.
- A comment with no link is still evidence when there is nothing to link to; a link you cannot
  justify is not.

In the DSL, `comments` and `disposition` go in the options of `upstreamOf`, `downstreamOf`,
`partnerOf`, `sharesKernelWith`, `separateWaysFrom`, `provides` and `consumes`:

```ts
salesBC.downstreamOf(catalogBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Sales needs pet availability; Catalog commits to the summary contract",
	disposition: "tolerated",
	comments: [
		{
			text: "Sales calls the Catalog summary endpoint directly from its order service; there is no translator, so the Catalog pet payload reaches the Sales domain unchanged.",
			link: {
				kind: "code",
				url: "https://github.com/example/petstore/blob/main/sales/src/orders/service.ts",
				label: "sales/src/orders/service.ts",
			},
		},
	],
});
```

In JSON, both are optional fields on the relationship, the consumable and the consumption:

```json
{
  "relationships": [
    {
      "upstream": { "$ref": "#/boundedcontexts/catalog" },
      "downstream": { "$ref": "#/boundedcontexts/sales" },
      "type": "customer-supplier",
      "upstreamRoles": ["open-host-service"],
      "downstreamRoles": ["anti-corruption-layer"],
      "description": "Sales needs pet availability; Catalog commits to the summary contract",
      "disposition": "tolerated",
      "comments": [
        {
          "text": "Sales calls the Catalog summary endpoint directly from its order service; there is no translator, so the Catalog pet payload reaches the Sales domain unchanged.",
          "link": {
            "kind": "code",
            "url": "https://github.com/example/petstore/blob/main/sales/src/orders/service.ts",
            "label": "sales/src/orders/service.ts"
          }
        }
      ]
    }
  ]
}
```

A consumable carries the same two fields beside its `pattern`, and so does a consumption:

```json
"provides": {
  "get_pet_summary": {
    "name": "GetPetSummary",
    "description": "GET /pets/{id}/summary",
    "type": "operation",
    "pattern": "open-host-service",
    "comments": [
      {
        "text": "The summary endpoint is in the published Catalog OpenAPI document and is versioned with the rest of the API.",
        "link": {
          "kind": "contract",
          "url": "https://github.com/example/petstore/blob/main/catalog/openapi.yaml",
          "label": "GET /pets/{id}/summary"
        }
      }
    ]
  }
}
```

```json
"consumes": [
  {
    "consumable": {
      "$ref": "#/boundedcontexts/catalog/services/pet_app/provides/get_pet_summary"
    },
    "pattern": "anti-corruption-layer",
    "disposition": "refactor",
    "comments": [
      {
        "text": "No adapter or translator found in Sales; searched the order service and its client folder for a mapper between the Catalog pet payload and the Sales order model.",
        "link": {
          "kind": "code",
          "url": "https://github.com/example/petstore/tree/main/sales/src/orders",
          "label": "sales/src/orders"
        }
      }
    ]
  }
]
```

`by-design` is the meaning of an absent `disposition` and is never written to the file. Writing
`"disposition": "by-design"` is the same as leaving it out; leave it out.

## Reporting back

When the pass is done, summarise in the user's words, not in DDD words: how many intents you
looked at, how many now have evidence, which ones you would mark `tolerated` or `refactor` and
why, and which ones you could not resolve and need them to answer. Then validate: the health
report and the opt-in `comments-required` rule both read what you just wrote.
