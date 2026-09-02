import type {
	DownstreamRole,
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
