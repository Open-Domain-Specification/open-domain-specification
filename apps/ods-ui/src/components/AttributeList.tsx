import { Code, Table, Text } from "@mantine/core";
import type { Attribute } from "@open-domain-specification/core";

/** The attributes of an entity, value object, event or command as a compact table. */
export function AttributeList(props: {
	attributes: ReadonlyMap<string, Attribute>;
}) {
	if (props.attributes.size === 0) return null;

	return (
		<Table withRowBorders={false} verticalSpacing={2}>
			<Table.Tbody>
				{Array.from(props.attributes.values()).map((attribute) => (
					<Table.Tr key={attribute.ref}>
						<Table.Td>
							<Text size={"sm"} fw={attribute.identity ? "bold" : undefined}>
								{attribute.name}
							</Text>
						</Table.Td>
						<Table.Td>
							<Code>{attribute.type}</Code>
						</Table.Td>
						<Table.Td>
							<Text size={"sm"} c={"dimmed"}>
								{attribute.description}
							</Text>
						</Table.Td>
					</Table.Tr>
				))}
			</Table.Tbody>
		</Table>
	);
}
