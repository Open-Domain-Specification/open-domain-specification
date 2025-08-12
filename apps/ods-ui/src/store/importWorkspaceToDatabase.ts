import { and, eq } from "drizzle-orm";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import {
	aggregateRef,
	boundedcontextRef,
	consumableRef,
	domainRef,
	entityRef,
	invariantRef,
	serviceRef,
	subdomainRef,
	valueObjectRef,
	type Workspace,
} from "open-domain-schema";
import {
	T_AGGREGATE,
	T_AGGREGATE_CONSUMER,
	T_BOUNDED_CONTEXT,
	T_CONSUMABLE,
	T_DOMAIN,
	T_ENTITY,
	T_ENTITY_RELATION,
	T_INVARIANT,
	T_SERVICE,
	T_SERVICE_CONSUMER,
	T_SUBDOMAIN,
} from "./schema.ts";

export function importWorkspaceToDatabase(
	workspace: Workspace,
	db: SQLJsDatabase,
) {
	for (const [domainId, domain] of Object.entries(workspace.domains)) {
		db.insert(T_DOMAIN)
			.values({
				ref: domainRef(domain.id).$ref,
				domainId,
				name: domain.name,
				description: domain.description,
				type: domain.type,
			})
			.get();

		for (const [subdomainId, subdomain] of Object.entries(domain.subdomains)) {
			db.insert(T_SUBDOMAIN)
				.values({
					ref: subdomainRef(domain.id, subdomain.id).$ref,
					name: subdomain.name,
					description: subdomain.description,
					domainId,
					subdomainId,
				})
				.get();

			for (const [boundedcontextId, boundedContext] of Object.entries(
				subdomain.boundedcontexts,
			)) {
				db.insert(T_BOUNDED_CONTEXT)
					.values({
						ref: boundedcontextRef(domain.id, subdomain.id, boundedContext.id)
							.$ref,
						domainId,
						subdomainId,
						boundedContextId: boundedcontextId,
						name: boundedContext.name,
						description: boundedContext.description,
					})
					.get();

				for (const [aggregateId, aggregate] of Object.entries(
					boundedContext.aggregates,
				)) {
					db.insert(T_AGGREGATE)
						.values({
							ref: aggregateRef(
								domain.id,
								subdomain.id,
								boundedContext.id,
								aggregate.id,
							).$ref,
							domainId,
							subdomainId,
							boundedContextId: boundedcontextId,
							aggregateId,
							name: aggregate.name,
							description: aggregate.description,
						})
						.get();

					for (const [entityId, entity] of Object.entries(aggregate.entities)) {
						db.insert(T_ENTITY)
							.values({
								ref: entityRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
									aggregate.id,
									entity.id,
								).$ref,
								domainId,
								subdomainId,
								boundedContextId: boundedcontextId,
								aggregateId,
								entityId,
								name: entity.name,
								description: entity.description,
								type: "entity",
								root: entity.root ? 1 : 0,
							})
							.get();
					}

					for (const [valueobjectId, valueObject] of Object.entries(
						aggregate.valueobjects,
					)) {
						db.insert(T_ENTITY)
							.values({
								ref: valueObjectRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
									aggregate.id,
									valueObject.id,
								).$ref,
								domainId,
								subdomainId,
								boundedContextId: boundedcontextId,
								aggregateId: aggregateId,
								entityId: valueobjectId,
								name: valueObject.name,
								description: valueObject.description,
								type: "value_object",
							})
							.get();
					}

					for (const [invariantId, invariant] of Object.entries(
						aggregate.invariants,
					)) {
						db.insert(T_INVARIANT)
							.values({
								ref: invariantRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
									aggregate.id,
									invariant.id,
								).$ref,
								domainId: domainId,
								subdomainId: subdomainId,
								boundedContextId: boundedcontextId,
								aggregateId,
								invariantId,
								name: invariant.name,
								description: invariant.description,
							})
							.get();
					}

					for (const [consumableId, consumable] of Object.entries(
						aggregate.provides,
					)) {
						db.insert(T_CONSUMABLE)
							.values({
								ref: consumableRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
									aggregate.id,
									consumable.id,
									"aggregate",
								).$ref,
								provider: aggregateRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
									aggregate.id,
								).$ref,
								domainId,
								subdomainId,
								boundedContextId: boundedcontextId,
								providerId: aggregateId,
								providerType: "aggregate",
								consumableId,
								name: consumable.name,
								description: consumable.description,
								type: consumable.type,
								pattern: consumable.pattern,
							})
							.get();
					}
				}

				for (const [serviceId, service] of Object.entries(
					boundedContext.services,
				)) {
					db.insert(T_SERVICE)
						.values({
							ref: serviceRef(
								domain.id,
								subdomain.id,
								boundedContext.id,
								service.id,
							).$ref,
							domainId,
							subdomainId,
							boundedContextId: boundedcontextId,
							serviceId,
							name: service.name,
							description: service.description,
							type: service.type,
						})
						.get();

					for (const [consumableId, consumable] of Object.entries(
						service.provides,
					)) {
						db.insert(T_CONSUMABLE)
							.values({
								ref: consumableRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
									service.id,
									consumable.id,
									"service",
								).$ref,
								domainId,
								subdomainId,
								boundedContextId: boundedcontextId,
								providerId: serviceId,
								providerType: "service",
								provider: serviceRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
									service.id,
								).$ref,
								consumableId,
								name: consumable.name,
								description: consumable.description,
								type: consumable.type,
								pattern: consumable.pattern,
							})
							.get();
					}
				}
			}
		}
	}

	// Handle entity relationships
	for (const [_domainId, domain] of Object.entries(workspace.domains)) {
		for (const [_subdomainId, subdomain] of Object.entries(domain.subdomains)) {
			for (const [_boundedcontextId, boundedContext] of Object.entries(
				subdomain.boundedcontexts,
			)) {
				for (const [_aggregateId, aggregate] of Object.entries(
					boundedContext.aggregates,
				)) {
					for (const [_entityId, entity] of Object.entries(
						aggregate.entities,
					)) {
						for (const relation of entity.relations) {
							const targetEntity = db
								.select({ ref: T_ENTITY.ref })
								.from(T_ENTITY)
								.where(eq(T_ENTITY.ref, relation.target.$ref))
								.get();

							if (!targetEntity) {
								console.warn(
									`Target entity ${relation.target} not found for relationship in ${entity.id}`,
								);
								continue;
							}

							const sourceEntity = db
								.select({ ref: T_ENTITY.ref })
								.from(T_ENTITY)
								.where(
									and(
										eq(T_ENTITY.domainId, domain.id),
										eq(T_ENTITY.subdomainId, subdomain.id),
										eq(T_ENTITY.boundedContextId, boundedContext.id),
										eq(T_ENTITY.aggregateId, aggregate.id),
										eq(T_ENTITY.entityId, entity.id),
									),
								)
								.get();

							if (!sourceEntity) {
								console.warn(
									`Source entity ${entity.id} not found for relationship in ${relation.target}`,
								);
								continue;
							}

							db.insert(T_ENTITY_RELATION)
								.values({
									source: sourceEntity.ref,
									target: targetEntity.ref,
									relation: relation.relation,
									label: relation.label || "",
								})
								.get();
						}
					}

					for (const [_entityId, entity] of Object.entries(
						aggregate.valueobjects,
					)) {
						for (const relation of entity.relations ?? []) {
							const targetEntity = db
								.select({ ref: T_ENTITY.ref })
								.from(T_ENTITY)
								.where(eq(T_ENTITY.ref, relation.target.$ref))
								.get();

							if (!targetEntity) {
								console.warn(
									`Target entity ${relation.target} not found for relationship in ${entity.id}`,
								);
								continue;
							}

							const sourceEntity = db
								.select({ ref: T_ENTITY.ref })
								.from(T_ENTITY)
								.where(
									and(
										eq(T_ENTITY.domainId, domain.id),
										eq(T_ENTITY.subdomainId, subdomain.id),
										eq(T_ENTITY.boundedContextId, boundedContext.id),
										eq(T_ENTITY.aggregateId, aggregate.id),
										eq(T_ENTITY.entityId, entity.id),
									),
								)
								.get();

							if (!sourceEntity) {
								console.warn(
									`Source entity ${entity.id} not found for relationship in ${relation.target}`,
								);
								continue;
							}

							db.insert(T_ENTITY_RELATION)
								.values({
									source: sourceEntity.ref,
									target: targetEntity.ref,
									relation: relation.relation,
									label: relation.label || "",
								})
								.get();
						}
					}
				}
			}
		}
	}

	// Handle consumption relationships
	for (const [_domainId, domain] of Object.entries(workspace.domains)) {
		for (const [_subdomainId, subdomain] of Object.entries(domain.subdomains)) {
			for (const [_boundedcontextId, boundedContext] of Object.entries(
				subdomain.boundedcontexts,
			)) {
				for (const [_aggregateId, aggregate] of Object.entries(
					boundedContext.aggregates,
				)) {
					for (const consumption of aggregate.consumes) {
						const consumable = db
							.select()
							.from(T_CONSUMABLE)
							.where(eq(T_CONSUMABLE.ref, consumption.consumable.$ref))
							.get();

						if (!consumable) {
							console.warn(
								`Consumable ${consumption.consumable} not found ${consumption.consumable.$ref}`,
							);
							continue;
						}

						const consumer = db
							.select()
							.from(T_AGGREGATE)
							.where(
								and(
									eq(T_AGGREGATE.domainId, domain.id),
									eq(T_AGGREGATE.subdomainId, subdomain.id),
									eq(T_AGGREGATE.boundedContextId, boundedContext.id),
									eq(T_AGGREGATE.aggregateId, aggregate.id),
								),
							)
							.get();

						if (!consumer) {
							console.warn(
								`Consumer aggregate ${aggregate.id} not found for consumption of ${consumption.consumable.$ref}`,
							);
							continue;
						}

						db.insert(T_AGGREGATE_CONSUMER)
							.values({
								aggregateRef: consumer.ref,
								aggregateBoundedcontextRef: boundedcontextRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
								).$ref,
								consumableRef: consumable.ref,
								consumableBoundedcontextRef: boundedcontextRef(
									consumable.domainId,
									consumable.subdomainId,
									consumable.boundedContextId,
								).$ref,
								pattern: consumption.pattern,
							})
							.get();
					}
				}

				for (const [_serviceId, service] of Object.entries(
					boundedContext.services,
				)) {
					for (const consumption of service.consumes) {
						const consumable = db
							.select()
							.from(T_CONSUMABLE)
							.where(eq(T_CONSUMABLE.ref, consumption.consumable.$ref))
							.get();

						if (!consumable) {
							console.warn(
								`Consumable ${consumption.consumable} not found ${consumption.consumable.$ref}`,
							);
							continue;
						}

						const consumer = db
							.select()
							.from(T_SERVICE)
							.where(
								and(
									eq(T_SERVICE.domainId, domain.id),
									eq(T_SERVICE.subdomainId, subdomain.id),
									eq(T_SERVICE.boundedContextId, boundedContext.id),
									eq(T_SERVICE.serviceId, service.id),
								),
							)
							.get();

						if (!consumer) {
							console.warn(
								`Consumer service ${service.id} not found for consumption of ${consumption.consumable.$ref}`,
							);
							continue;
						}

						db.insert(T_SERVICE_CONSUMER)
							.values({
								serviceRef: consumer.ref,
								serviceBoundedcontextRef: boundedcontextRef(
									domain.id,
									subdomain.id,
									boundedContext.id,
								).$ref,
								consumableRef: consumable.ref,
								consumableBoundedcontextRef: boundedcontextRef(
									consumable.domainId,
									consumable.subdomainId,
									consumable.boundedContextId,
								).$ref,
								pattern: consumption.pattern,
							})
							.get();
					}
				}
			}
		}
	}
}
