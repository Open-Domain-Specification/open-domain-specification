import type { Debugger } from "debug";
import { and, eq } from "drizzle-orm";
import type { SQLJsDatabase } from "drizzle-orm/sql-js";
import type * as ods from "open-domain-schema";
import type { Database } from "sql.js";
import { DEBUG } from "./debug.ts";
import {
	T_AGGREGATE,
	T_AGGREGATE_CONSUMER,
	T_BOUNDED_CONTEXT,
	T_CONSUMABLE,
	T_DOMAIN,
	T_INVARIANT,
	T_SERVICE,
	T_SERVICE_CONSUMER,
	T_SUBDOMAIN,
} from "./store/schema.ts";

export interface OnPageNavigable {
	htmlId: string;
	name: string;
}

export class Workspace {
	readonly debug: Debugger;

	readonly workspace: ods.Workspace;

	readonly sqlJsDatabase?: SQLJsDatabase;
	readonly database?: Database;

	constructor(
		workspace: ods.Workspace,
		db?: { sqlJsDatabase: SQLJsDatabase; database: Database },
	) {
		this.sqlJsDatabase = db?.sqlJsDatabase;
		this.database = db?.database;
		this.workspace = workspace;
		this.debug = DEBUG.extend(this.workspace.id);
	}

	getDomains() {
		return this.sqlJsDatabase?.select().from(T_DOMAIN).all();
	}

	findDomain(domainId: string) {
		return this.sqlJsDatabase
			?.select()
			.from(T_DOMAIN)
			.where(eq(T_DOMAIN.domainId, domainId))
			.get();
	}

	findSubdomainsByDomainId(domainId: string) {
		return this.sqlJsDatabase
			?.select()
			.from(T_SUBDOMAIN)
			.where(eq(T_SUBDOMAIN.domainId, domainId))
			.all();
	}

	findSubdomainByDomainIdAndSubdomainId(domainId: string, subdomainId: string) {
		return this.sqlJsDatabase
			?.select()
			.from(T_SUBDOMAIN)
			.where(
				and(
					eq(T_SUBDOMAIN.domainId, domainId),
					eq(T_SUBDOMAIN.subdomainId, subdomainId),
				),
			)
			.get();
	}

