import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import { ERD } from "../lib/diagrams/erd.ts";
import type { EntityProps } from "../lib/diagrams/mermaid/erdToMermaid.ts";
import { erdToMermaidFlowchart } from "../lib/diagrams/mermaid/erdToMermaidFlowchart.ts";
import {
	T_AGGREGATE,
	T_BOUNDED_CONTEXT,
	T_DOMAIN,
	T_ENTITY,
	T_ENTITY_RELATION,
	T_SUBDOMAIN,
} from "../store/schema.ts";

export function aggregateToMermaid(
	db: SQLJsDatabase,
	aggregate: string,
): string {
	const entities = db
		.select({
			ref: T_ENTITY.ref,
			name: T_ENTITY.name,
			type: T_ENTITY.type,
			root: T_ENTITY.root,
			domainId: T_ENTITY.domainId,
			subdomainId: T_ENTITY.subdomainId,
			boundedContextId: T_ENTITY.boundedContextId,
			aggregateId: T_ENTITY.aggregateId,
			entityId: T_ENTITY.entityId,
			domainName: T_DOMAIN.name,
			subdomainName: T_SUBDOMAIN.name,
			boundedContextName: T_BOUNDED_CONTEXT.name,
			aggregateName: T_AGGREGATE.name,
		})
		.from(T_ENTITY)
		.innerJoin(T_DOMAIN, eq(T_ENTITY.domainId, T_DOMAIN.domainId))
		.innerJoin(T_SUBDOMAIN, eq(T_ENTITY.subdomainId, T_SUBDOMAIN.subdomainId))
		.innerJoin(
			T_BOUNDED_CONTEXT,
			eq(T_ENTITY.boundedContextId, T_BOUNDED_CONTEXT.boundedContextId),
		)
		.innerJoin(T_AGGREGATE, eq(T_ENTITY.aggregateId, T_AGGREGATE.aggregateId))
		.where(eq(T_ENTITY.aggregateId, aggregate))
		.all();

	const erd = new ERD<EntityProps>();

	for (const entity of entities) {
		if (entity.type === "entity") {
			erd.addEntity(entity.ref, entity.name, {
				root: entity.root > 0,
				type: "entity",
				key: `${entity.domainId}__${entity.subdomainId}__${entity.boundedContextId}__${entity.aggregateId}__${entity.entityId}`,
				namespace: [
					entity.domainName,
					entity.subdomainName,
					entity.boundedContextName,
					entity.aggregateName,
				],
			});
		} else {
			erd.addEntity(entity.ref, entity.name, {
				root: false,
				type: "value_object",
				key: `${entity.domainId}__${entity.subdomainId}__${entity.boundedContextId}__${entity.aggregateId}__${entity.entityId}`,
				namespace: [
					entity.domainName,
					entity.subdomainName,
					entity.boundedContextName,
					entity.aggregateName,
				],
			});
		}
	}

	const aggregateRelations = db
		.select({
			source: T_ENTITY_RELATION.source,
			target: T_ENTITY_RELATION.target,
			relation: T_ENTITY_RELATION.relation,
			label: T_ENTITY_RELATION.label,
		})
		.from(T_ENTITY_RELATION)
		.where(inArray(T_ENTITY_RELATION.source, erd.getEntityIds()))
		.all();

	const allRefs = aggregateRelations.flatMap((it) => [it.source, it.target]);

	const additionalEntities = db
		.select({
			ref: T_ENTITY.ref,
			name: T_ENTITY.name,
			type: T_ENTITY.type,
			root: T_ENTITY.root,
			domainId: T_ENTITY.domainId,
			subdomainId: T_ENTITY.subdomainId,
			boundedContextId: T_ENTITY.boundedContextId,
			aggregateId: T_ENTITY.aggregateId,
			entityId: T_ENTITY.entityId,
			domainName: T_DOMAIN.name,
			subdomainName: T_SUBDOMAIN.name,
			boundedContextName: T_BOUNDED_CONTEXT.name,
			aggregateName: T_AGGREGATE.name,
		})
		.from(T_ENTITY)
		.innerJoin(T_DOMAIN, eq(T_ENTITY.domainId, T_DOMAIN.domainId))
		.innerJoin(
			T_SUBDOMAIN,
			and(
				eq(T_ENTITY.domainId, T_SUBDOMAIN.domainId),
				eq(T_ENTITY.subdomainId, T_SUBDOMAIN.subdomainId),
			),
		)
		.innerJoin(
			T_BOUNDED_CONTEXT,
			and(
				eq(T_ENTITY.domainId, T_BOUNDED_CONTEXT.domainId),
				eq(T_ENTITY.subdomainId, T_BOUNDED_CONTEXT.subdomainId),
				eq(T_ENTITY.boundedContextId, T_BOUNDED_CONTEXT.boundedContextId),
			),
		)
		.innerJoin(T_AGGREGATE, eq(T_ENTITY.aggregateId, T_AGGREGATE.aggregateId))
		.where(
			and(
				inArray(T_ENTITY.ref, allRefs),
				notInArray(T_ENTITY.ref, erd.getEntityIds()),
			),
		)
		.all();

	for (const entity of additionalEntities) {
		if (entity.type === "entity") {
			erd.addEntity(entity.ref, entity.name, {
				root: entity.root > 0,
				type: "entity",
				key: `${entity.domainId}__${entity.subdomainId}__${entity.boundedContextId}__${entity.aggregateId}__${entity.entityId}`,
				namespace: [
					entity.domainName,
					entity.subdomainName,
					entity.boundedContextName,
					entity.aggregateName,
				],
			});
		} else {
			erd.addEntity(entity.ref, entity.name, {
				root: false,
				type: "value_object",
				key: `${entity.domainId}__${entity.subdomainId}__${entity.boundedContextId}__${entity.aggregateId}__${entity.entityId}`,
				namespace: [
					entity.domainName,
					entity.subdomainName,
					entity.boundedContextName,
					entity.aggregateName,
				],
			});
		}
	}

	for (const relation of aggregateRelations) {
		const sourceEntity = erd.getEntity(relation.source);
		const targetEntity = erd.getEntity(relation.target);
		erd.addRelation(
			sourceEntity,
			targetEntity,
			relation.relation,
			relation.label || "",
			{},
		);
	}

	let mermaid = erdToMermaidFlowchart(erd);

	for (const entity of erd.entities) {
		mermaid = mermaid.replaceAll(entity.id, entity.props.key);
	}

	return mermaid;
}
