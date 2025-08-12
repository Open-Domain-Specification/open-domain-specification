import { Grid, Title } from "@mantine/core";
import { DomainCard } from "../components/DomainCard.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";

export function HomePage() {
	const { workspace } = useWorkspace();
	const nav = useRefNavigate();

	return (
		<GenericWorkspacePage>
			<PageSkeleton
				avatar={workspace.workspace.logoUrl}
				title={workspace.workspace.name}
				description={workspace.workspace.description || ""}
			>
				<Title order={2}>Subdomains</Title>
				<Grid>
					{workspace.getDomains()?.map((domain) => (
						<Grid.Col key={domain.ref} span={4}>
							<DomainCard
								name={domain.name}
								description={domain.description}
								onClick={() => nav(domain.ref)}
							/>
						</Grid.Col>
					))}
				</Grid>
			</PageSkeleton>
		</GenericWorkspacePage>
	);
}
