/**
 * The petstore route each template story is drawn against, chosen so the story
 * shows the template full rather than empty: the Pet aggregate has a root,
 * invariants with targets, internal and published consumables; Order App both
 * provides and consumes; PetApp's ReservePetForOrder is the one operation
 * carrying a disposition and a comment, and the one that names what it refuses
 * with; GetPetSummary is the one operation that declares
 * what it returns; PetId is carried by eight consumables; and Pet is
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
	valueobject: "#/boundedcontexts/catalog_bc/valueobjects/category",
	service: "#/boundedcontexts/sales_bc/services/order_app",
	// ReservePetForOrder is also the one operation that names what it refuses
	// with, so it is the only route whose Rejects with section draws, and it is
	// a front: it raises nothing of its own, so its Raises section is the
	// sentence naming what the chain reaches (card 77).
	operation:
		"#/boundedcontexts/catalog_bc/services/pet_app/provides/reserve_pet_for_order",
	// GetPetSummary is asked with one schema and answered with another, so its
	// Returns section draws beneath a Payload section that shows a different
	// shape.
	query:
		"#/boundedcontexts/catalog_bc/services/pet_app/provides/get_pet_summary",
	// FindPetsByStatus is the one operation whose answer is a list of a shape
	// rather than one of it, so it is the only route whose Returns section is
	// headed "Returns many" (decision 13, amended).
	manyQuery:
		"#/boundedcontexts/catalog_bc/services/pet_app/provides/find_pets_by_status",
	event:
		"#/boundedcontexts/catalog_bc/aggregates/pet/provides/pet_status_changed",
	schema: "#/boundedcontexts/catalog_bc/schemas/pet_id",
	// PetSummary is the one schema nothing sends: it exists only as an answer.
	returnedSchema: "#/boundedcontexts/catalog_bc/schemas/pet_summary",
	// PetUnavailable is the one schema that exists only as a refusal.
	rejectionSchema: "#/boundedcontexts/catalog_bc/schemas/pet_unavailable",
	policy: "#/boundedcontexts/fulfilment_bc/policies/plan_dispatch_on_approval",
	// Order fulfilment is the petstore's one process, and it fills every part
	// of the template: it starts on one event, waits on another context's, and
	// issues three operations before the delivery ends it.
	process: "#/boundedcontexts/sales_bc/processes/order_fulfilment",
	invariant:
		"#/boundedcontexts/sales_bc/aggregates/order/invariants/deliver_only_when_approved",
	// SoldNotReopen is the one transition rule: it names the entity the
	// transition belongs to and the operation that makes it, so it is the only
	// route whose Guarded by section draws.
	transitionInvariant:
		"#/boundedcontexts/catalog_bc/aggregates/pet/invariants/sold_not_reopen",
	// The operation that rule guards, and so the one consumable route whose
	// Invariants section draws.
	guardedOperation:
		"#/boundedcontexts/catalog_bc/aggregates/pet/provides/change_pet_status",
	term: "#/boundedcontexts/catalog_bc/glossary/pet",
	termWithAlias: "#/boundedcontexts/catalog_bc/glossary/category",
} as const;
