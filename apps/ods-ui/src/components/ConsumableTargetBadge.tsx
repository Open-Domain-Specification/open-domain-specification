import { Badge, Text } from "@mantine/core";
import type { Consumable } from "@open-domain-specification/core";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";

/** The command an operation exposes, or the event an event consumable publishes. */
export function ConsumableTargetBadge(props: { consumable: Consumable }) {
	const nav = useRefNavigate();
	const target = props.consumable.command ?? props.consumable.event;
	if (!target) return null;

	return (
		<Text size={"xs"} c={"dimmed"}>
			{props.consumable.command ? "exposes" : "publishes"}{" "}
			<Badge
				size={"sm"}
				variant={"outline"}
				style={{ cursor: "pointer" }}
				onClick={() => nav(target.aggregate.ref)}
			>
				{target.aggregate.name}.{target.name}
			</Badge>
		</Text>
	);
}
