import { getDebug } from "./debug";
import {
	aggregateRef,
	entityRef,
	serviceRef,
	valueObjectRef,
	type WorkspaceSchema,
} from "./schema";
import { Workspace } from "./workspace";

const debug = getDebug("get-workspace-from-schema");

export function getWorkspaceFromSchema(
	workspaceSchema: WorkspaceSchema,
): Workspace {
	debug(`Creating workspace from schema: ${workspaceSchema.name}`);
	debug(workspaceSchema);
	const workspace = new Workspace(workspaceSchema.name, {
		id: workspaceSchema.id,
		odsVersion: workspaceSchema.odsVersion,
		description: workspaceSchema.description,
		homepage: workspaceSchema.homepage,
		logoUrl: workspaceSchema.logoUrl,
		primaryColor: workspaceSchema.primaryColor,
		version: workspaceSchema.version,
	});

	// Walk through the workspace schema and create the workspace structure
	// with domains, subdomains, bounded contexts, services, aggregates, entities
	// and value objects as defined in the schema.
	for (const [domainId, domainSchema] of Object.entries(
		workspaceSchema.domains,
	)) {
		debug(`Adding domain: ${domainSchema.name} (${domainId})`);
		const domain = workspace.addDomain(domainSchema.name, domainSchema);

		for (const [subdomainId, subdomainSchema] of Object.entries(
			domainSchema.subdomains,
		)) {
			debug(
				`Adding subdomain: ${subdomainSchema.name} (${subdomainId}) to domain: ${domainSchema.name}`,
			);
			const subdomain = domain.addSubdomain(subdomainSchema.name, domainSchema);

			for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
				subdomainSchema.boundedcontexts,
			)) {
				debug(
					`Adding bounded context: ${boundedcontextSchema.name} (${boundedcontextId}) to subdomain: ${subdomainSchema.name}`,
				);
				const boundedcontext = subdomain.addBoundedcontext(
					boundedcontextSchema.name,
					boundedcontextSchema,
				);

				for (const [serviceId, serviceSchema] of Object.entries(
					boundedcontextSchema.services,
				)) {
					debug(
						`Adding service: ${serviceSchema.name} (${serviceId}) to bounded context: ${boundedcontextSchema.name}`,
					);
					const service = boundedcontext.addService(
						serviceSchema.name,
						serviceSchema,
					);

					for (const [consumableId, consumableSchema] of Object.entries(
						serviceSchema.provides,
					)) {
						debug(
							`Adding consumable: ${consumableSchema.name} (${consumableId}) to service: ${serviceSchema.name}`,
						);
						service.addConsumable(consumableSchema.name, consumableSchema);
					}
				}

				for (const [aggregateId, aggregateSchema] of Object.entries(
					boundedcontextSchema.aggregates,
				)) {
					debug(
						`Adding aggregate: ${aggregateSchema.name} (${aggregateId}) to bounded context: ${boundedcontextSchema.name}`,
					);
					const aggregate = boundedcontext.addAggregate(
						aggregateSchema.name,
						aggregateSchema,
					);

					for (const [invariantId, invariantSchema] of Object.entries(
						aggregateSchema.invariants,
					)) {
						debug(
							`Adding invariant: ${invariantSchema.name} (${invariantId}) to aggregate: ${aggregateSchema.name}`,
						);
						aggregate.addInvariant(invariantSchema.name, invariantSchema);
					}

					for (const [entityId, entitySchema] of Object.entries(
						aggregateSchema.entities,
					)) {
						debug(
							`Adding entity: ${entitySchema.name} (${entityId}) to aggregate: ${aggregateSchema.name}`,
						);
						aggregate.addEntity(entitySchema.name, entitySchema);
					}

					for (const [valueobjectId, valueobjectSchema] of Object.entries(
						aggregateSchema.valueobjects,
					)) {
						debug(
							`Adding value object: ${valueobjectSchema.name} (${valueobjectId}) to aggregate: ${aggregateSchema.name}`,
						);
						aggregate.addValueObject(valueobjectSchema.name, valueobjectSchema);
					}

					for (const [consumableId, consumableSchema] of Object.entries(
						aggregateSchema.provides,
					)) {
						debug(
							`Adding consumable: ${consumableSchema.name} (${consumableId}) to aggregate: ${aggregateSchema.name}`,
						);
						aggregate.addConsumable(consumableSchema.name, consumableSchema);
					}
				}
			}
		}
	}

	// Walk through the workspace schema and create the relations
	// between entities, value objects, and consumables as defined in the schema.
	// By Resolving the References
	debug(
		`Adding relations and consumptions to workspace: ${workspaceSchema.name}`,
	);

	for (const [domainId, domainSchema] of Object.entries(
		workspaceSchema.domains,
	)) {
		for (const [subdomainId, subdomainSchema] of Object.entries(
			domainSchema.subdomains,
		)) {
			for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
				subdomainSchema.boundedcontexts,
			)) {
				for (const [serviceId, serviceSchema] of Object.entries(
					boundedcontextSchema.services,
				)) {
					for (const consumption of serviceSchema.consumes) {
						debug(
							`Adding consumption: ${consumption.consumable.$ref} to service: ${serviceSchema.name}`,
						);
						const consumer = workspace.getServiceByRefOrThrow(
							serviceRef(domainId, subdomainId, boundedcontextId, serviceId)
								.$ref,
						);
						const consumable = workspace.getConsumableByRefOrThrow(
							consumption.consumable.$ref,
						);

						consumer.addConsumption(consumable, consumption);
					}
				}

				for (const [aggregateId, aggregateSchema] of Object.entries(
					boundedcontextSchema.aggregates,
				)) {
					for (const consumption of aggregateSchema.consumes) {
						debug(
							`Adding consumption: ${consumption.consumable.$ref} to aggregate: ${aggregateSchema.name}`,
						);
						const consumer = workspace.getAggregateByRefOrThrow(
							aggregateRef(domainId, subdomainId, boundedcontextId, aggregateId)
								.$ref,
						);
						const consumable = workspace.getConsumableByRefOrThrow(
							consumption.consumable.$ref,
						);

						consumer.addConsumption(consumable, consumption);
					}

					for (const [entityId, entitySchema] of Object.entries(
						aggregateSchema.entities,
					)) {
						debug(
							`Adding relations for entity: ${entitySchema.name} (${entityId}) in aggregate: ${aggregateSchema.name}`,
						);
						const entity = workspace.getEntityByRefOrThrow(
							entityRef(
								domainId,
								subdomainId,
								boundedcontextId,
								aggregateId,
								entityId,
							).$ref,
						);

						for (const relation of entitySchema.relations) {
							debug(
								`Adding relation: ${relation.relation} to target: ${relation.target.$ref} with label: ${relation.label} for entity: ${entitySchema.name}`,
							);
							const target = workspace.getEntityOrValueobjectByRefOrThrow(
								relation.target.$ref,
							);
							entity.addRelation(target, relation);
						}
					}

					for (const [valueobjectId, valueobjectSchema] of Object.entries(
						aggregateSchema.valueobjects,
					)) {
						debug(
							`Adding relations for value object: ${valueobjectSchema.name} (${valueobjectId}) in aggregate: ${aggregateSchema.name}`,
						);
						const valueobject = workspace.getValueObjectByRefOrThrow(
							valueObjectRef(
								domainId,
								subdomainId,
								boundedcontextId,
								aggregateId,
								valueobjectId,
							).$ref,
						);

						for (const relation of valueobjectSchema.relations) {
							debug(
								`Adding relation: ${relation.relation} to target: ${relation.target.$ref} with label: ${relation.label} for value object: ${valueobjectSchema.name}`,
							);
							const target = workspace.getEntityOrValueobjectByRefOrThrow(
								relation.target.$ref,
							);
							valueobject.addRelation(target, relation);
						}
					}
				}
			}
		}
	}

	return workspace;
}
