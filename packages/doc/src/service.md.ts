import type { Consumption, Service } from "@open-domain-specification/core";
import { contextBreadcrumbsMd } from "./breadcrumbs.md";
import { providesTableMd } from "./consumables.md";
import { pathToConsumableMapSvg, pathToIndexMd } from "./lib/paths";
import type { Options } from "./options";

const consumptionSection = (consumption: Consumption) => `
### ${consumption.consumable.name} ${consumption.pattern ? `[${consumption.pattern}]` : ""}
${consumption.consumable.description}
- **Provider**: [${consumption.consumable.provider.name}](${pathToIndexMd(consumption.consumable.provider.path, consumption.consumer.path)})
`;

export const serviceMd = (service: Service, options?: Options) => `
${options?.breadcrumbs ? contextBreadcrumbsMd(service.boundedcontext) : ""}

# ${service.name}
${service.description}

![consumablemap](${pathToConsumableMapSvg(service.path, service.path)})

## Provides
${providesTableMd(service.consumables, service.path)}

## Consumes
${
	service.consumptions.length > 0
		? Array.from(service.consumptions.entries())
				.map(([_name, consumption]) => consumptionSection(consumption))
				.join("")
		: "> No consumptions."
}
	
`;