	findBoundedcontextsByDomainIdAndSubdomainId(
		domainId: string,
		subdomainId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_BOUNDED_CONTEXT)
			.where(
				and(
					eq(T_BOUNDED_CONTEXT.domainId, domainId),
					eq(T_BOUNDED_CONTEXT.subdomainId, subdomainId),
				),
			)
			.all();
	}

	findBoundedContextByDomainIdSubdomainIdAndBoundedContextId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_BOUNDED_CONTEXT)
			.where(
				and(
					eq(T_BOUNDED_CONTEXT.domainId, domainId),
					eq(T_BOUNDED_CONTEXT.subdomainId, subdomainId),
					eq(T_BOUNDED_CONTEXT.boundedContextId, boundedContextId),
				),
			)
			.get();
	}

	findAggregatesByDomainIdSubdomainIdAndBoundedContextId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_AGGREGATE)
			.where(
				and(
					eq(T_AGGREGATE.domainId, domainId),
					eq(T_AGGREGATE.subdomainId, subdomainId),
					eq(T_AGGREGATE.boundedContextId, boundedContextId),
				),
			)
			.all();
	}

	findAggregateByDomainIdSubdomainIdAndBoundedContextId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
		aggregateId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_AGGREGATE)
			.where(
				and(
					eq(T_AGGREGATE.domainId, domainId),
					eq(T_AGGREGATE.subdomainId, subdomainId),
					eq(T_AGGREGATE.boundedContextId, boundedContextId),
					eq(T_AGGREGATE.aggregateId, aggregateId),
				),
			)
			.get();
	}

	findServicesByDomainIdSubdomainIdAndBoundedContextId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_SERVICE)
			.where(
				and(
					eq(T_SERVICE.domainId, domainId),
					eq(T_SERVICE.subdomainId, subdomainId),
					eq(T_SERVICE.boundedContextId, boundedContextId),
				),
			)
			.all();
	}

	findServiceByDomainIdSubdomainIdAndBoundedContextIdAndServiceId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
		serviceId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_SERVICE)
			.where(
				and(
					eq(T_SERVICE.domainId, domainId),
					eq(T_SERVICE.subdomainId, subdomainId),
					eq(T_SERVICE.boundedContextId, boundedContextId),
					eq(T_SERVICE.serviceId, serviceId),
				),
			)
			.get();
	}

	findServiceConsumablesByDomainIdSubdomainIdAndBoundedContextIdAndServiceId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
		serviceId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_CONSUMABLE)
			.where(
				and(
					eq(T_CONSUMABLE.providerType, "service"),
					eq(T_CONSUMABLE.domainId, domainId),
					eq(T_CONSUMABLE.subdomainId, subdomainId),
					eq(T_CONSUMABLE.boundedContextId, boundedContextId),
					eq(T_CONSUMABLE.providerId, serviceId),
				),
			)
			.all();
	}

	findServiceConsumptionsByDomainIdSubdomainIdAndBoundedContextIdAndServiceId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
		serviceId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_SERVICE)
			.innerJoin(
				T_SERVICE_CONSUMER,
				eq(T_SERVICE_CONSUMER.serviceRef, T_SERVICE.ref),
			)
			.innerJoin(
				T_CONSUMABLE,
				eq(T_CONSUMABLE.ref, T_SERVICE_CONSUMER.consumableRef),
			)
			.where(
				and(
					eq(T_SERVICE.domainId, domainId),
					eq(T_SERVICE.subdomainId, subdomainId),
					eq(T_SERVICE.boundedContextId, boundedContextId),
					eq(T_SERVICE.serviceId, serviceId),
				),
			)
			.all();
	}

	findAggregateConsumablesByDomainIdSubdomainIdAndBoundedContextIdAndAggregateId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
		aggregateId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_CONSUMABLE)
			.where(
				and(
					eq(T_CONSUMABLE.providerType, "aggregate"),
					eq(T_CONSUMABLE.domainId, domainId),
					eq(T_CONSUMABLE.subdomainId, subdomainId),
					eq(T_CONSUMABLE.boundedContextId, boundedContextId),
					eq(T_CONSUMABLE.providerId, aggregateId),
				),
			)
			.all();
	}

	findAggregateConsumptionsByDomainIdSubdomainIdAndBoundedContextIdAndAggregateId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
		aggregateId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_AGGREGATE)
			.innerJoin(
				T_AGGREGATE_CONSUMER,
				eq(T_AGGREGATE_CONSUMER.aggregateRef, T_AGGREGATE.ref),
			)
			.innerJoin(
				T_CONSUMABLE,
				eq(T_CONSUMABLE.ref, T_AGGREGATE_CONSUMER.consumableRef),
			)
			.where(
				and(
					eq(T_AGGREGATE.domainId, domainId),
					eq(T_AGGREGATE.subdomainId, subdomainId),
					eq(T_AGGREGATE.boundedContextId, boundedContextId),
					eq(T_AGGREGATE.aggregateId, aggregateId),
				),
			)
			.all();
	}

	findAggregateInvariantsByDomainIdSubdomainIdAndBoundedContextIdAndAggregateId(
		domainId: string,
		subdomainId: string,
		boundedContextId: string,
		aggregateId: string,
	) {
		return this.sqlJsDatabase
			?.select()
			.from(T_INVARIANT)
			.where(
				and(
					eq(T_INVARIANT.domainId, domainId),
					eq(T_INVARIANT.subdomainId, subdomainId),
					eq(T_INVARIANT.boundedContextId, boundedContextId),
					eq(T_INVARIANT.aggregateId, aggregateId),
				),
			)
			.all();
	}

	findServiceByRef(serviceRef: string) {
		console.log(`Finding service by REF: ${serviceRef}`);
		return this.sqlJsDatabase
			?.select()
			.from(T_SERVICE)
			.where(eq(T_SERVICE.ref, serviceRef))
			.get();
	}

	findAggregateByRef(aggregateRef: string) {
		console.log(`Finding aggregate by REF: ${aggregateRef}`);
		return this.sqlJsDatabase
			?.select()
			.from(T_AGGREGATE)
			.where(eq(T_AGGREGATE.ref, aggregateRef))
			.get();
	}

	findConsumableByRef(consumableRef: string) {
		return this.sqlJsDatabase
			?.select()
			.from(T_CONSUMABLE)
			.where(eq(T_CONSUMABLE.ref, consumableRef))
			.get();
	}
}
