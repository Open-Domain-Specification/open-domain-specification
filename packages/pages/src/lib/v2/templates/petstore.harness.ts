/**
 * The petstore element each tactical template is drawn against, chosen so the
 * story shows the template full rather than empty: the Pet aggregate has a
 * root, invariants with targets, internal and published consumables; Order
 * App both provides and consumes; ReservePet is the one operation carrying a
 * disposition and a comment; PetId is carried by eight consumables; and Pet is
 * the one glossary word two contexts both define.
 */
export const PETSTORE_REFS = {
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
