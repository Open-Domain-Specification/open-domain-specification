import type { Aggregate, BoundedContext, Service } from "./workspace";

export type ODSNamespace = {
	id: string;
	name: string;
};

/**
 * The cluster path a bounded context is displayed under: workspace, then
 * the domain and subdomain of its primary subdomain when it has one.
 */
export function boundedContextNamespace(bc: BoundedContext): ODSNamespace[] {
	const namespace: ODSNamespace[] = [
		{ id: bc.workspace.id, name: bc.workspace.name },
	];
	const subdomain = bc.primarySubdomain;
	if (subdomain) {
		namespace.push(
			{ id: subdomain.domain.ref, name: subdomain.domain.name },
			{ id: subdomain.ref, name: subdomain.name },
		);
	}
	return namespace;
}

/**
 * {@link boundedContextNamespace} extended with the context itself, for a
 * service or aggregate that lives inside it.
 */
export function contextMemberNamespace(
	member: Aggregate | Service,
): ODSNamespace[] {
	return [
		...boundedContextNamespace(member.boundedcontext),
		{ id: member.boundedcontext.ref, name: member.boundedcontext.name },
	];
}

/** {@link contextMemberNamespace} extended with the aggregate itself. */
export function aggregateNamespace(aggregate: Aggregate): ODSNamespace[] {
	return [
		...contextMemberNamespace(aggregate),
		{ id: aggregate.ref, name: aggregate.name },
	];
}
