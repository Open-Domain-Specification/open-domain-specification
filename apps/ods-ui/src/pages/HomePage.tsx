import { AppShell, Stack } from "@mantine/core";
import {
	ODSConsumptionGraph,
	ODSContextMap,
} from "@open-domain-specification/core";
import { contextMapToDigraph } from "@open-domain-specification/graphviz";
import { ConsumptionTable } from "../components/ConsumptionTable.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { Graphviz } from "../components/Graphviz.tsx";
import { PageNavigation } from "../components/PageNavigation.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { PageSubtitle } from "../components/PageSubtitle.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";
import { Icons } from "../Icons.tsx";

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

				<Stack>
					<PageSubtitle title={"Relationships"} />
					<ConsumptionTable
						graph={ODSConsumptionGraph.fromWorkspace(workspace)}
					/>
				</Stack>
			</PageSkeleton>
			<AppShell.Aside p={"md"}>
				<PageNavigation
					sections={[
						{
							title: "Domains",
							items: Array.from(workspace.domains.values()).map((domain) => ({
								ref: domain.ref,
								name: domain.name,
								icon: Icons.Domain,
								onClick: () => nav(domain.ref),
							})),
						},
					]}
				/>
			</AppShell.Aside>
		</GenericWorkspacePage>
	);
}
