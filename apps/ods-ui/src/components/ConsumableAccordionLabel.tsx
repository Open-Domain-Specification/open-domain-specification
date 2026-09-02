import { Badge, Group } from "@mantine/core";
import type { Consumable } from "@open-domain-specification/core";
import { ConsumablePatternBadge } from "./ConsumablePatternBadge.tsx";
import { ResponsiveText } from "./ResponsiveText.tsx";

/** Name, type, internal marker and upstream role of a consumable. */
export function ConsumableAccordionLabel(props: { consumable: Consumable }) {
	return (
		<Group justify={"space-between"} align={"center"} pr={"md"}>
			<ResponsiveText>{props.consumable.name}</ResponsiveText>
			<Group gap={"xs"}>
				<Badge size={"sm"} variant={"light"}>
					{props.consumable.type}
				</Badge>
				{props.consumable.internal && (
					<Badge size={"sm"} variant={"light"} color={"gray"}>
						internal
					</Badge>
				)}
				<ConsumablePatternBadge pattern={props.consumable.pattern} />
			</Group>
		</Group>
	);
}
