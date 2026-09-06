import { getDebug } from "./debug";
import {
	type AggregateSchema,
	type AttributeSchema,
	aggregateRef,
	type BoundedContextSchema,
	contextInvariantRef,
	entityRef,
	invariantRef,
	policyRef,
	processRef,
	type ServiceSchema,
	schemaRef,
	serviceRef,
	termRef,
	valueObjectInvariantRef,
	valueObjectRef,
	type WorkspaceSchema,
} from "./schema";
import type {
	Aggregate,
	AttributeOwner,
	Service,
	Workspace,
} from "./workspace";
import {
	BoundedContext,
	Entity,
	Workspace as WorkspaceModel,
} from "./workspace";

const debug = getDebug("get-workspace-from-schema");

/** Consumables are added in the second pass because their schema must already exist. */
function addProvides(
	provider: Aggregate | Service,
	schema: AggregateSchema | ServiceSchema,
	workspace: Workspace,
) {
	for (const [id, consumableSchema] of Object.entries(schema.provides)) {
		debug(`Adding consumable: ${consumableSchema.name} to ${provider.name}`);
		const {
			raises: _raises,
			schema: schemaRef,
			returns: returnsRef,
			rejects: rejectsRefs,
			...rest
		} = consumableSchema;
		provider.addConsumable(consumableSchema.name, {
			...rest,
			id,
			schema: schemaRef && workspace.getSchemaByRefOrThrow(schemaRef.$ref),
			returns: returnsRef && {
				schema: workspace.getSchemaByRefOrThrow(returnsRef.$ref),
				many: returnsRef.many,
			},
			rejects: rejectsRefs?.map(({ $ref }) =>
				workspace.getSchemaByRefOrThrow($ref),
			),
		});
	}
}

/** Raises links consumables to consumables, so it runs once every consumable exists. */
function linkRaises(
	provider: Aggregate | Service,
	schema: AggregateSchema | ServiceSchema,
	workspace: Workspace,
) {
	for (const [id, consumableSchema] of Object.entries(schema.provides)) {
		if (!consumableSchema.raises?.length) continue;
		const consumable = workspace.getConsumableByRefOrThrow(
			`${provider.ref}/provides/${id}`,
		);
		consumable.raises(
			...consumableSchema.raises.map(({ $ref }) =>
				workspace.getConsumableByRefOrThrow($ref),
			),
		);
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
		consumer.addConsumption(consumable, {
			...consumption,
			by: consumption.by?.map(({ $ref }) =>
				workspace.getConsumptionCallerByRefOrThrow($ref),
			),
		});
	}
}

/**
 * What an identity attribute names: an entity anywhere in the workspace, or a
 * bounded context, for an id that belongs to a system whose entities are not
 * modelled (decision 28). Whether that context is really external is
 * `identifies-entity`'s to say; the loader only resolves what the ref points
 * at, so a model that names the wrong kind of context loads and is reported
 * rather than throwing.
 */
function identifiedBy(
	workspace: Workspace,
	ref: string,
): Entity | BoundedContext {
	const target = workspace.getByRef(ref);
	if (target instanceof Entity || target instanceof BoundedContext)
		return target;
	throw new Error(`Entity or Bounded Context with ref ${ref} not found`);
}

