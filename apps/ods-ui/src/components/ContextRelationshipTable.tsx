import { Badge, ScrollArea, Table } from "@mantine/core";
import type { ODSContextMap } from "@open-domain-specification/core";

/** The strategic relationships on a context map, declared and implied. */
export function ContextRelationshipTable(props: { map: ODSContextMap }) {
	const edges = Array.from(props.map.edges.values());

	return (
		<ScrollArea>
			<Table>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Upstream</Table.Th>
						<Table.Th>Relationship</Table.Th>
						<Table.Th>Downstream</Table.Th>
						<Table.Th>Upstream Roles</Table.Th>
						<Table.Th>Downstream Roles</Table.Th>
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>
					{edges.map((edge) => (
						<Table.Tr key={`${edge.source.id}|${edge.target.id}|${edge.type}`}>
							<Table.Td>{edge.source.name}</Table.Td>
							<Table.Td>
								{edge.type}{" "}
								{edge.implied && (
									<Badge size={"xs"} variant={"outline"}>
										implied
									</Badge>
								)}
							</Table.Td>
							<Table.Td>{edge.target.name}</Table.Td>
							<Table.Td>{edge.upstreamRoles.join(", ") || "-"}</Table.Td>
							<Table.Td>{edge.downstreamRoles.join(", ") || "-"}</Table.Td>
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>
		</ScrollArea>
	);
}
