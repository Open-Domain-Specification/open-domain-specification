/**
 * The petstore route each template story is drawn against, chosen so the story
 * shows the template full rather than empty: the Pet aggregate has a root,
 * invariants with targets, internal and published consumables; Order App both
 * provides and consumes; ReservePet is the one operation carrying a
 * disposition and a comment; PetId is carried by eight consumables; and Pet is
 * the one glossary word two contexts both define.
 *
 * Sales is the context every evidence surface uses: it is the one context that
 * touches all four others, so its strategic position fills each of the three
 * groups at once. The shared kernel between Catalog and Inventory is the one
 * relationship the petstore marks for refactoring, so its page shows a
 * disposition. Everything else is the first of its kind, which in the petstore
 * is the richest one.
 *
 * A story renders these through `lib/Page.harness.svelte`, so it draws the
 * page the shipped route table draws and cannot drift from it.
 */
export const PETSTORE_REFS = {
	workspace: "#",
	health: "#/health",
	domain: "#/domains/petstore_commerce",
	subdomain: "#/domains/petstore_commerce/subdomains/catalog",
	context: "#/boundedcontexts/sales_bc",
	relationship: "#/relationships/catalog_bc~shared-kernel~inventory_bc",
	team: "#/teams/pet_shop_team",
	aggregate: "#/boundedcontexts/catalog_bc/aggregates/pet",
	entity: "#/boundedcontexts/catalog_bc/aggregates/pet/entities/pet",
	valueobject:
		"#/boundedcontexts/catalog_bc/aggregates/pet/valueobjects/category",
	service: "#/boundedcontexts/sales_bc/services/order_app",
	operation: "#/boundedcontexts/catalog_bc/aggregates/pet/provides/reserve_pet",
	event:
		"#/boundedcontexts/catalog_bc/aggregates/pet/provides/pet_status_changed",
	schema: "#/boundedcontexts/catalog_bc/schemas/pet_id",
	policy: "#/boundedcontexts/sales_bc/policies/approve_when_pet_available",
	invariant:
		"#/boundedcontexts/sales_bc/aggregates/order/invariants/deliver_only_when_approved",
	term: "#/boundedcontexts/catalog_bc/glossary/pet",
	termWithAlias: "#/boundedcontexts/catalog_bc/glossary/category",
} as const;
