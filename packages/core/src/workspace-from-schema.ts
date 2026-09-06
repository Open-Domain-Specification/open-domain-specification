import { getDebug } from "./debug";
import {
	type AggregateSchema,
	type AttributeSchema,
	aggregateRef,
	type BoundedContextSchema,
	boundedcontextRef,
	contextInvariantRef,
	entityRef,
	invariantRef,
	ODS_VERSION,
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
	Constrainable,
	Consumable,
	ConsumptionCaller,
	ContextRelationship,
	IdentityTarget,
	Process,
	ProcessTrigger,
	ReactionTrigger,
	Referenceable,
	Service,
	Subdomain,
	Team,
	ValueObject,
	Workspace,
} from "./workspace";
import {
	BoundedContext,
	DataSchema,
	Deadline,
	Entity,
	keepsUnresolvedWrites,
	Workspace as WorkspaceModel,
} from "./workspace";

const debug = getDebug("get-workspace-from-schema");

/**
 * The entries of a collection a file may leave out, in the order it wrote
 * them.
 *
 * Every map of elements is optional in the schema and an absent one means an
 * empty one: a context with no processes says so by saying nothing, rather
 * than by writing `"processes": {}` (card 104). The loader reads them all the
 * same way so that "left out" and "written empty" can never load differently.
 */
function entriesOf<T>(map: { [id: string]: T } | undefined): [string, T][] {
	return Object.entries(map ?? {});
}

/** The items of a list a file may leave out; an absent list is an empty one. */
function listOf<T>(items: T[] | undefined): T[] {
	return items ?? [];
}

/**
 * Where a `$ref` was written, for the diagnostic that reports it unresolved:
 * the element that wrote it, and how a message names that element.
 *
 * The ref is spelled out rather than read off the element because several of
 * these are needed before the element exists — a bounded context's `team` is
 * resolved on the way to constructing the context — and a path built from the
 * ids in hand is the same string the element will answer to.
 */
type Site = { ref: string; owner: string };

/** How a diagnostic names an element: `Process "Order fulfilment"`. */
function site(kind: string, name: string, ref: string): Site {
	return { ref, owner: `${kind} "${name}"` };
}

/**
 * Resolves the `$ref`s a file writes, and records the ones that do not
 * resolve instead of throwing on them.
 *
 * A model with a typo in it is a model with a mistake, and a mistake is a
 * diagnostic. Throwing at load cost the author every other diagnostic in the
 * file — the one thing an editing surface exists to give them — and it did so
 * only for JSON, because the DSL hands objects around and the compiler
 * refuses the wrong one before anything runs. So the loader leaves the link
 * unset, remembers what was written and where, and `unresolved-ref` reports it
 * beside everything else the file gets wrong (card 100).
 *
 * The loader's own lookups for the elements it has just created stay on the
 * `...OrThrow` methods: a miss there is a bug in this file, not a mistake in
 * the model, and it should stop the run.
 */
class Refs {
	constructor(private readonly workspace: Workspace) {}

	/**
	 * One optional ref: what it names, or `undefined` with the miss recorded.
	 *
	 * @param where a phrase for the place inside the element, when the field
	 *   alone does not say which of several: `its consumption of "Decide"`.
	 */
	one<T>(
		at: Site,
		field: string,
		kind: Kind<T>,
		written: { $ref: string } | undefined,
		where?: string,
	): T | undefined {
		if (!written) return undefined;
		const found = kind.find(this.workspace, written.$ref);
		if (found !== undefined) return found;
		this.workspace.unresolved.push({
			ref: at.ref,
			owner: at.owner,
			field,
			where,
			target: written.$ref,
			expected: kind.what,
			present: this.workspace.getByRef(written.$ref) !== undefined,
		});
		return undefined;
	}

	/** Every ref of a list that resolves; the rest are recorded and dropped. */
	many<T>(
		at: Site,
		field: string,
		kind: Kind<T>,
		written: { $ref: string }[] | undefined,
		where?: string,
	): T[] {
		const found: T[] = [];
		for (const one of written ?? []) {
			const it = this.one(at, field, kind, one, where);
			if (it !== undefined) found.push(it);
		}
		return found;
	}
}

/**
 * What one field may name: how to resolve a ref written in it, and the phrase
 * that says what it should have named. The two travel together so that a
 * message can never describe a different kind from the one that was looked up.
 */
