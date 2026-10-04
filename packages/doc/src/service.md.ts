import type { Service } from "@open-domain-specification/core";
import { contextBreadcrumbsMd } from "./breadcrumbs.md";
import { providesTableMd } from "./consumables.md";
import { consumptionSectionMd } from "./consumptions.md";
import { pathToConsumableMapSvg, placed } from "./lib/paths";
import type { Options } from "./options";

export const serviceMd = (service: Service, options?: Options) => `
${options?.breadcrumbs ? contextBreadcrumbsMd(service.boundedcontext) : ""}

# ${service.name}
${service.description}

![consumablemap](${pathToConsumableMapSvg(placed(service), placed(service))})

## Provides
${providesTableMd(service.consumables, placed(service))}

## Consumes
${
	service.consumptions.length > 0
		? Array.from(service.consumptions.entries())
				.map(([_name, consumption]) => consumptionSectionMd(consumption))
				.join("")
		: "> No consumptions."
}
	
`;
