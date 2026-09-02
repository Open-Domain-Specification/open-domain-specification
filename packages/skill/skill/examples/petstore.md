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

```ts
orderRoot.references(petRoot, "for-pet", "1");
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
identityBC.separateWaysFrom(
	salesBC,
	"Orders are anonymous in Petstore v3; no integration by design",
);
```

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
