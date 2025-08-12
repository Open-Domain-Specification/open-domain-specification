import { Badge, Group } from "@mantine/core";

export function ConsumableAccordionLabel(props: {
	name: string;
	pattern: string;
}) {
	return (
		<Group justify={"space-between"} align={"center"} pr={"md"}>
			<Group>{props.name}</Group>
			<Badge variant={"default"}>{props.pattern}</Badge>
		</Group>
	);
}
