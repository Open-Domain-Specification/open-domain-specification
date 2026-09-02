import { Badge, Group, Text } from "@mantine/core";
import type { Consumable } from "@open-domain-specification/core";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";

/** The payload schema of a consumable and, for operations, the events it raises. */
export function ConsumableDetails(props: { consumable: Consumable }) {
	const nav = useRefNavigate();
	const { schema, raisedEvents } = props.consumable;
	if (!schema && raisedEvents.length === 0) return null;

	return (
		<Group gap={"md"}>
			{schema && (
				<Text size={"xs"} c={"dimmed"}>
					schema{" "}
					<Badge
						size={"sm"}
						variant={"outline"}
						style={{ cursor: "pointer" }}
						onClick={() => nav(schema.boundedcontext.ref)}
					>
						{schema.name}
					</Badge>
				</Text>
			)}
			{raisedEvents.length > 0 && (
				<Text size={"xs"} c={"dimmed"}>
					raises{" "}
					{raisedEvents.map((event) => (
						<Badge
							key={event.ref}
							size={"sm"}
							variant={"outline"}
							mr={4}
							style={{ cursor: "pointer" }}
							onClick={() => nav(event.provider.ref)}
						>
							{event.provider.name}.{event.name}
						</Badge>
					))}
				</Text>
			)}
		</Group>
	);
}
