import { Group } from "@mantine/core";
import type { Consumption } from "@open-domain-specification/core";
import { ConsumablePatternBadge } from "./ConsumablePatternBadge.tsx";
import { ConsumptionPatternBadge } from "./ConsumptionPatternBadge.tsx";
import { ResponsiveText } from "./ResponsiveText.tsx";

export function ConsumptionAccordionLabel(props: { consumption: Consumption }) {
	return (
		<Group justify={"space-between"} align={"center"} pr={"md"}>
			<Group gap={"xs"}>
				<ResponsiveText>{props.consumption.consumable.name}</ResponsiveText>
				<ConsumptionPatternBadge pattern={props.consumption.pattern} />
			</Group>
			<ConsumablePatternBadge pattern={props.consumption.consumable.pattern} />
		</Group>
	);
}
