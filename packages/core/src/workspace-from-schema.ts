import { getDebug } from "./debug";
import {
	type AggregateSchema,
	type AttributeSchema,
	aggregateRef,
	type BoundedContextSchema,
	commandRef,
	entityRef,
	eventRef,
	invariantRef,
	policyRef,
	type ServiceSchema,
	serviceRef,
	valueObjectRef,
	type WorkspaceSchema,
} from "./schema";
import type {
	Aggregate,
	AttributeOwner,
	BoundedContext,
	Service,
	Workspace,
} from "./workspace";
import { Workspace as WorkspaceModel } from "./workspace";

const debug = getDebug("get-workspace-from-schema");

/**
 * Consumables are added in the second pass because an event consumable
 * refers to a domain event that may live on another aggregate.
 */
function addProvides(
	provider: Aggregate | Service,
	schema: AggregateSchema | ServiceSchema,
	workspace: Workspace,
) {
	for (const [id, consumableSchema] of Object.entries(schema.provides)) {
		debug(`Adding consumable: ${consumableSchema.name} to ${provider.name}`);
		provider.addConsumable(consumableSchema.name, {
			...consumableSchema,
			id,
			event:
				consumableSchema.event &&
				workspace.getEventByRefOrThrow(consumableSchema.event.$ref),
			command:
				consumableSchema.command &&
				workspace.getCommandByRefOrThrow(consumableSchema.command.$ref),
		});
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

/** Attributes may point at value objects, so they are added in the second pass. */
function addAttributes(
	owner: AttributeOwner,
	attributes: Record<string, AttributeSchema>,
	workspace: Workspace,
) {
	for (const [id, attributeSchema] of Object.entries(attributes)) {
		owner.addAttribute(attributeSchema.name, {
			...attributeSchema,
			id,
			valueobject:
				attributeSchema.valueobject &&
				workspace.getValueObjectByRefOrThrow(attributeSchema.valueobject.$ref),
		});
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

function addTeams(workspace: Workspace, workspaceSchema: WorkspaceSchema) {
	for (const [id, teamSchema] of Object.entries(workspaceSchema.teams)) {
		debug(`Adding team: ${teamSchema.name}`);
		workspace.addTeam(teamSchema.name, { ...teamSchema, id });
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
			team:
				boundedcontextSchema.team &&
				workspace.getTeamByRefOrThrow(boundedcontextSchema.team.$ref),
			subdomains: boundedcontextSchema.subdomains.map(({ $ref }) =>
				workspace.getSubdomainByRefOrThrow($ref),
			),
		},
	);

	for (const [serviceId, serviceSchema] of Object.entries(
		boundedcontextSchema.services,
	)) {
		debug(`Adding service: ${serviceSchema.name} to ${boundedcontext.name}`);
		boundedcontext.addService(serviceSchema.name, {
			...serviceSchema,
			id: serviceId,
		});
	}

	for (const [policyId, policySchema] of Object.entries(
		boundedcontextSchema.policies,
	)) {
		boundedcontext.addPolicy(policySchema.name, {
			...policySchema,
			id: policyId,
		});
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
		for (const [eventId, eventSchema] of Object.entries(
			aggregateSchema.events,
		)) {
			aggregate.addEvent(eventSchema.name, { ...eventSchema, id: eventId });
		}
		for (const [commandId, commandSchema] of Object.entries(
			aggregateSchema.commands,
		)) {
			aggregate.addCommand(commandSchema.name, {
				...commandSchema,
				id: commandId,
			});
		}
	}

	return boundedcontext;
}

/** Every service and aggregate, paired with its schema. */
function* providersOf(workspace: Workspace, workspaceSchema: WorkspaceSchema) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [serviceId, schema] of Object.entries(
			boundedcontextSchema.services,
		)) {
			const provider = workspace.getServiceByRefOrThrow(
				serviceRef(boundedcontextId, serviceId).$ref,
			);
			yield { provider, schema };
		}
		for (const [aggregateId, schema] of Object.entries(
			boundedcontextSchema.aggregates,
		)) {
			const provider = workspace.getAggregateByRefOrThrow(
				aggregateRef(boundedcontextId, aggregateId).$ref,
			);
			yield { provider, schema };
		}
	}
}

/**
 * Second pass: everything that points at another node by `$ref` can only be
 * resolved once every node exists. Consumables come before consumptions
 * because a consumption points at a consumable.
 */
