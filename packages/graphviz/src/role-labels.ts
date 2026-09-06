import type {
	ContextRelationshipType,
	DownstreamRole,
	ODSRelationMapNode,
	UpstreamRole,
} from "@open-domain-specification/core";

/** Short labels for the roles a context plays on an edge. */
export const UPSTREAM_ROLE_LABELS: Record<UpstreamRole, string> = {
	"open-host-service": "OHS",
	"published-language": "PL",
};

export const DOWNSTREAM_ROLE_LABELS: Record<DownstreamRole, string> = {
	conformist: "CF",
	"anti-corruption-layer": "ACL",
};

/** Stereotype drawn on a context-map edge. */
export const RELATIONSHIP_LABELS: Record<ContextRelationshipType, string> = {
	"upstream-downstream": "U/D",
	"customer-supplier": "C/S",
	partnership: "P",
	"shared-kernel": "SK",
	"separate-ways": "SW",
};

/**
 * The stereotype an edge implied by an identity carries instead of a
 * relationship type's. Such an edge is a dependency the model records with an
 * identity attribute and nothing else (decision 14), so `U/D` would over-claim:
 * there are no roles and no exchange, and what the reader wants to know is
 * where the dependency came from. It matches the `«identifies»` stereotype the
 * relation map already draws on the same fact.
 */
export const IDENTITY_EDGE_LABEL = "«id»";

/**
 * The stereotype a context nobody here owns carries on the context map: a card
 * scheme, a payment provider, a licensor. It reads as a UML stereotype for the
 * same reason `«id»` and `«identifies»` do -- it says what
 * kind of thing the box is, not what it is called (decision 28).
 */
export const EXTERNAL_STEREOTYPE = "«external system»";

/**
 * The stereotype a context of ours that nobody has interviewed yet carries on
 * the context map. It is not somebody else's system and not a mess: it is ours,
 * coherent as far as anyone knows, and modelled at its boundary only until the
 * interview happens, so the box says what the reader may expect to find behind
 * it — nothing yet (decision 28, sixth amendment).
 */
export const BOUNDARY_ONLY_STEREOTYPE = "«boundary only»";

/**
 * The stereotype a value object borrowed from another bounded context carries
 * on the relation map. The holder reaches it over a shared kernel or as a
 * conformist to an upstream, so the box is on this map as a dependency of ours
 * and not as a class of ours (decision 16, third amendment).
 */
export const BORROWED_STEREOTYPE = "borrowed value object";

/**
 * UML stereotype above a relation-map class name. A system nobody here owns
 * carries the same words on the relation map as on the context map: it is on
 * this map at all only because an identity attribute names it, and the box
 * has to say it is not one of ours (decision 28).
 *
 * A value object borrowed from another context says so for the same reason: it
 * is drawn among this aggregate's classes but belongs to the kernel or the
 * upstream whose cluster it sits in, and nobody here may change it (decision
 * 16, third amendment).
 */
export const STEREOTYPES: Record<ODSRelationMapNode["type"], string> = {
	entity_root: "root entity",
	entity: "entity",
	valueobject: "value object",
	foreign_valueobject: BORROWED_STEREOTYPE,
	external_context: "external system",
};
