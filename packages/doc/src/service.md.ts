import type {
	Consumable,
	Consumption,
	Service,
} from "@open-domain-specification/core";
import { breadcrumbsMd } from "./breadcrumbs.md";
import { pathToConsumableMapSvg, pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";

const consumableSection = (consumable: Consumable) => `
### (${consumable.type}) - ${consumable.name} [${consumable.pattern}]
${consumable.description}
`;

const consumptionSection = (consumption: Consumption) => `
### ${consumption.consumable.name} [${consumption.pattern}]
${consumption.consumable.description}
- **Provider**: [${consumption.consumable.provider.name}](${pathToIndexMd(consumption.consumable.provider.path, consumption.consumer.path)})
`;

export const serviceMd = (service: Service, options?: Options) => `
${options?.breadcrumbs ? breadcrumbsMd(service.boundedcontext.subdomain.domain.workspace, service.boundedcontext.subdomain.domain, service.boundedcontext.subdomain, service.boundedcontext) : ""}

# ${service.name}
${service.description}

![consumablemap](${pathToConsumableMapSvg(service.path, service.path)})

## Provides
${
	service.consumables.size > 0
		? Array.from(service.consumables.entries())
				.map(([_name, consumable]) => consumableSection(consumable))
				.join("")
		: "> No consumables."
}

## Consumes
${
	service.consumptions.length > 0
		? Array.from(service.consumptions.entries())
				.map(([_name, consumption]) => consumptionSection(consumption))
				.join("")
		: "> No consumptions."
}
	
`;
