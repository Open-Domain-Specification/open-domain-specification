import { Grid, Title } from "@mantine/core";
import type { Domain } from "open-domain-schema";
import { DomainCard } from "../components/DomainCard.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/Workspace.tsx";

export function HomePage() {
	const { workspace } = useWorkspace();

	return (
		<GenericWorkspacePage>
			<PageSkeleton
				avatar={workspace.logoUrl}
				title={workspace.name}
				description={workspace.description || ""}
			>
				<Title order={2}>Subdomains</Title>
				<Grid>
					{workspace.domains.map((domain: Domain) => (
						<Grid.Col key={domain.id} span={4}>
							<DomainCard domain={domain} />
						</Grid.Col>
					))}
				</Grid>
			</PageSkeleton>
		</GenericWorkspacePage>
	);
}
