import { Grid, Title } from "@mantine/core";
import { ODSContextMap } from "@open-domain-specification/core";
import { contextMapToDigraph } from "@open-domain-specification/graphviz";
import { DomainCard } from "../components/DomainCard.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { Graphviz } from "../components/Graphviz.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";

export function HomePage() {
	const { workspace } = useWorkspace();
	const nav = useRefNavigate();

	return (
		<GenericWorkspacePage>
			<PageSkeleton
				avatar={workspace.logoUrl}
				title={workspace.name}
				description={workspace.description || ""}
			>
				<Graphviz
					title={`${workspace.name} Context Map`}
					height={"50vh"}
					dot={contextMapToDigraph(
						ODSContextMap.fromWorkspace(workspace),
					).toDot()}
				/>
				<Title order={2}>Subdomains</Title>
				<Grid>
					{Array.from(workspace.domains.values()).map((domain) => (
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
