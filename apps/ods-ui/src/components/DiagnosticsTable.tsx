import { Anchor, Badge, ScrollArea, Table, Text } from "@mantine/core";
import type { Diagnostic } from "@open-domain-specification/core";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";

/** Navigable page for a diagnostic: the element's context, aggregate or service. */
function pageRef(ref: string): string {
	const match = ref.match(
		/^(#\/boundedcontexts\/[^/]+(?:\/(?:aggregates|services)\/[^/]+)?)/,
	);
	return match ? match[1] : ref;
}

/** The result of Workspace.validate as a table. */
export function DiagnosticsTable(props: { diagnostics: Diagnostic[] }) {
	const nav = useRefNavigate();

	if (props.diagnostics.length === 0) {
		return (
			<Text c={"dimmed"} size={"sm"}>
				No diagnostics. The model satisfies every rule ODS checks.
			</Text>
		);
	}

	return (
		<ScrollArea>
			<Table>
				<Table.Thead>
					<Table.Tr>
						<Table.Th>Severity</Table.Th>
						<Table.Th>Rule</Table.Th>
						<Table.Th>Message</Table.Th>
						<Table.Th>Element</Table.Th>
					</Table.Tr>
				</Table.Thead>
				<Table.Tbody>
					{props.diagnostics.map((d) => (
						<Table.Tr key={`${d.rule}|${d.ref}|${d.message}`}>
							<Table.Td>
								<Badge color={d.severity === "error" ? "red" : "yellow"}>
									{d.severity}
								</Badge>
							</Table.Td>
							<Table.Td>{d.rule}</Table.Td>
							<Table.Td>{d.message}</Table.Td>
							<Table.Td>
								<Anchor size={"sm"} onClick={() => nav(pageRef(d.ref))}>
									{d.ref.replace(/^#\//, "")}
								</Anchor>
							</Table.Td>
						</Table.Tr>
					))}
				</Table.Tbody>
			</Table>
		</ScrollArea>
	);
}
