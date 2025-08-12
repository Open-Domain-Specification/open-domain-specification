import {
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";
import type {
	ConsumablePattern,
	ConsumableType,
	ConsumptionPattern,
	DomainType,
	EntityRelationType,
	ServiceType,
} from "open-domain-schema";

export const T_DOMAIN = sqliteTable("domain", {
	ref: text("ref").primaryKey(),
	domainId: text("id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	type: text("type").notNull().$type<DomainType>(),
});

export const T_SUBDOMAIN = sqliteTable("subdomain", {
	ref: text("ref").primaryKey(),
	domainId: text("domain_id")
		.notNull()
		.references(() => T_DOMAIN.domainId, { onDelete: "cascade" }),
	subdomainId: text("id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
});

export const T_BOUNDED_CONTEXT = sqliteTable("bounded_context", {
	ref: text("ref").primaryKey(),
	domainId: text("domain_id")
		.notNull()
		.references(() => T_DOMAIN.domainId, { onDelete: "cascade" }),
	subdomainId: text("subdomain_id")
		.notNull()
		.references(() => T_SUBDOMAIN.subdomainId, { onDelete: "cascade" }),
	boundedContextId: text("bounded_context_id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
});

export const T_AGGREGATE = sqliteTable("aggregate", {
	ref: text("ref").primaryKey(),
	domainId: text("domain_id")
		.notNull()
		.references(() => T_DOMAIN.domainId, { onDelete: "cascade" }),
	subdomainId: text("subdomain_id")
		.notNull()
		.references(() => T_SUBDOMAIN.subdomainId, { onDelete: "cascade" }),
	boundedContextId: text("bounded_context_id")
		.notNull()
		.references(() => T_BOUNDED_CONTEXT.boundedContextId, {
			onDelete: "cascade",
		}),
	aggregateId: text("id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
});

export const T_SERVICE = sqliteTable("service", {
	ref: text("ref").primaryKey(),
	domainId: text("domain_id")
		.notNull()
		.references(() => T_DOMAIN.domainId, { onDelete: "cascade" }),
	subdomainId: text("subdomain_id")
		.notNull()
		.references(() => T_SUBDOMAIN.subdomainId, { onDelete: "cascade" }),
	boundedContextId: text("bounded_context_id")
		.notNull()
		.references(() => T_BOUNDED_CONTEXT.boundedContextId, {
			onDelete: "cascade",
		}),
	serviceId: text("id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	type: text("type").$type<ServiceType>().notNull(),
});

export const T_ENTITY = sqliteTable("entity", {
	ref: text("ref").primaryKey(),
	domainId: text("domain_id")
		.notNull()
		.references(() => T_DOMAIN.domainId, { onDelete: "cascade" }),
	subdomainId: text("subdomain_id")
		.notNull()
		.references(() => T_SUBDOMAIN.subdomainId, { onDelete: "cascade" }),
	boundedContextId: text("bounded_context_id")
		.notNull()
		.references(() => T_BOUNDED_CONTEXT.boundedContextId, {
			onDelete: "cascade",
		}),
	aggregateId: text("aggregate_id")
		.notNull()
		.references(() => T_AGGREGATE.aggregateId, { onDelete: "cascade" }),
	entityId: text("id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	root: integer("root").notNull().default(0),
	type: text("type").$type<"entity" | "value_object">(),
});

export const T_ENTITY_RELATION = sqliteTable(
	"entity_relation",
	{
		source: text("source")
			.notNull()
			.references(() => T_ENTITY.ref, { onDelete: "cascade" }),
		target: text("target")
			.notNull()
			.references(() => T_ENTITY.ref, { onDelete: "cascade" }),
		relation: text().$type<EntityRelationType>().notNull(),
		label: text("label").notNull(),
	},
	(self) => {
		return [
			primaryKey({
				columns: [self.source, self.target, self.relation, self.label],
			}),
		];
	},
);

export const T_INVARIANT = sqliteTable("invariant", {
	ref: text("ref").primaryKey(),
	domainId: text("domain_id")
		.notNull()
		.references(() => T_DOMAIN.domainId, { onDelete: "cascade" }),
	subdomainId: text("subdomain_id")
		.notNull()
		.references(() => T_SUBDOMAIN.subdomainId, { onDelete: "cascade" }),
	boundedContextId: text("bounded_context_id")
		.notNull()
		.references(() => T_BOUNDED_CONTEXT.boundedContextId, {
			onDelete: "cascade",
		}),
	aggregateId: text("aggregate_id")
		.notNull()
		.references(() => T_AGGREGATE.aggregateId, { onDelete: "cascade" }),
	invariantId: text("id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
});

export const T_CONSUMABLE = sqliteTable("consumable", {
	ref: text("ref").primaryKey(),
	domainId: text("domain_id")
		.notNull()
		.references(() => T_DOMAIN.domainId, { onDelete: "cascade" }),
	subdomainId: text("subdomain_id")
		.notNull()
		.references(() => T_SUBDOMAIN.subdomainId, { onDelete: "cascade" }),
	boundedContextId: text("bounded_context_id")
		.notNull()
		.references(() => T_BOUNDED_CONTEXT.boundedContextId, {
			onDelete: "cascade",
		}),
	providerId: text("provider_id")
		.notNull()
		.references(() => T_SERVICE.serviceId, { onDelete: "cascade" }),
	providerType: text("provider_type")
		.notNull()
		.$type<"service" | "aggregate">(),
	provider: text("provider").notNull(),
	consumableId: text("id").notNull(),
	name: text("name").notNull(),
	description: text("description").notNull(),
	type: text("type").notNull().$type<ConsumableType>(),
	pattern: text("pattern").notNull().$type<ConsumablePattern>(),
});

export const T_SERVICE_CONSUMER = sqliteTable(
	"service_consumer",
	{
		serviceRef: text("service_ref")
			.notNull()
			.references(() => T_SERVICE.ref, { onDelete: "cascade" }),
		serviceBoundedcontextRef: text("service_boundedcontext_ref")
			.notNull()
			.references(() => T_BOUNDED_CONTEXT.ref, { onDelete: "cascade" }),
		consumableRef: text("consumable_ref")
			.notNull()
			.references(() => T_CONSUMABLE.ref, { onDelete: "cascade" }),
		consumableBoundedcontextRef: text("consumable_boundedcontext_ref")
			.notNull()
			.references(() => T_BOUNDED_CONTEXT.ref, { onDelete: "cascade" }),
		pattern: text("pattern").notNull().$type<ConsumptionPattern>(),
	},
	(self) => {
		return [
			primaryKey({
				columns: [self.serviceRef, self.consumableRef],
			}),
		];
	},
);

export const T_AGGREGATE_CONSUMER = sqliteTable(
	"aggregate_consumer",
	{
		aggregateRef: text("aggregate_ref")
			.notNull()
			.references(() => T_AGGREGATE.ref, { onDelete: "cascade" }),
		aggregateBoundedcontextRef: text("aggregate_boundedcontext_ref")
			.notNull()
			.references(() => T_BOUNDED_CONTEXT.ref, { onDelete: "cascade" }),
		consumableRef: text("consumable_ref")
			.notNull()
			.references(() => T_CONSUMABLE.ref, { onDelete: "cascade" }),
		consumableBoundedcontextRef: text("consumable_boundedcontext_ref")
			.notNull()
			.references(() => T_BOUNDED_CONTEXT.ref, { onDelete: "cascade" }),
		pattern: text("pattern").notNull().$type<ConsumptionPattern>(),
	},
	(self) => {
		return [
			primaryKey({
				columns: [self.aggregateRef, self.consumableRef],
			}),
		];
	},
);
