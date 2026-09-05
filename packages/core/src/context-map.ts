import { ODSConsumptionGraph } from "./consumption-graph";
import { identityCrossings } from "./identity-crossings";
import { boundedContextNamespace, type ODSNamespace } from "./namespace";
import type {
	ContextRelationshipType,
	DownstreamRole,
	UpstreamRole,
} from "./schema";
import { ScopeManager } from "./scope-manager";
import {
	BoundedContext,
	type Consumption,
	type ContextRelationship,
	type Domain,
	type Subdomain,
	type Workspace,
} from "./workspace";

function contextNode(bc: BoundedContext): ODSContextMapNode {
	return {
		id: bc.ref,
		name: bc.name,
		description: bc.description,
		namespace: boundedContextNamespace(bc),
		bigBallOfMud: bc.bigBallOfMud,
		team: bc.team && { id: bc.team.ref, name: bc.team.name },
	};
}

function pairKey(a: BoundedContext, b: BoundedContext): string {
	return [a.ref, b.ref].sort().join("|");
}

/**
 * The strategic map of bounded contexts in scope. Explicit relationships are
 * drawn as declared; where two contexts exchange consumables without a
 * declared relationship an *implied* upstream/downstream edge is drawn with
 * the roles collected from the consumables and consumptions involved.
 *
 * An identity attribute naming another context's entity is a dependency too —
 * decision 14 made it the only structural record of one — so a pair joined by
 * nothing else gets an implied edge for that as well, marked `identity` so a
 * reader can tell what put it there. It carries no roles: nothing is
 * exchanged, so neither end plays a part in an exchange.
 */
export class ODSContextMap {
	readonly nodes = new Map<string, ODSContextMapNode>();
	readonly edges = new Map<string, ODSContextMapEdge>();

	addNode(node: ODSContextMapNode) {
		const existingNode = this.nodes.get(node.id);
		if (existingNode) {
			return existingNode;
		}
		this.nodes.set(node.id, node);
		return node;
	}

	addEdge(edge: ODSContextMapEdge) {
		const id = `${edge.source.id}|${edge.target.id}|${edge.type}`;
		const existingEdge = this.edges.get(id);
		if (existingEdge) {
			return existingEdge;
		}
		this.edges.set(id, edge);
		return edge;
	}

	constructor(
		contexts: BoundedContext[],
		relationships: ContextRelationship[],
		consumptions: Consumption[],
	) {
		for (const bc of contexts) this.addNode(contextNode(bc));

		const declared = new Set<string>();
		for (const relationship of relationships) {
			declared.add(pairKey(relationship.source, relationship.target));
			this.addEdge({
				source: this.addNode(contextNode(relationship.source)),
				target: this.addNode(contextNode(relationship.target)),
				type: relationship.type,
				upstreamRoles: relationship.upstreamRoles,
				downstreamRoles: relationship.downstreamRoles,
				description: relationship.description,
				implied: false,
			});
		}

		for (const consumption of consumptions) {
			const upstream = consumption.consumable.provider.boundedcontext;
			const downstream = consumption.consumer.boundedcontext;
			if (
				upstream === downstream ||
				declared.has(pairKey(upstream, downstream))
			) {
				continue;
			}
			const edge = this.addEdge({
				source: this.addNode(contextNode(upstream)),
				target: this.addNode(contextNode(downstream)),
				type: "upstream-downstream",
				upstreamRoles: [],
				downstreamRoles: [],
				implied: "consumption",
			});
			addRole(edge.upstreamRoles, consumption.consumable.pattern);
			addRole(edge.downstreamRoles, consumption.pattern);
		}

		// Identities come last so a pair that already exchanges something keeps
		// the consumption edge, which says strictly more: the identity travels on
		// the traffic that edge stands for. The context holding the identity is
		// the downstream end — it is the one shaped by the other's model.
		for (const crossing of identityCrossings(contexts)) {
			if (declared.has(pairKey(crossing.from, crossing.to))) continue;
			this.addEdge({
				source: this.addNode(contextNode(crossing.to)),
				target: this.addNode(contextNode(crossing.from)),
				type: "upstream-downstream",
				upstreamRoles: [],
				downstreamRoles: [],
				implied: "identity",
			});
		}
	}

	private static fromScope(scope: ScopeManager, consumptions: Consumption[]) {
		const contexts = scope.scopes.filter(
			(it): it is BoundedContext => it instanceof BoundedContext,
		);
		const workspace = contexts[0]?.workspace;
		const relationships =
			workspace?.relationships.filter((it) =>
				contexts.some((bc) => it.involves(bc)),
			) ?? [];
		return new ODSContextMap(contexts, relationships, consumptions);
	}

	static fromWorkspace(workspace: Workspace) {
		return ODSContextMap.fromScope(
			ScopeManager.fromWorkspace(workspace),
			ODSConsumptionGraph.fromWorkspace(workspace).consumptions,
		);
	}

	static fromDomain(domain: Domain) {
		return ODSContextMap.fromScope(
			ScopeManager.fromDomain(domain),
			ODSConsumptionGraph.fromDomain(domain).consumptions,
		);
	}

	static fromSubdomain(subdomain: Subdomain) {
		return ODSContextMap.fromScope(
			ScopeManager.fromSubdomain(subdomain),
			ODSConsumptionGraph.fromSubdomain(subdomain).consumptions,
		);
	}

	static fromBoundedContext(boundedcontext: BoundedContext) {
		return ODSContextMap.fromScope(
			ScopeManager.fromBoundedContext(boundedcontext),
			ODSConsumptionGraph.fromBoundedContext(boundedcontext).consumptions,
		);
	}
}

function addRole<R>(roles: R[], role: R | undefined) {
	if (role !== undefined && !roles.includes(role)) roles.push(role);
}

/**
 * Why an undeclared edge is on the map: traffic between the two contexts, or
 * an identity in one naming an entity of the other.
 */
export type ImpliedBy = "consumption" | "identity";

export type ODSContextMapNamespace = ODSNamespace;

export type ODSContextMapNode = {
	id: string;
	name: string;
	description?: string;
	namespace: ODSContextMapNamespace[];
	bigBallOfMud?: boolean;
	team?: { id: string; name: string };
};

/**
 * For directed types `source` is upstream and `target` downstream; for
 * symmetric types the two ends are interchangeable.
 */
export type ODSContextMapEdge = {
	source: ODSContextMapNode;
	target: ODSContextMapNode;
	type: ContextRelationshipType;
	upstreamRoles: UpstreamRole[];
	downstreamRoles: DownstreamRole[];
	description?: string;
	/**
	 * What put the edge on the map when no relationship declares it, or `false`
	 * when one does. See {@link ImpliedBy}.
	 */
	implied: ImpliedBy | false;
};
