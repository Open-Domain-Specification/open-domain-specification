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

/** UML stereotype above a relation-map class name. */
export const STEREOTYPES: Record<ODSRelationMapNode["type"], string> = {
	entity_root: "root entity",
	entity: "entity",
	valueobject: "value object",
};
