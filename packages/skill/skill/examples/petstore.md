# Patterns from the Petstore example

Excerpts from the ODS example workspace (`models/petstore/src/workspace.ts`
in the ODS repository). Each shows one pattern worth copying.

## A context serving two subdomains, and a legacy one

```ts
const inventoryBC = workspace.addBoundedContext("Inventory BC", {
	description: "Projection for /store/inventory (status→count)",
	subdomains: [inventorySD, catalogSD],
	team: petShopTeam,
});
const identityBC = usersSD.addBoundedcontext("Identity BC", {
	description: "Owns User aggregate & user endpoints. Legacy: user status is an untyped int",
	bigBallOfMud: true,
	team: platformTeam,
});
```

## Value objects declared on the context

A value object is part of the context's language, so it is declared once there
and any aggregate of the context may hold it. Only a `shared-kernel`
relationship lets a second context name it.

```ts
const petStatusVO = catalogBC.addValueObject("PetStatus", {
	description: "Where the pet is in its sales lifecycle",
});
petStatusVO.addAttribute("value", { type: "'available' | 'pending' | 'sold'" });
```

## Attributes backed by value objects, relations with cardinality, invariants on attributes

```ts
petRoot.addAttribute("id", { type: "int64", identity: true });
petRoot.addAttribute("status", { type: "PetStatus", valueobject: petStatusVO });
petRoot.uses(categoryVO, "categorized-as", "0..1");
petRoot.uses(photoUrlVO, "has-photo", "1..*");
petAgg
	.addInvariant("NameRequired", { description: "Pet.name must be non-empty" })
	.constrains(petRoot.attributes.get("name")!);
```

## A cross-aggregate reference by identity to the other root

Both aggregates are in Fulfilment BC. A relation may cross an aggregate, never a
bounded context.

```ts
shipmentRoot.references(carrierRoot, "shipped-by", "1");
```

## Another context reached by identity only, never by a relation

The order is in Sales and the pet is in Catalog, so the order stores the pet's
id and no relation. `identifies` says which root that id is of, so the
dependency stays structural: the relation map draws it as a dashed edge across
the boundary, and the consumable map carries the traffic behind it.

```ts
orderRoot.addAttribute("petId", {
	type: "int64",
	description: "Identity of the Pet root in Catalog; only the id crosses the boundary",
	identifies: petRoot,
});
```

## Published events with a payload schema, and an internal operation that raises one

```ts
const petStatusChangedSchema = catalogBC.addSchema("PetStatusChanged");
petStatusChangedSchema.addAttribute("petId", { type: "int64", identity: true });

const petStatusChanged = petAgg.provides("PetStatusChanged", {
	description: "Pet status changed (available|pending|sold)",
	type: "event",
	pattern: "published-language",
	schema: petStatusChangedSchema,
});
const _changePetStatus = petAgg
	.provides("ChangePetStatus", {
		description: "Move a pet between available, pending and sold",
		type: "operation",
		internal: true,
		schema: petStatusChangedSchema,
	})
	.raises(petStatusChanged);
```

## An open-host application service whose operations raise the aggregate's events

```ts
const petApp = catalogBC.addService("PetApp", {
	description: "Open-host service for /pet endpoints",
	type: "application",
});
const _addPetOp = petApp
	.provides("AddPet", {
		description: "POST /pet",
		type: "operation",
		pattern: "open-host-service",
		schema: registerPetSchema,
	})
	.raises(petRegistered);
```

## A consumption through an anti-corruption layer, and the relationship that explains it

```ts
orderApp.consumes(getPetSummaryOp, { pattern: "anti-corruption-layer" });

salesBC.downstreamOf(catalogBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Sales needs pet availability; Catalog commits to the summary contract",
});
```

## Separate ways, on purpose

```ts
identityBC.separateWaysFrom(salesBC, {
	description: "Orders are anonymous in Petstore v3; no integration by design",
});
```

## Worked reconciliation: the Catalog–Inventory shared kernel

The model says Catalog and Inventory share a kernel. Reconciling it
(`references/reconciliation.md`) means checking that claim against the repository and writing
down what is actually there.

**1. Take the intent off the worklist.** `intentsWithoutComments(workspace)` lists the shared
kernel: a relationship with no comments, so nobody has said what backs it.

**2. Search for what the pattern means.** A shared kernel is a shared package, library or schema
both sides depend on, small and jointly owned. So: which package do both services declare as a
dependency, and what is in it? The search finds `@petstore/kernel`, declared by both services,
holding `PetStatus` and its values — and, further down the same package, pricing rules that only
Catalog should own.

**3. Two findings, two comments.** The first says what is there and links to the code. The
second says what is there that should not be, and links to the decision record that already
says so.

**4. The code disagrees with the model, so propose a disposition.** The kernel has outgrown the
small jointly-owned subset a shared kernel is meant to be, and there is an ADR saying it should
become a Published Language from Catalog. Someone means to change it: `refactor`, not
`tolerated`. Propose it with the comments, say why in one sentence, and let the author decide.

```ts
catalogBC.sharesKernelWith(inventoryBC, {
	description: "PetStatus and its values are one shared definition",
	disposition: "refactor",
	comments: [
		{
			text: "PetStatus and its values live in @petstore/kernel and both services compile against it.",
			link: {
				kind: "code",
				url: "https://github.com/example/petstore/blob/main/packages/kernel/src/PetStatus.ts",
				label: "packages/kernel/src/PetStatus.ts",
			},
		},
		{
			text: "The kernel has grown past the status enum and now carries pricing rules; it should become a Published Language from Catalog.",
			link: {
				kind: "adr",
				url: "https://github.com/example/petstore/blob/main/docs/adr/014-shrink-the-kernel.md",
				label: "ADR-014 Shrink the kernel",
			},
		},
	],
});
```

The `type` stays `shared-kernel`. The intent layer records what the system is today; the
evidence layer records what is behind it and what should replace it. Changing the type would
lose the fact that a kernel is there.

## A policy reacting to events from two contexts

```ts
salesBC
	.addPolicy("Approve when pet available", {
		description: "When a pet becomes available and an order for it is placed, approve the order",
	})
	.on(petStatusChanged, orderPlaced)
	.then(approveOrder);
```

## Conformist consumptions feeding a projection

```ts
inventoryAgg.consumes(petStatusChanged, { pattern: "conformist" });
inventoryAgg.consumes(orderApproved, { pattern: "conformist" });
```

## Glossary terms embodied by model elements

```ts
catalogBC.addTerm("Category", {
	definition: "The kind of animal a pet is, such as Dogs or Cats",
	aliases: ["Species"],
	embodiedBy: categoryVO,
});
```
