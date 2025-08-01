import { Badge, Group, Title } from "@mantine/core";
import { useWorkspace } from "./context/Workspace.tsx";

export function Header() {
	const { workspace } = useWorkspace();

	return (
		<Group>
			<Title>
				{workspace.name} | {workspace.version}
			</Title>
			<Badge>{workspace.odsVersion}</Badge>
		</Group>
	);
}
