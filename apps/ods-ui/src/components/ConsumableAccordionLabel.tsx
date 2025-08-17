import { Group } from "@mantine/core";
import type { Consumable } from "@open-domain-specification/core";
import { ConsumablePatternBadge } from "./ConsumablePatternBadge.tsx";
import { ResponsiveText } from "./ResponsiveText.tsx";

export function ConsumableAccordionLabel(props: { consumable: Consumable }) {
	return (
		<Group justify={"space-between"} align={"center"} pr={"md"}>
			<ResponsiveText>{props.consumable.name}</ResponsiveText>
			<ConsumablePatternBadge pattern={props.consumable.pattern} />
		</Group>
	);
}
