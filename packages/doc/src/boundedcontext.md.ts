import {
	type Aggregate,
	type BoundedContext,
	constrainableLabel,
	type DataSchema,
	type Invariant,
	ODSConsumptionGraph,
	type Policy,
	type Process,
	type Service,
	type ValueObject,
} from "@open-domain-specification/core";
import { attributeListMd } from "./attributes.md";
import { contextBreadcrumbsMd } from "./breadcrumbs.md";
import { glossaryTableMd } from "./glossary.md";
import { markdownTable } from "./lib/markdown-table";
import {
	pathToContextMapSvg,
	pathToFlowMapSvg,
	pathToIndexMd,
} from "./lib/paths";
import { aggregatesHolding } from "./lib/value-objects";
import type { Options } from "./options";
import { strategicPositionMd } from "./strategic-position.md";
import { teamLinkMd } from "./team.md";

const aggregateSection = (aggregate: Aggregate) => `
### [${aggregate.name}](${pathToIndexMd(aggregate.path, aggregate.boundedcontext.path)})
${aggregate.description}

`;

const policySection = (policy: Policy) => [
	policy.name,
	policy.description,
	policy.events.map((it) => it.name).join(", ") || "-",
	policy.commands.map((it) => it.name).join(", ") || "-",
];

// The lifecycle in four columns, in the order it runs: what begins an
// instance, what it waits for, what it does and what finishes it.
const processSection = (process: Process) => [
	process.name,
	process.description,
	process.startEvents.map((it) => it.name).join(", ") || "-",
	process.events.map((it) => it.name).join(", ") || "-",
	process.commands.map((it) => it.name).join(", ") || "-",
	process.endEvents.map((it) => it.name).join(", ") || "-",
];

const schemaSection = (schema: DataSchema) => [
	schema.name,
	schema.description ?? "-",
	attributeListMd(schema.attributes, schema.boundedcontext.path),
	schema.consumables.map((it) => it.name).join(", ") || "-",
];

const valueObjectSection = (valueObject: ValueObject) => [
	// A kind says so beside its name, and lists what it has from the value
	// object it is a kind of along with its own (decision 22).
	valueObject.specialises
		? `${valueObject.name} (a kind of ${valueObject.specialises.name})`
		: valueObject.name,
	valueObject.description,
	attributeListMd(
		valueObject.attributes,
		valueObject.boundedcontext.path,
		valueObject.inheritedAttributes,
	),
	// A value's own rules, which hold by construction: no save keeps them and
	// no operation guards them, so they read as one sentence each and stay on
	// the value's row (decision 27).
	Array.from(
		valueObject.invariants.values(),
		(it) => `${it.name}: ${it.description}`,
	).join("; ") || "-",
	aggregatesHolding(valueObject)
		.map((it) => it.name)
		.join(", ") || "-",
];

// The same three columns the aggregate page uses, because a rule reads the
// same either way; what changes is which boundary keeps it (decision 27).
const invariantSection = (invariant: Invariant) => [
	invariant.name,
	invariant.description,
	invariant.targets.map(constrainableLabel).join(", ") || "-",
];

/**
 * The flow map image, for whichever of the two behaviour sections comes
 * first: one diagram draws the policies and the processes together, so the
 * second section names its rows and leaves the picture where it is.
 */
const flowMapMd = (boundedcontext: BoundedContext) =>
	`![flowmap](${pathToFlowMapSvg(boundedcontext.path, boundedcontext.path)})\n\n`;

const serviceSection = (service: Service) => `
### [${service.name}](${pathToIndexMd(service.path, service.boundedcontext.path)})
${service.description}

`;

export const boundedcontextMd = (
	boundedcontext: BoundedContext,
	options?: Options,
) => `
${options?.breadcrumbs ? contextBreadcrumbsMd(boundedcontext) : ""}
# ${boundedcontext.name}
${boundedcontext.bigBallOfMud ? "> ⚠️ **Big ball of mud.** This context's model is not coherent; neighbours should protect themselves with an anti-corruption layer.\n\n" : ""}${boundedcontext.external ? "> **External system.** A system the enterprise does not own: only what it provides and consumes is modelled here, never its insides.\n\n" : ""}${boundedcontext.description}

${boundedcontext.team ? `**Owned by:** ${teamLinkMd(boundedcontext.team)}\n` : ""}
## Serves
${
	boundedcontext.subdomains.size > 0
		? Array.from(boundedcontext.subdomains)
				.map(
					(subdomain) =>
						`- [${subdomain.domain.name} / ${subdomain.name}](${pathToIndexMd(subdomain.path, boundedcontext.path)}) (${subdomain.type})`,
				)
				.join("\n")
		: "> No subdomains."
}

![contextmap](${pathToContextMapSvg(boundedcontext.path, boundedcontext.path)})

## Glossary
${glossaryTableMd(boundedcontext)}

## Aggregates
${
	boundedcontext.aggregates.size > 0
		? Array.from(boundedcontext.aggregates.entries())
				.map(([_name, aggregate]) => aggregateSection(aggregate))
				.join("")
		: "> No aggregates."
}
	
## Services
${
	boundedcontext.services.size > 0
		? Array.from(boundedcontext.services.entries())
				.map(([_name, service]) => serviceSection(service))
				.join("")
		: "> No services."
}

## Invariants
${
	boundedcontext.invariants.size > 0
		? `Rules that hold across this context's instances and aggregates; each names the operation that checks it before acting.

${markdownTable(
	["Name", "Description", "Constrains"],
	Array.from(boundedcontext.invariants.values()).map(invariantSection),
)}`
		: "> No invariants across aggregates."
}

## Value Objects
${
	boundedcontext.valueobjects.size > 0
		? markdownTable(
				["Name", "Description", "Attributes", "Invariants", "Used by"],
				Array.from(boundedcontext.valueobjects.values()).map(
					valueObjectSection,
				),
			)
		: "> No value objects."
}

## Schemas
${
	boundedcontext.schemas.size > 0
		? markdownTable(
				["Name", "Description", "Attributes", "Used by"],
				Array.from(boundedcontext.schemas.values()).map(schemaSection),
			)
		: "> No schemas."
}

## Policies
${
	boundedcontext.policies.size > 0
		? `${flowMapMd(boundedcontext)}${markdownTable(
				["Name", "Description", "On", "Then"],
				Array.from(boundedcontext.policies.values()).map(policySection),
			)}`
		: "> No policies."
}

## Processes
${
	boundedcontext.processes.size > 0
		? `Reactions that hold state across events: each one remembers which of its events have arrived and says what finishes it.

${boundedcontext.policies.size === 0 ? flowMapMd(boundedcontext) : ""}${markdownTable(
	["Name", "Description", "Starts", "On", "Then", "Ends"],
	Array.from(boundedcontext.processes.values()).map(processSection),
)}`
		: "> No processes."
}

## Context Relationships
${strategicPositionMd(boundedcontext)}

## Consumptions
${markdownTable(
	[
		"Consumer",
		"Made By",
		"Consumed As",
		"Provider",
		"Consumable",
		"Provided As",
	],
	ODSConsumptionGraph.fromBoundedContext(boundedcontext).consumptions.map(
		(it) => [
			`[${it.consumer.name}](${pathToIndexMd(it.consumer.path, boundedcontext.path)})`,
			// Absent means the whole consumer, which is the common case.
			it.by.map((by) => by.name).join(", ") || "-",
			it.pattern ?? "-",
			it.consumable.provider.name,
			it.consumable.name,
			it.consumable.pattern ?? "-",
		],
	),
)}

`;
