import { Grid, Stack, Title } from "@mantine/core";
import { useParams } from "react-router-dom";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { SubDomainCard } from "../components/SubDomainCard.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";
import { Icons } from "../Icons.tsx";

export function _DomainPage(props: {
	domainId: string;
	name: string;
	description: string;
}) {
	const { workspace } = useWorkspace();
	const nav = useRefNavigate();

	return (
		<PageSkeleton
			avatar={Icons.Domain}
			title={props.name}
			description={props.description}
		>
			<Stack>
				<Title order={2}>Subdomains</Title>

				<Grid>
					{workspace
						.findSubdomainsByDomainId(props.domainId)
						?.map((subdomain) => (
							<Grid.Col key={subdomain.ref} span={4} mih={200} display={"flex"}>
								<SubDomainCard
									name={subdomain.name}
									description={subdomain.description}
									onClick={() => nav(subdomain.ref)}
								/>
							</Grid.Col>
						))}
				</Grid>
			</Stack>
		</PageSkeleton>
	);
}

export function DomainPage() {
	const { domainId } = useParams<{ domainId: string }>();
	const { workspace } = useWorkspace();
	const domain = workspace.findDomain(domainId!);

	return (
		<GenericWorkspacePage>
			{!domain ? (
				<GenericNotFoundContent />
			) : (
				<_DomainPage
					domainId={domain.domainId}
					name={domain.name}
					description={domain.description}
				/>
			)}
		</GenericWorkspacePage>
	);
}
