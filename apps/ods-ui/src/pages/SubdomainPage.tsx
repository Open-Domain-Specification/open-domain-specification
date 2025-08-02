import { Grid, Stack, Title } from "@mantine/core";
import type { BoundedContext, Domain, Subdomain } from "open-domain-schema";
import { useParams } from "react-router-dom";
import { BoundedContextCard } from "../components/BoundedContextCard.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/Workspace.tsx";
import { Icons } from "../Icons.tsx";
import { getSubdomainId } from "../utils/getSubdomainId.ts";

export function _SubdomainPage({
	domain,
	subdomain,
}: {
	domain: Domain;
	subdomain: Subdomain;
}) {
	return (
		<PageSkeleton
			avatar={Icons.Subdomain}
			title={subdomain.name}
			description={subdomain.description}
		>
			<Stack>
				<Title order={2}>Bounded Contexts</Title>
				<Grid>
					{subdomain.boundedContexts?.map((boundedContext: BoundedContext) => (
						<Grid.Col
							key={getSubdomainId(domain, subdomain)}
							span={4}
							mih={200}
							display={"flex"}
						>
							<BoundedContextCard
								domain={domain}
								subdomain={subdomain}
								boundedContext={boundedContext}
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
	const domain = workspace.domains.find((domain) => domain.id === domainId);
	const subdomain = domain?.subdomains?.find(
		(subdomain) => subdomain.id === subdomainId,
	);

	return (
		<GenericWorkspacePage>
			{!domain || !subdomain ? (
				<GenericNotFoundContent />
			) : (
				<_SubdomainPage domain={domain} subdomain={subdomain} />
			)}
		</GenericWorkspacePage>
	);
}
