import { Grid, Stack, Title } from "@mantine/core";
import type { Domain, Subdomain } from "open-domain-schema";
import { useParams } from "react-router-dom";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { SubDomainCard } from "../components/SubDomainCard.tsx";
import { useWorkspace } from "../context/Workspace.tsx";
import { Icons } from "../Icons.tsx";
import { getSubdomainId } from "../utils/getSubdomainId.ts";

export function _DomainPage({ domain }: { domain: Domain }) {
	return (
		<PageSkeleton
			avatar={Icons.Domain}
			title={domain.name}
			description={domain.description}
		>
			<Stack>
				<Title order={2}>Subdomains</Title>
				<Grid>
					{domain.subdomains?.map((subdomain: Subdomain) => (
						<Grid.Col
							key={getSubdomainId(domain, subdomain)}
							span={4}
							mih={200}
							display={"flex"}
						>
							<SubDomainCard subdomain={subdomain} />
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
	const domain = workspace.domains.find((domain) => domain.id === domainId);

	return (
		<GenericWorkspacePage>
			{!domain ? <GenericNotFoundContent /> : <_DomainPage domain={domain} />}
		</GenericWorkspacePage>
	);
}
