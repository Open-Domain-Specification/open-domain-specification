import { Grid, Stack, Title } from "@mantine/core";
import { useParams } from "react-router-dom";
import { BoundedContextCard } from "../components/BoundedContextCard.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { Mermaid } from "../components/Mermaid.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";
import { Icons } from "../Icons.tsx";
import { contextMapToMermaidFlowchart } from "../lib/diagrams/mermaid/contextMapToMermaidFlowchart.ts";
import { subdomainContextMap } from "../utils/subdomainContextMap.ts";

export function _SubdomainPage(props: {
	name: string;
	description: string;
	domainId: string;
	subdomainId: string;
}) {
	const { workspace } = useWorkspace();
	const nav = useRefNavigate();
	return (
		<PageSkeleton
			avatar={Icons.Subdomain}
			title={props.name}
			description={props.description}
		>
			<Stack>
				<Title order={2}>Bounded Contexts</Title>
				<Mermaid
					chart={contextMapToMermaidFlowchart(
						subdomainContextMap(
							workspace.sqlJsDatabase!,
							props.domainId,
							props.subdomainId,
						),
					)}
				/>
				<Grid>
					{workspace
						.findBoundedcontextsByDomainIdAndSubdomainId(
							props.domainId,
							props.subdomainId,
						)
						?.map((boundedContext) => (
							<Grid.Col
								key={boundedContext.ref}
								span={4}
								mih={200}
								display={"flex"}
							>
								<BoundedContextCard
									name={boundedContext.name}
									description={boundedContext.description}
									onClick={() => nav(boundedContext.ref)}
								/>
							</Grid.Col>
						))}
				</Grid>
			</Stack>
		</PageSkeleton>
	);
}

export function SubdomainPage() {
	const { domainId, subdomainId } = useParams<{
		domainId: string;
		subdomainId: string;
	}>();
	const { workspace } = useWorkspace();
	const subdomain = workspace.findSubdomainByDomainIdAndSubdomainId(
		domainId!,
		subdomainId!,
	);

	return (
		<GenericWorkspacePage>
			{!subdomain ? (
				<GenericNotFoundContent />
			) : (
				<_SubdomainPage
					name={subdomain.name}
					description={subdomain.description}
					domainId={domainId!}
					subdomainId={subdomainId!}
				/>
			)}
		</GenericWorkspacePage>
	);
}