function linkReferences(
	workspace: Workspace,
	workspaceSchema: WorkspaceSchema,
) {
	for (const { provider, schema } of providersOf(workspace, workspaceSchema)) {
		addProvides(provider, schema, workspace);
	}
	for (const { provider, schema } of providersOf(workspace, workspaceSchema)) {
		addConsumes(provider, schema, workspace);
	}

	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [aggregateId, aggregateSchema] of Object.entries(
			boundedcontextSchema.aggregates,
		)) {
			for (const [eventId, eventSchema] of Object.entries(
				aggregateSchema.events,
			)) {
				addAttributes(
					workspace.getEventByRefOrThrow(
						eventRef(boundedcontextId, aggregateId, eventId).$ref,
					),
					eventSchema.attributes,
					workspace,
				);
			}

			for (const [commandId, commandSchema] of Object.entries(
				aggregateSchema.commands,
			)) {
				const command = workspace.getCommandByRefOrThrow(
					commandRef(boundedcontextId, aggregateId, commandId).$ref,
				);
				addAttributes(command, commandSchema.attributes, workspace);
				for (const { $ref } of commandSchema.raises) {
					command.raises(workspace.getEventByRefOrThrow($ref));
				}
			}

			for (const [entityId, entitySchema] of Object.entries(
				aggregateSchema.entities,
			)) {
				const entity = workspace.getEntityByRefOrThrow(
					entityRef(boundedcontextId, aggregateId, entityId).$ref,
				);
				addAttributes(entity, entitySchema.attributes, workspace);
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
				addAttributes(valueobject, valueobjectSchema.attributes, workspace);
				for (const relation of valueobjectSchema.relations) {
					valueobject.addRelation(
						workspace.getEntityOrValueobjectByRefOrThrow(relation.target.$ref),
						relation,
					);
				}
			}

			// Invariants come last: they may constrain attributes added just above.
			for (const [invariantId, invariantSchema] of Object.entries(
				aggregateSchema.invariants,
			)) {
				const invariant = workspace.getInvariantByRefOrThrow(
					invariantRef(boundedcontextId, aggregateId, invariantId).$ref,
				);
				for (const { $ref } of invariantSchema.constrains) {
					invariant.constrains(workspace.getConstrainableByRefOrThrow($ref));
				}
			}
		}
	}
}

/** Policies join events and commands that may live in any context. */
function linkPolicies(workspace: Workspace, workspaceSchema: WorkspaceSchema) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [policyId, policySchema] of Object.entries(
			boundedcontextSchema.policies,
		)) {
			const policy = workspace.getPolicyByRefOrThrow(
				policyRef(boundedcontextId, policyId).$ref,
			);
			policy.on(
				...policySchema.on.map(({ $ref }) =>
					workspace.getEventByRefOrThrow($ref),
				),
			);
			policy.then(
				...policySchema.then.map(({ $ref }) =>
					workspace.getCommandByRefOrThrow($ref),
				),
			);
		}
	}
}

function addRelationships(
	workspace: Workspace,
	workspaceSchema: WorkspaceSchema,
) {
	for (const relationship of workspaceSchema.relationships) {
		if ("participants" in relationship) {
			workspace.addRelationship({
				type: relationship.type,
				participants: [
					workspace.getBoundedContextByRefOrThrow(
						relationship.participants[0].$ref,
					),
					workspace.getBoundedContextByRefOrThrow(
						relationship.participants[1].$ref,
					),
				],
				description: relationship.description,
			});
		} else {
			workspace.addRelationship({
				type: relationship.type,
				upstream: workspace.getBoundedContextByRefOrThrow(
					relationship.upstream.$ref,
				),
				downstream: workspace.getBoundedContextByRefOrThrow(
					relationship.downstream.$ref,
				),
				upstreamRoles: relationship.upstreamRoles,
				downstreamRoles: relationship.downstreamRoles,
				description: relationship.description,
			});
		}
	}
}

export function getWorkspaceFromSchema(
	workspaceSchema: WorkspaceSchema,
): Workspace {
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
	addTeams(workspace, workspaceSchema);
	for (const [id, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		addBoundedContext(workspace, id, boundedcontextSchema);
	}
	linkReferences(workspace, workspaceSchema);
	linkPolicies(workspace, workspaceSchema);
	addRelationships(workspace, workspaceSchema);

	return workspace;
}