type Kind<T> = {
	readonly what: string;
	find(workspace: Workspace, ref: string): T | undefined;
};

const A_SCHEMA: Kind<DataSchema> = {
	what: "a schema of this workspace",
	find: (workspace, ref) => workspace.getSchemaByRef(ref),
};
const A_CONSUMABLE: Kind<Consumable> = {
	what: "an operation or an event of this workspace",
	find: (workspace, ref) => workspace.getConsumableByRef(ref),
};
const A_VALUE_OBJECT: Kind<ValueObject> = {
	what: "a value object of this workspace",
	find: (workspace, ref) => workspace.getValueObjectByRef(ref),
};
const AN_ENTITY: Kind<Entity> = {
	what: "an entity of this workspace",
	find: (workspace, ref) => workspace.getEntityByRef(ref),
};
const A_RELATION_TARGET: Kind<Entity | ValueObject> = {
	what: "an entity or a value object of this workspace",
	find: (workspace, ref) => workspace.getEntityOrValueobjectByRef(ref),
};
const AN_IDENTITY_TARGET: Kind<IdentityTarget> = {
	what: "an entity of this workspace, or a bounded context whose entities it does not state, or a schema such a context publishes",
	find: identifiedBy,
};
const A_CALLER: Kind<ConsumptionCaller> = {
	what: "an operation, a policy or a process of this workspace",
	find: (workspace, ref) => workspace.getConsumptionCallerByRef(ref),
};
const A_TEAM: Kind<Team> = {
	what: "a team of this workspace",
	find: (workspace, ref) => workspace.getTeamByRef(ref),
};
const A_SUBDOMAIN: Kind<Subdomain> = {
	what: "a subdomain of one of this workspace's domains",
	find: (workspace, ref) => workspace.getSubdomainByRef(ref),
};
const A_CONSTRAINABLE: Kind<Constrainable> = {
	what: "an entity, a value object, an attribute or a consumable of this workspace",
	find: (workspace, ref) => workspace.getConstrainableByRef(ref),
};
const A_REACTION_TRIGGER: Kind<ReactionTrigger> = {
	what: "an event, or an answer an operation comes back with",
	find: (workspace, ref) => workspace.getReactionTriggerByRef(ref),
};
const A_STARTING_TRIGGER: Kind<Consumable> = {
	what: "an event, or an operation of this process's own context",
	find: (workspace, ref) => workspace.getConsumableByRef(ref),
};
const AN_ELEMENT: Kind<Referenceable> = {
	what: "an element of this workspace",
	find: (workspace, ref) => workspace.getByRef(ref),
};
const A_CONTEXT: Kind<BoundedContext> = {
	what: "a bounded context of this workspace",
	find: (workspace, ref) => workspace.getBoundedContextByRef(ref),
};
const AN_AGREEMENT: Kind<ContextRelationship> = {
	what: "a relationship between two bounded contexts of this workspace",
	find: (workspace, ref) => workspace.findRelationship(ref),
};

/** Consumables are added in the second pass because their schema must already exist. */
function addProvides(
	provider: Aggregate | Service,
	schema: AggregateSchema | ServiceSchema,
	refs: Refs,
) {
	for (const [id, consumableSchema] of entriesOf(schema.provides)) {
		debug(`Adding consumable: ${consumableSchema.name} to ${provider.name}`);
		const {
			raises: _raises,
			schema: schemaRef,
			returns: returnsRef,
			rejects: rejectsRefs,
			...rest
		} = consumableSchema;
		const at = site(
			consumableSchema.type === "event" ? "Event" : "Operation",
			consumableSchema.name,
			`${provider.ref}/provides/${id}`,
		);
		const returns = refs.one(at, "returns", A_SCHEMA, returnsRef);
		const request = refs.one(at, "schema", A_SCHEMA, schemaRef);
		provider.addConsumable(consumableSchema.name, {
			...rest,
			id,
			schema: request && { of: request, many: schemaRef?.many },
			returns: returns && { schema: returns, many: returnsRef?.many },
			// A refusal's reasons travel with the shape they enumerate, so a
			// shape that resolves to nothing takes its reasons with it: they
			// are outcomes of that shape and mean nothing without it.
			rejects: listOf(rejectsRefs).flatMap((written) => {
				const schema = refs.one(at, "rejects", A_SCHEMA, written);
				return schema ? [{ schema, reasons: written.reasons }] : [];
			}),
		});
	}
}

