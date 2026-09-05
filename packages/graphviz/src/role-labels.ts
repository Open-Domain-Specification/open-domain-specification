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

/** UML stereotype above a relation-map class name. */
export const STEREOTYPES: Record<ODSRelationMapNode["type"], string> = {
	entity_root: "root entity",
	entity: "entity",
	valueobject: "value object",
};
