import { Alert, Grid, Stack, Title } from "@mantine/core";
import { useParams } from "react-router-dom";
import { AggregateCard } from "../components/AggregateCard.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { ServiceCard } from "../components/ServiceCard.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";
import { Icons } from "../Icons.tsx";

export function _BoundedContextPage(props: {
	name: string;
	description: string;
	domainId: string;
	subdomainId: string;
	boundedcontextId: string;
}) {
	const { workspace } = useWorkspace();
	const nav = useRefNavigate();

	const aggregates =
		workspace.findAggregatesByDomainIdSubdomainIdAndBoundedContextId(
			props.domainId,
			props.subdomainId,
			props.boundedcontextId,
		);

	const services =
		workspace.findServicesByDomainIdSubdomainIdAndBoundedContextId(
			props.domainId,
			props.subdomainId,
			props.boundedcontextId,
		);

	return (
		<PageSkeleton
			avatar={Icons.BoundedContext}
			title={props.name}
			description={props.description}
		>
			<Stack>
				<Title order={2}>Aggregates</Title>
				<Grid>
					{!aggregates?.length && (
						<Alert w={"100%"}>
							No aggregates exist in this bounded context.
						</Alert>
					)}
					{aggregates?.map((agg) => (
						<Grid.Col key={agg.ref} span={4} mih={200} display={"flex"}>
							<AggregateCard
								name={agg.name}
								description={agg.description}
								onClick={() => nav(agg.ref)}
							/>
						</Grid.Col>
					))}
				</Grid>
			</Stack>
			<Stack>
				<Title order={2}>Services</Title>
				<Grid>
					{!services?.length && (
						<Alert w={"100%"}>No services exist in this bounded context.</Alert>
					)}
					{services?.map((service) => (
						<Grid.Col key={service.ref} span={4} mih={200} display={"flex"}>
							<ServiceCard
								name={service.name}
								description={service.description}
								type={service.type}
								onClick={() => nav(service.ref)}
							/>
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

	const boundedContext =
		workspace.findBoundedContextByDomainIdSubdomainIdAndBoundedContextId(
			domainId!,
			subdomainId!,
			boundedContextId!,
		);

	return (
		<GenericWorkspacePage>
			{!boundedContext ? (
				<GenericNotFoundContent />
			) : (
				<_BoundedContextPage
					name={boundedContext.name}
					description={boundedContext.description}
					domainId={domainId!}
					subdomainId={subdomainId!}
					boundedcontextId={boundedContextId!}
				/>
			)}
		</GenericWorkspacePage>
	);
}
