import { Container, Grid, Stack, Title, Typography } from "@mantine/core";
import { marked } from "marked";
import type { BoundedContext, Domain, Subdomain } from "open-domain-schema";
import { useParams } from "react-router-dom";
import { BoundedContextCard } from "../components/BoundedContextCard.tsx";
import { useWorkspace } from "../context/Workspace.tsx";
import { getSubdomainId } from "../utils/getSubdomainId.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";

export function _SubdomainPage({
	domain,
	subdomain,
}: {
	domain: Domain;
	subdomain: Subdomain;
}) {
	const htmlDescription = marked.parse(subdomain.description || "");

	return (
		<Container p={"md"}>
			<Stack gap={"xl"}>
				<Stack>
					<Title>{subdomain.name}</Title>
					{/** biome-ignore lint/security/noDangerouslySetInnerHtml: Parsed Markdown */}
					<Typography dangerouslySetInnerHTML={{ __html: htmlDescription }} />
				</Stack>
				<Stack>
					<Title order={2}>Bounded Contexts</Title>
					<Grid>
						{subdomain.boundedContexts?.map(
							(boundedContext: BoundedContext) => (
								<Grid.Col key={getSubdomainId(domain, subdomain)} span={4}>
									<BoundedContextCard
										domain={domain}
										subdomain={subdomain}
										boundedContext={boundedContext}
									/>
								</Grid.Col>
							),
						)}
					</Grid>
				</Stack>
			</Stack>
		</Container>
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

	if (!domain || !subdomain) return <NotFoundPage />;
	return <_SubdomainPage domain={domain} subdomain={subdomain} />;
}