/**
 * Attributes may point at a value object, at another schema, or at the entity
 * or external context whose identity they hold, so they are added in the
 * second pass, once everything they can name exists.
 */
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
			schema:
				attributeSchema.schema &&
				workspace.getSchemaByRefOrThrow(attributeSchema.schema.$ref),
			identifies:
				attributeSchema.identifies &&
				identifiedBy(workspace, attributeSchema.identifies.$ref),
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

	for (const [termId, termSchema] of Object.entries(
		boundedcontextSchema.glossary,
	)) {
		boundedcontext.addTerm(termSchema.name, {
			...termSchema,
			id: termId,
			embodiedBy: undefined,
		});
	}

	for (const [invariantId, invariantSchema] of Object.entries(
		boundedcontextSchema.invariants,
	)) {
		boundedcontext.addInvariant(invariantSchema.name, {
			...invariantSchema,
			id: invariantId,
		});
	}

	// The consumables a policy joins may live in any context, so its two lists
	// are dropped here and joined in the second pass (linkPolicies).
	for (const [policyId, policySchema] of Object.entries(
		boundedcontextSchema.policies,
	)) {
		const { on: _on, then: _then, ...rest } = policySchema;
		boundedcontext.addPolicy(policySchema.name, { ...rest, id: policyId });
	}

	// The consumables a process joins may live in any context, so its four
	// lists are dropped here and joined in the second pass (linkProcesses),
	// exactly as a policy's are. Its deadlines are its own, so they are made
	// here, before anything can name one.
	for (const [processId, processSchema] of Object.entries(
		boundedcontextSchema.processes,
	)) {
		const {
			starts: _starts,
			on: _on,
			then: _then,
			ends: _ends,
			deadlines,
			...rest
		} = processSchema;
		const process = boundedcontext.addProcess(processSchema.name, {
			...rest,
			id: processId,
		});
		for (const [deadlineId, deadlineSchema] of Object.entries(
			deadlines ?? {},
		)) {
			// What it counts from is joined in the second pass, once the process
			// waits for something (linkProcesses).
			const { from: _from, ...deadlineRest } = deadlineSchema;
			process.addDeadline(deadlineSchema.name, {
				...deadlineRest,
				id: deadlineId,
			});
		}
	}

	for (const [schemaId, schemaSchema] of Object.entries(
		boundedcontextSchema.schemas,
	)) {
		boundedcontext.addSchema(schemaSchema.name, {
			...schemaSchema,
			id: schemaId,
		});
	}

	for (const [valueobjectId, valueobjectSchema] of Object.entries(
		boundedcontextSchema.valueobjects,
	)) {
		// What it is a kind of is joined later: the parent may be in a context
		// this pass has not reached (linkSpecialisations).
		const valueobject = boundedcontext.addValueObject(valueobjectSchema.name, {
			...valueobjectSchema,
			id: valueobjectId,
			specialises: undefined,
		});

		for (const [invariantId, invariantSchema] of Object.entries(
			valueobjectSchema.invariants,
		)) {
			valueobject.addInvariant(invariantSchema.name, {
				...invariantSchema,
				id: invariantId,
			});
		}
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
			aggregate.addEntity(entitySchema.name, {
				...entitySchema,
				id: entityId,
				specialises: undefined,
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
		linkRaises(provider, schema, workspace);
		addConsumes(provider, schema, workspace);
	}

	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [schemaId, schemaSchema] of Object.entries(
			boundedcontextSchema.schemas,
		)) {
			addAttributes(
				workspace.getSchemaByRefOrThrow(
					schemaRef(boundedcontextId, schemaId).$ref,
				),
				schemaSchema.attributes,
				workspace,
			);
		}

		for (const [valueobjectId, valueobjectSchema] of Object.entries(
			boundedcontextSchema.valueobjects,
		)) {
			const valueobject = workspace.getValueObjectByRefOrThrow(
				valueObjectRef(boundedcontextId, valueobjectId).$ref,
			);
			addAttributes(valueobject, valueobjectSchema.attributes, workspace);
			for (const relation of valueobjectSchema.relations) {
				valueobject.addRelation(
					workspace.getEntityOrValueobjectByRefOrThrow(relation.target.$ref),
					relation,
				);
			}

			// A value's rule is about its own attributes, so it is wired once
			// they exist, the way an aggregate's is below.
			for (const [invariantId, invariantSchema] of Object.entries(
				valueobjectSchema.invariants,
			)) {
				const invariant = workspace.getInvariantByRefOrThrow(
					valueObjectInvariantRef(boundedcontextId, valueobjectId, invariantId)
						.$ref,
				);
				for (const { $ref } of invariantSchema.constrains) {
					invariant.constrains(workspace.getConstrainableByRefOrThrow($ref));
				}
			}
		}

		for (const [aggregateId, aggregateSchema] of Object.entries(
			boundedcontextSchema.aggregates,
		)) {
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

		// A context's invariants reach into any of its aggregates, so they are
		// wired once all of them have their attributes (decision 27).
		for (const [invariantId, invariantSchema] of Object.entries(
			boundedcontextSchema.invariants,
		)) {
			const invariant = workspace.getInvariantByRefOrThrow(
				contextInvariantRef(boundedcontextId, invariantId).$ref,
			);
			for (const { $ref } of invariantSchema.constrains) {
				invariant.constrains(workspace.getConstrainableByRefOrThrow($ref));
			}
		}
	}
}

