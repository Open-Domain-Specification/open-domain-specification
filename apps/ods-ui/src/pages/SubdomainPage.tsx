import {
	Badge,
	Container,
	Grid,
	Stack,
	Title,
	Typography,
} from "@mantine/core";
import { marked } from "marked";
import type { Domain, Subdomain } from "open-domain-schema";
import { useParams } from "react-router-dom";
import { SubDomainCard } from "../components/SubDomainCard.tsx";
import { useWorkspace } from "../context/Workspace.tsx";
import { getSubdomainId } from "../utils/getSubdomainId.ts";
import { NotFoundPage } from "./NotFoundPage.tsx";

export function _DomainPage({ domain }: { domain: Domain }) {
	const htmlDescription = marked.parse(domain.description || "");

	return (
		<Container p={"md"}>
			<Stack gap={"xl"}>
				<Stack>
					<Title>{domain.name}</Title>
					<Badge>{domain.type}</Badge>
					{/** biome-ignore lint/security/noDangerouslySetInnerHtml: Parsed Markdown */}
					<Typography dangerouslySetInnerHTML={{ __html: htmlDescription }} />
				</Stack>
				<Stack>
					<Title order={2}>Subdomains</Title>
					<Grid>
						{domain.subdomains?.map((subdomain: Subdomain) => (
							<Grid.Col key={getSubdomainId(domain, subdomain)} span={4}>
								<SubDomainCard subdomain={subdomain} />
							</Grid.Col>
						))}
					</Grid>
				</Stack>
			</Stack>
		</Container>
	);
}

export function DomainPage() {
	const { domainId } = useParams<{ domainId: string }>();
	const { workspace } = useWorkspace();
	const domain = workspace.domains.find((domain) => domain.id === domainId);

	if (!domain) return <NotFoundPage />;
	return <_DomainPage domain={domain} />;
}