/** Raises links consumables to consumables, so it runs once every consumable exists. */
function linkRaises(
	provider: Aggregate | Service,
	schema: AggregateSchema | ServiceSchema,
	workspace: Workspace,
	refs: Refs,
) {
	for (const [id, consumableSchema] of entriesOf(schema.provides)) {
		if (!consumableSchema.raises?.length) continue;
		const consumable = workspace.getConsumableByRefOrThrow(
			`${provider.ref}/provides/${id}`,
		);
		consumable.raises(
			...refs.many(
				site("Operation", consumable.name, consumable.ref),
				"raises",
				A_CONSUMABLE,
				consumableSchema.raises,
			),
		);
	}
}

function addConsumes(
	consumer: Aggregate | Service,
	schema: AggregateSchema | ServiceSchema,
	refs: Refs,
) {
	const at = site(
		"entities" in schema ? "Aggregate" : "Service",
		consumer.name,
		consumer.ref,
	);
	for (const consumption of listOf(schema.consumes)) {
		debug(
			`Adding consumption: ${consumption.consumable.$ref} to ${consumer.name}`,
		);
		// A consumption is the pair it joins, so a consumable that resolves to
		// nothing leaves no consumption to hang the rest of it on: the whole
		// entry is dropped and reported at the consumer, which is where it was
		// written.
		const consumable = refs.one(
			at,
			"consumable",
			A_CONSUMABLE,
			consumption.consumable,
		);
		if (!consumable) continue;
		consumer.addConsumption(consumable, {
			...consumption,
			by: refs.many(
				at,
				"by",
				A_CALLER,
				consumption.by,
				`its consumption of "${consumable.name}"`,
			),
			// The relationships are loaded before the consumptions for this
			// ref, since an agreement has to exist before an exchange can say
			// it belongs to it.
			relationship: refs.one(
				at,
				"relationship",
				AN_AGREEMENT,
				consumption.relationship,
				`its consumption of "${consumable.name}"`,
			),
		});
	}
}

/**
 * What an identity attribute names: an entity anywhere in the workspace; a
 * bounded context, for an id that belongs to a system whose entities are not
 * modelled (decision 28); or a schema that system publishes for the kind the
 * id names (decision 28, third amendment). Whether that context is really
 * external is `identifies-entity`'s to say; the loader only resolves what the
 * ref points at, so a model that names the wrong kind of context, or a schema
 * of a context whose insides it does state, loads and is reported rather than
 * throwing.
 */
function identifiedBy(
	workspace: Workspace,
	ref: string,
): IdentityTarget | undefined {
	const target = workspace.getByRef(ref);
	return target instanceof Entity ||
		target instanceof BoundedContext ||
		target instanceof DataSchema
		? target
		: undefined;
}

/**
 * Attributes may point at a value object, at another schema, or at the entity
 * or external context whose identity they hold, so they are added in the
 * second pass, once everything they can name exists.
 */
