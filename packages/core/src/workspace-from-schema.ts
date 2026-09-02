import { getDebug } from "./debug";
import { migrateWorkspaceSchema } from "./migrate";
import {
	type AggregateSchema,
	aggregateRef,
	type BoundedContextSchema,
	entityRef,
	type ServiceSchema,
	serviceRef,
	valueObjectRef,
	type WorkspaceSchema,
} from "./schema";
import type {
	Aggregate,
	BoundedContext,
	Service,
	Workspace,
} from "./workspace";
import { Workspace as WorkspaceModel } from "./workspace";

const debug = getDebug("get-workspace-from-schema");

function addProvides(
	provider: Aggregate | Service,
	schema: AggregateSchema | ServiceSchema,
) {
	for (const [id, consumableSchema] of Object.entries(schema.provides)) {
		debug(`Adding consumable: ${consumableSchema.name} to ${provider.name}`);
		provider.addConsumable(consumableSchema.name, { ...consumableSchema, id });
	}
}

function addConsumes(
	consumer: Aggregate | Service,
	schema: AggregateSchema | ServiceSchema,
	workspace: Workspace,
) {
	for (const consumption of schema.consumes) {
		debug(
			`Adding consumption: ${consumption.consumable.$ref} to ${consumer.name}`,
		);
		const consumable = workspace.getConsumableByRefOrThrow(
			consumption.consumable.$ref,
		);
		consumer.addConsumption(consumable, consumption);
	}
}

function addDomains(workspace: Workspace, workspaceSchema: WorkspaceSchema) {
	for (const [id, domainSchema] of Object.entries(workspaceSchema.domains)) {
		debug(`Adding domain: ${domainSchema.name}`);
		const domain = workspace.addDomain(domainSchema.name, {
			...domainSchema,
			id,
		});

		for (const [subdomainId, subdomainSchema] of Object.entries(
			domainSchema.subdomains,
		)) {
			debug(
				`Adding subdomain: ${subdomainSchema.name} to ${domainSchema.name}`,
			);
			domain.addSubdomain(subdomainSchema.name, {
				...subdomainSchema,
				id: subdomainId,
			});
		}
	}
}

function addBoundedContext(
	workspace: Workspace,
	id: string,
	boundedcontextSchema: BoundedContextSchema,
): BoundedContext {
	debug(`Adding bounded context: ${boundedcontextSchema.name}`);
	const boundedcontext = workspace.addBoundedContext(
		boundedcontextSchema.name,
		{
			...boundedcontextSchema,
			id,
			subdomains: boundedcontextSchema.subdomains.map(({ $ref }) =>
				workspace.getSubdomainByRefOrThrow($ref),
			),
		},
	);

	for (const [serviceId, serviceSchema] of Object.entries(
		boundedcontextSchema.services,
	)) {
		debug(`Adding service: ${serviceSchema.name} to ${boundedcontext.name}`);
		const service = boundedcontext.addService(serviceSchema.name, {
			...serviceSchema,
			id: serviceId,
		});
		addProvides(service, serviceSchema);
	}

	for (const [aggregateId, aggregateSchema] of Object.entries(
		boundedcontextSchema.aggregates,
	)) {
		debug(
			`Adding aggregate: ${aggregateSchema.name} to ${boundedcontext.name}`,
		);
		const aggregate = boundedcontext.addAggregate(aggregateSchema.name, {
			...aggregateSchema,
			id: aggregateId,
		});

		for (const [invariantId, invariantSchema] of Object.entries(
			aggregateSchema.invariants,
		)) {
			aggregate.addInvariant(invariantSchema.name, {
				...invariantSchema,
				id: invariantId,
			});
		}
		for (const [entityId, entitySchema] of Object.entries(
			aggregateSchema.entities,
		)) {
			aggregate.addEntity(entitySchema.name, { ...entitySchema, id: entityId });
		}
		for (const [valueobjectId, valueobjectSchema] of Object.entries(
			aggregateSchema.valueobjects,
		)) {
			aggregate.addValueObject(valueobjectSchema.name, {
				...valueobjectSchema,
				id: valueobjectId,
			});
		}
		addProvides(aggregate, aggregateSchema);
	}

	return boundedcontext;
}

/**
 * Second pass: everything that points at another node by `$ref` can only be
 * resolved once every node exists.
 */
function linkReferences(
	workspace: Workspace,
	workspaceSchema: WorkspaceSchema,
) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [serviceId, serviceSchema] of Object.entries(
			boundedcontextSchema.services,
		)) {
			const service = workspace.getServiceByRefOrThrow(
				serviceRef(boundedcontextId, serviceId).$ref,
			);
			addConsumes(service, serviceSchema, workspace);
		}

		for (const [aggregateId, aggregateSchema] of Object.entries(
			boundedcontextSchema.aggregates,
		)) {
			const aggregate = workspace.getAggregateByRefOrThrow(
				aggregateRef(boundedcontextId, aggregateId).$ref,
			);
			addConsumes(aggregate, aggregateSchema, workspace);

			for (const [entityId, entitySchema] of Object.entries(
				aggregateSchema.entities,
			)) {
				const entity = workspace.getEntityByRefOrThrow(
					entityRef(boundedcontextId, aggregateId, entityId).$ref,
				);
				for (const relation of entitySchema.relations) {
					entity.addRelation(
						workspace.getEntityOrValueobjectByRefOrThrow(relation.target.$ref),
						relation,
					);
				}
			}

			for (const [valueobjectId, valueobjectSchema] of Object.entries(
				aggregateSchema.valueobjects,
			)) {
				const valueobject = workspace.getValueObjectByRefOrThrow(
					valueObjectRef(boundedcontextId, aggregateId, valueobjectId).$ref,
				);
				for (const relation of valueobjectSchema.relations) {
					valueobject.addRelation(
						workspace.getEntityOrValueobjectByRefOrThrow(relation.target.$ref),
						relation,
					);
				}
			}
		}
	}
}

export function getWorkspaceFromSchema(
	rawWorkspaceSchema: WorkspaceSchema,
): Workspace {
	const workspaceSchema = migrateWorkspaceSchema(rawWorkspaceSchema);
	debug(`Creating workspace from schema: ${workspaceSchema.name}`);
	const workspace = new WorkspaceModel(workspaceSchema.name, {
		id: workspaceSchema.id,
		odsVersion: workspaceSchema.odsVersion,
		description: workspaceSchema.description,
		homepage: workspaceSchema.homepage,
		logoUrl: workspaceSchema.logoUrl,
		primaryColor: workspaceSchema.primaryColor,
		version: workspaceSchema.version,
	});

	addDomains(workspace, workspaceSchema);
	for (const [id, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		addBoundedContext(workspace, id, boundedcontextSchema);
	}
	linkReferences(workspace, workspaceSchema);

	return workspace;
}
