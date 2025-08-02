import { Alert, Grid, Stack, Title } from "@mantine/core";
import type {
	Aggregate,
	BoundedContext,
	ContextRelationship,
	Domain,
	Subdomain,
} from "open-domain-schema";
import { useParams } from "react-router-dom";
import { AggregateCard } from "../components/AggregateCard.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/Workspace.tsx";
import { Icons } from "../Icons.tsx";
import { getAggregateId } from "../utils/getAggregateId.ts";
import { getRelationshipId } from "../utils/getRelationshipId.ts";

export function _BoundedContextPage({
	domain,
	subdomain,
	boundedContext,
}: {
	domain: Domain;
	subdomain: Subdomain;
	boundedContext: BoundedContext;
}) {
	return (
		<PageSkeleton
			avatar={Icons.BoundedContext}
			title={boundedContext.name}
			description={boundedContext.description}
		>
			<Stack>
				<Title order={2}>Aggregates</Title>
				<Grid>
					{!boundedContext.aggregates?.length && (
						<Alert w={"100%"}>
							No aggregates exist in this bounded context.
						</Alert>
					)}
					{boundedContext.aggregates?.map((agg: Aggregate) => (
						<Grid.Col
							key={getAggregateId(domain, subdomain, boundedContext, agg)}
							span={4}
							mih={200}
							display={"flex"}
						>
							<AggregateCard
								domain={domain}
								subdomain={subdomain}
								boundedContext={boundedContext}
								aggregate={agg}
							/>
						</Grid.Col>
					))}
				</Grid>
			</Stack>
			<Stack>
				<Title order={2}>Relationships</Title>
				<Grid>
					{!boundedContext.relationships?.length && (
						<Alert w={"100%"}>
							No relationships exist in this bounded context.
						</Alert>
					)}
					{boundedContext.relationships?.map((rel: ContextRelationship) => (
						<Grid.Col
							key={getRelationshipId(domain, subdomain, boundedContext, rel)}
							span={4}
						>
							{JSON.stringify(rel)}
						</Grid.Col>
					))}
				</Grid>
			</Stack>
		</PageSkeleton>
	);
}

export function BoundedContextPage() {
	const { domainId, subdomainId, boundedContextId } = useParams<{
		domainId: string;
		subdomainId: string;
		boundedContextId: string;
	}>();
	const { workspace } = useWorkspace();
	const domain = workspace.domains.find((domain) => domain.id === domainId);
	const subdomain = domain?.subdomains?.find(
		(subdomain) => subdomain.id === subdomainId,
	);
	const boundedContext = subdomain?.boundedContexts?.find(
		(boundedContext) => boundedContext.id === boundedContextId,
	);

	return (
		<GenericWorkspacePage>
			{!domain || !subdomain || !boundedContext ? (
				<GenericNotFoundContent />
			) : (
				<_BoundedContextPage
					domain={domain}
					subdomain={subdomain}
					boundedContext={boundedContext}
				/>
			)}
		</GenericWorkspacePage>
	);
}