function addAttributes(
	owner: AttributeOwner,
	attributes: Record<string, AttributeSchema> | undefined,
	refs: Refs,
) {
	for (const [id, attributeSchema] of entriesOf(attributes)) {
		const at = site(
			"Attribute",
			`${owner.name}.${attributeSchema.name}`,
			`#/${owner.path}/attributes/${id}`,
		);
		owner.addAttribute(attributeSchema.name, {
			...attributeSchema,
			id,
			valueobject: refs.one(
				at,
				"valueobject",
				A_VALUE_OBJECT,
				attributeSchema.valueobject,
			),
			schema: refs.one(at, "schema", A_SCHEMA, attributeSchema.schema),
			identifies: refs.one(
				at,
				"identifies",
				AN_IDENTITY_TARGET,
				attributeSchema.identifies,
			),
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
	refs: Refs,
): BoundedContext {
	debug(`Adding bounded context: ${boundedcontextSchema.name}`);
	const at = site(
		"Bounded context",
		boundedcontextSchema.name,
		boundedcontextRef(id).$ref,
	);
	const boundedcontext = workspace.addBoundedContext(
		boundedcontextSchema.name,
		{
			...boundedcontextSchema,
			id,
			team: refs.one(at, "team", A_TEAM, boundedcontextSchema.team),
			subdomains: refs.many(
				at,
				"subdomains",
				A_SUBDOMAIN,
				boundedcontextSchema.subdomains,
			),
		},
	);

	for (const [serviceId, serviceSchema] of entriesOf(
		boundedcontextSchema.services,
	)) {
		debug(`Adding service: ${serviceSchema.name} to ${boundedcontext.name}`);
		boundedcontext.addService(serviceSchema.name, {
			...serviceSchema,
			id: serviceId,
		});
	}

	for (const [termId, termSchema] of entriesOf(boundedcontextSchema.glossary)) {
		boundedcontext.addTerm(termSchema.name, {
			...termSchema,
			id: termId,
			embodiedBy: undefined,
		});
	}

	for (const [invariantId, invariantSchema] of entriesOf(
		boundedcontextSchema.invariants,
	)) {
		boundedcontext.addInvariant(invariantSchema.name, {
			...invariantSchema,
			id: invariantId,
		});
	}

	// The consumables a policy joins may live in any context, so its two lists
	// are dropped here and joined in the second pass (linkPolicies).
	for (const [policyId, policySchema] of entriesOf(
		boundedcontextSchema.policies,
	)) {
		const { on: _on, then: _then, ...rest } = policySchema;
		boundedcontext.addPolicy(policySchema.name, { ...rest, id: policyId });
	}

	// The consumables a process joins may live in any context, so its four
	// lists are dropped here and joined in the second pass (linkProcesses),
	// exactly as a policy's are. Its deadlines are its own, so they are made
	// here, before anything can name one.
	for (const [processId, processSchema] of entriesOf(
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

	for (const [schemaId, schemaSchema] of entriesOf(
		boundedcontextSchema.schemas,
	)) {
		boundedcontext.addSchema(schemaSchema.name, {
			...schemaSchema,
			id: schemaId,
		});
	}

	for (const [valueobjectId, valueobjectSchema] of entriesOf(
		boundedcontextSchema.valueobjects,
	)) {
		// What it is a kind of is joined later: the parent may be in a context
		// this pass has not reached (linkSpecialisations).
		const valueobject = boundedcontext.addValueObject(valueobjectSchema.name, {
			...valueobjectSchema,
			id: valueobjectId,
			specialises: undefined,
		});

		for (const [invariantId, invariantSchema] of entriesOf(
			valueobjectSchema.invariants,
		)) {
			valueobject.addInvariant(invariantSchema.name, {
				...invariantSchema,
				id: invariantId,
			});
		}
	}

	for (const [aggregateId, aggregateSchema] of entriesOf(
		boundedcontextSchema.aggregates,
	)) {
		debug(
			`Adding aggregate: ${aggregateSchema.name} to ${boundedcontext.name}`,
		);
		const aggregate = boundedcontext.addAggregate(aggregateSchema.name, {
			...aggregateSchema,
			id: aggregateId,
		});

		for (const [invariantId, invariantSchema] of entriesOf(
			aggregateSchema.invariants,
		)) {
			aggregate.addInvariant(invariantSchema.name, {
				...invariantSchema,
				id: invariantId,
			});
		}
		for (const [entityId, entitySchema] of entriesOf(
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
		for (const [serviceId, schema] of entriesOf(
			boundedcontextSchema.services,
		)) {
			const provider = workspace.getServiceByRefOrThrow(
				serviceRef(boundedcontextId, serviceId).$ref,
			);
			yield { provider, schema };
		}
		for (const [aggregateId, schema] of entriesOf(
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
	refs: Refs,
) {
	for (const { provider, schema } of providersOf(workspace, workspaceSchema)) {
		addProvides(provider, schema, refs);
	}
	for (const { provider, schema } of providersOf(workspace, workspaceSchema)) {
		linkRaises(provider, schema, workspace, refs);
		addConsumes(provider, schema, refs);
	}

	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [schemaId, schemaSchema] of entriesOf(
			boundedcontextSchema.schemas,
		)) {
			addAttributes(
				workspace.getSchemaByRefOrThrow(
					schemaRef(boundedcontextId, schemaId).$ref,
				),
				schemaSchema.attributes,
				refs,
			);
		}

		for (const [valueobjectId, valueobjectSchema] of entriesOf(
			boundedcontextSchema.valueobjects,
		)) {
			const valueobject = workspace.getValueObjectByRefOrThrow(
				valueObjectRef(boundedcontextId, valueobjectId).$ref,
			);
			addAttributes(valueobject, valueobjectSchema.attributes, refs);
			const valueAt = site("Value object", valueobject.name, valueobject.ref);
			for (const relation of listOf(valueobjectSchema.relations)) {
				const target = refs.one(
					valueAt,
					"target",
					A_RELATION_TARGET,
					relation.target,
					`its "${relation.relation}" relation`,
				);
				if (target) valueobject.addRelation(target, relation);
			}

			// A value's rule is about its own attributes, so it is wired once
			// they exist, the way an aggregate's is below.
			for (const [invariantId, invariantSchema] of entriesOf(
				valueobjectSchema.invariants,
			)) {
				const invariant = workspace.getInvariantByRefOrThrow(
					valueObjectInvariantRef(boundedcontextId, valueobjectId, invariantId)
						.$ref,
				);
				for (const target of refs.many(
					site("Invariant", invariant.name, invariant.ref),
					"constrains",
					A_CONSTRAINABLE,
					invariantSchema.constrains,
				))
					invariant.constrains(target);
			}
		}

		for (const [aggregateId, aggregateSchema] of entriesOf(
			boundedcontextSchema.aggregates,
		)) {
			for (const [entityId, entitySchema] of entriesOf(
				aggregateSchema.entities,
			)) {
				const entity = workspace.getEntityByRefOrThrow(
					entityRef(boundedcontextId, aggregateId, entityId).$ref,
				);
				addAttributes(entity, entitySchema.attributes, refs);
				const entityAt = site("Entity", entity.name, entity.ref);
				for (const relation of listOf(entitySchema.relations)) {
					const target = refs.one(
						entityAt,
						"target",
						A_RELATION_TARGET,
						relation.target,
						`its "${relation.relation}" relation`,
					);
					if (target) entity.addRelation(target, relation);
				}
			}

			// Invariants come last: they may constrain attributes added just above.
			for (const [invariantId, invariantSchema] of entriesOf(
				aggregateSchema.invariants,
			)) {
				const invariant = workspace.getInvariantByRefOrThrow(
					invariantRef(boundedcontextId, aggregateId, invariantId).$ref,
				);
				for (const target of refs.many(
					site("Invariant", invariant.name, invariant.ref),
					"constrains",
					A_CONSTRAINABLE,
					invariantSchema.constrains,
				))
					invariant.constrains(target);
			}
		}

		// A context's invariants reach into any of its aggregates, so they are
		// wired once all of them have their attributes (decision 27).
		for (const [invariantId, invariantSchema] of entriesOf(
			boundedcontextSchema.invariants,
		)) {
			const invariant = workspace.getInvariantByRefOrThrow(
				contextInvariantRef(boundedcontextId, invariantId).$ref,
			);
			for (const target of refs.many(
				site("Invariant", invariant.name, invariant.ref),
				"constrains",
				A_CONSTRAINABLE,
				invariantSchema.constrains,
			))
				invariant.constrains(target);
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
	refs: Refs,
) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [valueobjectId, valueobjectSchema] of entriesOf(
			boundedcontextSchema.valueobjects,
		)) {
			if (!valueobjectSchema.specialises) continue;
			const valueobject = workspace.getValueObjectByRefOrThrow(
				valueObjectRef(boundedcontextId, valueobjectId).$ref,
			);
			valueobject.specialises = refs.one(
				site("Value object", valueobject.name, valueobject.ref),
				"specialises",
				A_VALUE_OBJECT,
				valueobjectSchema.specialises,
			);
		}
		for (const [aggregateId, aggregateSchema] of entriesOf(
			boundedcontextSchema.aggregates,
		)) {
			for (const [entityId, entitySchema] of entriesOf(
				aggregateSchema.entities,
			)) {
				if (!entitySchema.specialises) continue;
				const entity = workspace.getEntityByRefOrThrow(
					entityRef(boundedcontextId, aggregateId, entityId).$ref,
				);
				entity.specialises = refs.one(
					site("Entity", entity.name, entity.ref),
					"specialises",
					AN_ENTITY,
					entitySchema.specialises,
				);
			}
		}
	}
}

/** A term may be embodied by any element, so it is linked once all exist. */
function linkGlossary(
	workspace: Workspace,
	workspaceSchema: WorkspaceSchema,
	refs: Refs,
) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [termId, termSchema] of entriesOf(
			boundedcontextSchema.glossary,
		)) {
			if (!termSchema.embodiedBy) continue;
			const term = workspace.getTermByRefOrThrow(
				termRef(boundedcontextId, termId).$ref,
			);
			const embodiment = refs.one(
				site("Glossary term", term.name, term.ref),
				"embodiedBy",
				AN_ELEMENT,
				termSchema.embodiedBy,
			);
			if (embodiment) term.embody(embodiment);
		}
	}
}

/** Policies join consumables that may live in any context. */
function linkPolicies(
	workspace: Workspace,
	workspaceSchema: WorkspaceSchema,
	refs: Refs,
) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [policyId, policySchema] of entriesOf(
			boundedcontextSchema.policies,
		)) {
			const policy = workspace.getPolicyByRefOrThrow(
				policyRef(boundedcontextId, policyId).$ref,
			);
			const at = site("Policy", policy.name, policy.ref);
			policy.on(...refs.many(at, "on", A_REACTION_TRIGGER, policySchema.on));
			policy.issues(...refs.many(at, "then", A_CONSUMABLE, policySchema.then));
		}
	}
}

/**
 * What a process may wait for or end on: an event, an answer, or one of *its
 * own* deadlines.
 *
 * A deadline of another process is refused here rather than reported by a
 * rule, for the reason the DSL refuses it: a per-instance clock starts when
 * one instance began waiting, so no other reactor knows the instance exists,
 * and a ref to somebody else's is not a thing this field can name at all.
 */
function processTrigger(process: Process): Kind<ProcessTrigger> {
	return {
		what: "an event, an answer an operation comes back with, or one of this process's own deadlines",
		find: (workspace, ref) => {
			const found = workspace.getProcessTriggerByRef(ref);
			if (found instanceof Deadline && found.process !== process)
				return undefined;
			return found;
		},
	};
}

/**
 * What a deadline's `from` may name: one of the triggers the process already
 * waits for.
 *
 * A clock starts on a moment the instance can tell has arrived, and the only
 * moments it knows are the ones it listens for, so anything else is not a
 * thing this field can name — reported the same way a ref that names nothing
 * at all is, rather than throwing out of `countsFrom` at load.
 */
function deadlineAnchor(process: Process): Kind<ProcessTrigger> {
	const waitsFor = [...process.startEvents, ...process.events];
	const trigger = processTrigger(process);
	return {
		what: "one of the triggers this process starts or waits on",
		find: (workspace, ref) => {
			const found = trigger.find(workspace, ref);
			return found && waitsFor.includes(found) ? found : undefined;
		},
	};
}

/** Processes join consumables that may live in any context. */
function linkProcesses(
	workspace: Workspace,
	workspaceSchema: WorkspaceSchema,
	refs: Refs,
) {
	for (const [boundedcontextId, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		for (const [processId, processSchema] of entriesOf(
			boundedcontextSchema.processes,
		)) {
			const process = workspace.getProcessByRefOrThrow(
				processRef(boundedcontextId, processId).$ref,
			);
			const at = site("Process", process.name, process.ref);
			// What a process waits for, and what completes it, may be an answer
			// or one of its own deadlines rather than an event, so both resolve
			// to any of the three (decision 23).
			const trigger = processTrigger(process);
			process.starts(
				...refs.many(at, "starts", A_STARTING_TRIGGER, processSchema.starts),
			);
			process.on(...refs.many(at, "on", trigger, processSchema.on));
			process.issues(
				...refs.many(at, "then", A_CONSUMABLE, processSchema.then),
			);
			process.ends(...refs.many(at, "ends", trigger, processSchema.ends));
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
				const anchor = refs.one(
					site("Deadline", deadline.name, deadline.ref),
					"from",
					deadlineAnchor(process),
					deadlineSchema.from,
				);
				if (anchor) deadline.countsFrom(anchor);
			}
		}
	}
}

function addRelationships(
	workspace: Workspace,
	workspaceSchema: WorkspaceSchema,
	refs: Refs,
) {
	for (const relationship of workspaceSchema.relationships) {
		const written =
			"participants" in relationship
				? relationship.participants
				: [relationship.upstream, relationship.downstream];
		// A relationship is the pair it joins, so an end that resolves to
		// nothing leaves no relationship at all. It has no ref of its own until
		// both ends are known, so the miss is reported at the end that did
		// resolve, and at the ref as written when neither did.
		const ends = written.map((end) =>
			workspace.getBoundedContextByRef(end.$ref),
		);
		const landsOn = ends.find((it) => it !== undefined);
		const at = site(
			"Relationship",
			`${relationship.type} between "${written[0].$ref}" and "${written[1].$ref}"`,
			landsOn?.ref ?? written.find((_, i) => !ends[i])?.$ref ?? "",
		);
		const both = written.map((end, i) =>
			refs.one(
				at,
				"participants" in relationship
					? "participants"
					: i === 0
						? "upstream"
						: "downstream",
				A_CONTEXT,
				end,
			),
		);
		const [source, target] = both;
		if (!source || !target) continue;
		if ("participants" in relationship) {
			workspace.addRelationship({
				type: relationship.type,
				name: relationship.name,
				participants: [source, target],
				description: relationship.description,
				comments: relationship.comments,
				disposition: relationship.disposition,
			});
		} else {
			workspace.addRelationship({
				type: relationship.type,
				name: relationship.name,
				upstream: source,
				downstream: target,
				upstreamRoles: relationship.upstreamRoles,
				downstreamRoles: relationship.downstreamRoles,
				description: relationship.description,
				comments: relationship.comments,
				disposition: relationship.disposition,
			});
		}
	}
}

/**
 * Gives every ref that resolved to nothing back to the element that wrote it,
 * so `toSchema` writes it out again and the typo survives a round trip.
 *
 * It runs at the end rather than as each miss is recorded because several of
 * the refs are resolved before the element that wrote them exists — a
 * consumable's `returns` is needed to make the consumable — and by now every
 * element does. What a miss cannot be given back to is an element the load
 * did not leave behind: a consumption or a relationship whose own end named
 * nothing is not there to hold it, and neither is a relation, so those refs
 * are reported and dropped (see {@link UnresolvedWrites}). A `returns` keeps
 * its ref but not its `many`, which says how many of a shape a call comes
 * back with and means nothing until the shape resolves.
 */
function keepUnresolvedRefs(workspace: Workspace) {
	for (const written of workspace.unresolved) {
		const owner = workspace.getByRef(written.ref);
		if (owner && keepsUnresolvedWrites(owner))
			owner.unresolvedWrites.add(written.field, { $ref: written.target });
	}
}

/**
 * Notes what the file said its `odsVersion` was, when that is not a version
 * this core reads.
 *
 * The major is what is compared: it is bumped by the decision that breaks the
 * metamodel, so a file whose major differs was written against a model this
 * core reads differently, and a file that states none was written before the
 * version was written at all. Either way the load goes on and the file comes
 * back as much as it can, because a version mismatch is a mistake in the file
 * and a mistake is a diagnostic (decision 29, noted 2026-09-10). The minor and
 * the patch are additive by definition and say nothing here.
 */
function recordOdsVersion(workspace: Workspace, found: string | undefined) {
	const majorOf = (version: string) => version.split(".")[0];
	if (found !== undefined && majorOf(found) === majorOf(ODS_VERSION)) return;
	workspace.odsVersionMismatch = { found };
}

export function getWorkspaceFromSchema(
	workspaceSchema: WorkspaceSchema,
): Workspace {
	debug(`Creating workspace from schema: ${workspaceSchema.name}`);
	const workspace = new WorkspaceModel(workspaceSchema.name, {
		id: workspaceSchema.id,
		description: workspaceSchema.description,
		homepage: workspaceSchema.homepage,
		logoUrl: workspaceSchema.logoUrl,
		primaryColor: workspaceSchema.primaryColor,
		version: workspaceSchema.version,
		options: workspaceSchema.options,
	});
	recordOdsVersion(workspace, workspaceSchema.odsVersion);
	const refs = new Refs(workspace);

	addDomains(workspace, workspaceSchema);
	addTeams(workspace, workspaceSchema);
	for (const [id, boundedcontextSchema] of Object.entries(
		workspaceSchema.boundedcontexts,
	)) {
		addBoundedContext(workspace, id, boundedcontextSchema, refs);
	}
	// Relationships come before the references because a consumption may name
	// the agreement it belongs to, and they need nothing but the two contexts,
	// which exist by now.
	addRelationships(workspace, workspaceSchema, refs);
	linkSpecialisations(workspace, workspaceSchema, refs);
	linkReferences(workspace, workspaceSchema, refs);
	linkPolicies(workspace, workspaceSchema, refs);
	linkProcesses(workspace, workspaceSchema, refs);
	linkGlossary(workspace, workspaceSchema, refs);
	keepUnresolvedRefs(workspace);

	return workspace;
}
