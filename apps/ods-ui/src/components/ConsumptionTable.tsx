import { ScrollArea, Table } from "@mantine/core";
import type { ODSConsumptionGraph } from "@open-domain-specification/core";

export function ConsumptionTable(props: { graph: ODSConsumptionGraph }) {
	return (
		<ScrollArea>
			<Table>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Consumer</Table.Th>
						<Table.Th>Consumed As</Table.Th>
						<Table.Th>Provider</Table.Th>
						<Table.Th>Consumable</Table.Th>
						<Table.Th>Provided As</Table.Th>
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>
					{props.graph.consumptions.map((consumption) => (
						<Table.Tr
							key={consumption.consumer.ref + consumption.consumable.ref}
						>
							<Table.Td>{consumption.consumer.name}</Table.Td>
							<Table.Td>{consumption.pattern}</Table.Td>
							<Table.Td>{consumption.consumable.provider.name}</Table.Td>
							<Table.Td>{consumption.consumable.name}</Table.Td>
							<Table.Td>{consumption.consumable.pattern}</Table.Td>
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>
		</ScrollArea>
	);
}