/**
 * A kind is joined to what it is a kind of once every entity and value object
 * exists: an entity's parent is declared in the same aggregate, but a value
 * object's may be in the context it borrows from over a shared kernel, which
 * the loader may not have reached yet (decision 22).
 */
function linkSpecialisations(
	workspace: Workspace,
	workspaceSchema: WorkspaceSchema,
) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [valueobjectId, valueobjectSchema] of Object.entries(
			boundedcontextSchema.valueobjects,
		)) {
			if (!valueobjectSchema.specialises) continue;
			workspace.getValueObjectByRefOrThrow(
				valueObjectRef(boundedcontextId, valueobjectId).$ref,
			).specialises = workspace.getValueObjectByRefOrThrow(
				valueobjectSchema.specialises.$ref,
			);
		}
		for (const [aggregateId, aggregateSchema] of Object.entries(
			boundedcontextSchema.aggregates,
		)) {
			for (const [entityId, entitySchema] of Object.entries(
				aggregateSchema.entities,
			)) {
				if (!entitySchema.specialises) continue;
				workspace.getEntityByRefOrThrow(
					entityRef(boundedcontextId, aggregateId, entityId).$ref,
				).specialises = workspace.getEntityByRefOrThrow(
					entitySchema.specialises.$ref,
				);
			}
		}
	}
}

/** A term may be embodied by any element, so it is linked once all exist. */
function linkGlossary(workspace: Workspace, workspaceSchema: WorkspaceSchema) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [termId, termSchema] of Object.entries(
			boundedcontextSchema.glossary,
		)) {
			if (!termSchema.embodiedBy) continue;
			workspace
				.getTermByRefOrThrow(termRef(boundedcontextId, termId).$ref)
				.embody(workspace.getByRefOrThrow(termSchema.embodiedBy.$ref));
		}
	}
}

/** Policies join consumables that may live in any context. */
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
					workspace.getReactionTriggerByRefOrThrow($ref),
				),
			);
			policy.issues(
				...policySchema.then.map(({ $ref }) =>
					workspace.getConsumableByRefOrThrow($ref),
				),
			);
		}
	}
}

/** Processes join consumables that may live in any context. */
function linkProcesses(workspace: Workspace, workspaceSchema: WorkspaceSchema) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [processId, processSchema] of Object.entries(
			boundedcontextSchema.processes,
		)) {
			const process = workspace.getProcessByRefOrThrow(
				processRef(boundedcontextId, processId).$ref,
			);
			const consumables = (refs: { $ref: string }[]) =>
				refs.map(({ $ref }) => workspace.getConsumableByRefOrThrow($ref));
			// What a process waits for, and what completes it, may be an answer
			// or one of its own deadlines rather than an event, so both resolve
			// to any of the three (decision 23).
			const triggers = (refs: { $ref: string }[]) =>
				refs.map(({ $ref }) => workspace.getProcessTriggerByRefOrThrow($ref));
			process.starts(...consumables(processSchema.starts));
			process.on(...triggers(processSchema.on));
			process.issues(...consumables(processSchema.then));
			process.ends(...triggers(processSchema.ends));
			// A deadline's anchor is one of the triggers linked just above, so
			// it is set here rather than where the deadline was made: in the
			// first pass the process waited for nothing yet, and `countsFrom`
			// refuses an anchor the process does not wait for.
			for (const [deadlineId, deadlineSchema] of Object.entries(
				processSchema.deadlines ?? {},
			)) {
				if (!deadlineSchema.from) continue;
				const deadline = process.deadlines.get(deadlineId);
				if (!deadline) continue;
				deadline.countsFrom(
					workspace.getProcessTriggerByRefOrThrow(deadlineSchema.from.$ref),
				);
			}
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
				comments: relationship.comments,
				disposition: relationship.disposition,
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
				comments: relationship.comments,
				disposition: relationship.disposition,
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
		options: workspaceSchema.options,
	});

	addDomains(workspace, workspaceSchema);
	addTeams(workspace, workspaceSchema);
	for (const [id, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		addBoundedContext(workspace, id, boundedcontextSchema);
	}
	linkSpecialisations(workspace, workspaceSchema);
	linkReferences(workspace, workspaceSchema);
	linkPolicies(workspace, workspaceSchema);
	linkProcesses(workspace, workspaceSchema);
	linkGlossary(workspace, workspaceSchema);
	addRelationships(workspace, workspaceSchema);

	return workspace;
}
