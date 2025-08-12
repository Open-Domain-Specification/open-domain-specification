import { ActionIcon, Badge, Group } from "@mantine/core";
import { VscLinkExternal } from "react-icons/vsc";
import { useOpenConsumable } from "../hooks/useOpenConsumable.ts";

export function ConsumptionAccordionLabel(props: {
	name: string;
	pattern: string;
	consumptionPattern: string;
	consumableRef: string;
}) {
	const onOpen = useOpenConsumable(props.consumableRef);

	return (
		<Group justify={"space-between"} align={"center"} pr={"md"}>
			<Group>
				{props.name}
				<Badge variant={"light"}>{props.consumptionPattern}</Badge>
			</Group>
			<Group>
				<Badge variant={"default"}>{props.pattern}</Badge>
				<ActionIcon size={"sm"} variant={"light"} onClick={onOpen}>
					<VscLinkExternal />
				</ActionIcon>
			</Group>
		</Group>
	);
}
