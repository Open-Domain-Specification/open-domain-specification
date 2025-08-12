import { and, eq, inArray } from "drizzle-orm";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import { ContextMap } from "../lib/diagrams/context-map.ts";
import {
	T_AGGREGATE,
	T_BOUNDED_CONTEXT,
	T_CONSUMABLE,
	T_DOMAIN,
	T_SERVICE,
	T_SERVICE_CONSUMER,
	T_SUBDOMAIN,
} from "../store/schema.ts";

export function subdomainContextMap(
	db: SQLJsDatabase,
	domainId: string,
	subdomainId: string,
): ContextMap {
	const cm = new ContextMap();

	const subdomain = db
		.select()
		.from(T_SUBDOMAIN)
		.where(
			and(
				eq(T_SUBDOMAIN.domainId, domainId),
				eq(T_SUBDOMAIN.subdomainId, subdomainId),
			),
		)
		.get();

	if (!subdomain) {
		throw new Error(`Subdomain ${domainId}:${subdomainId} not found`);
	}

	const myConsumables = db
		.select()
		.from(T_CONSUMABLE)
		.where(
			and(
				eq(T_CONSUMABLE.domainId, subdomain.domainId),
				eq(T_CONSUMABLE.subdomainId, subdomain.subdomainId),
			),
		)
		.innerJoin(T_DOMAIN, eq(T_DOMAIN.domainId, T_CONSUMABLE.domainId))
		.innerJoin(
			T_SUBDOMAIN,
			eq(T_SUBDOMAIN.subdomainId, T_CONSUMABLE.subdomainId),
		)
		.innerJoin(
			T_BOUNDED_CONTEXT,
			eq(T_BOUNDED_CONTEXT.boundedContextId, T_CONSUMABLE.boundedContextId),
		)
		.all();

	for (const consumable of myConsumables) {
		const bc = cm.addBoundedContext(
			consumable.bounded_context.ref,
			consumable.bounded_context.name,
			[consumable.domain.name, consumable.subdomain.name],
		);

		const provider =
			consumable.consumable.providerType === "service"
				? db
						.select()
						.from(T_SERVICE)
						.innerJoin(T_DOMAIN, eq(T_SERVICE.domainId, T_DOMAIN.domainId))
						.innerJoin(
							T_SUBDOMAIN,
							and(
								eq(T_SERVICE.domainId, T_SUBDOMAIN.domainId),
								eq(T_SERVICE.subdomainId, T_SUBDOMAIN.subdomainId),
							),
						)
						.innerJoin(
							T_BOUNDED_CONTEXT,
							and(
								eq(T_SERVICE.domainId, T_BOUNDED_CONTEXT.domainId),
								eq(T_SERVICE.subdomainId, T_BOUNDED_CONTEXT.subdomainId),
								eq(
									T_SERVICE.boundedContextId,
									T_BOUNDED_CONTEXT.boundedContextId,
								),
							),
						)
						.where(eq(T_SERVICE.ref, consumable.consumable.provider))
						.get()
				: db
						.select()
						.from(T_AGGREGATE)
						.innerJoin(T_DOMAIN, eq(T_AGGREGATE.domainId, T_DOMAIN.domainId))
						.innerJoin(
							T_SUBDOMAIN,
							and(
								eq(T_AGGREGATE.domainId, T_SUBDOMAIN.domainId),
								eq(T_AGGREGATE.subdomainId, T_SUBDOMAIN.subdomainId),
							),
						)
						.innerJoin(
							T_BOUNDED_CONTEXT,
							and(
								eq(T_AGGREGATE.domainId, T_BOUNDED_CONTEXT.domainId),
								eq(T_AGGREGATE.subdomainId, T_BOUNDED_CONTEXT.subdomainId),
								eq(
									T_AGGREGATE.boundedContextId,
									T_BOUNDED_CONTEXT.boundedContextId,
								),
							),
						)
						.where(eq(T_AGGREGATE.ref, consumable.consumable.provider))
						.get();

		if (!provider) {
			throw new Error(
				`Provider not found for consumable: ${consumable.consumable.ref}`,
			);
		}

		cm.addConsumable(
			consumable.consumable.ref,
			consumable.consumable.name,
			consumable.consumable.pattern,
			[
				provider.domain.name,
				provider.subdomain.name,
				provider.bounded_context.name,
			],
			bc,
		);
	}

	const myConsumableRefs = myConsumables.map(
		(consumable) => consumable.consumable.ref,
	);

	const consumptions = db
		.select()
		.from(T_SERVICE_CONSUMER)
		.where(inArray(T_SERVICE_CONSUMER.consumableRef, myConsumableRefs))
		.all();

	for (const consumption of consumptions) {
		const consumerContext = cm.getBoundedContext(
			consumption.serviceBoundedcontextRef,
		);
		const consumable = cm.getConsumable(consumption.consumableRef);
		cm.addRelationship(consumerContext, consumable, consumption.pattern);
	}

	return cm;
}
