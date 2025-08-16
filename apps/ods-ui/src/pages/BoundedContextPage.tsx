import { Alert, Grid, Stack, Title } from "@mantine/core";
import {
	type BoundedContext,
	boundedcontextRef,
	ODSConsumptionGraph,
	ODSContextMap,
} from "@open-domain-specification/core";
import { contextMapToDigraph } from "@open-domain-specification/graphviz";
import { useParams } from "react-router-dom";
import { AggregateCard } from "../components/AggregateCard.tsx";
import { ConsumptionTable } from "../components/ConsumptionTable.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { Graphviz } from "../components/Graphviz.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { ServiceCard } from "../components/ServiceCard.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { useRefNavigate } from "../hooks/useRefNavigate.ts";
import { Icons } from "../Icons.tsx";

export function _BoundedContextPage(props: { boundedcontext: BoundedContext }) {
	const nav = useRefNavigate();

	return (
		<PageSkeleton
			avatar={Icons.BoundedContext}
			title={props.boundedcontext.name}
			description={props.boundedcontext.description}
		>
			<Graphviz
				title={`${props.boundedcontext.name} Context Map`}
				height={"50vh"}
				dot={contextMapToDigraph(
					ODSContextMap.fromBoundedContext(props.boundedcontext),
				).toDot()}
			/>
			<Stack>
				<Title order={2}>Aggregates</Title>
				<Grid>
					{!props.boundedcontext.aggregates.size && (
						<Alert w={"100%"}>
							No aggregates exist in this bounded context.
						</Alert>
					)}
					{Array.from(props.boundedcontext.aggregates.values()).map((agg) => (
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
					{!props.boundedcontext.services?.size && (
						<Alert w={"100%"}>No services exist in this bounded context.</Alert>
					)}
					{Array.from(props.boundedcontext.services.values()).map((service) => (
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
			<Stack>
				<Title order={2}>Relationships</Title>
				<ConsumptionTable
					graph={ODSConsumptionGraph.fromBoundedContext(props.boundedcontext)}
				/>
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

	const boundedContext = workspace.getBoundedContextByRefOrThrow(
		boundedcontextRef(domainId!, subdomainId!, boundedContextId!).$ref,
	);

	return (
		<GenericWorkspacePage>
			{!boundedContext ? (
				<GenericNotFoundContent />
			) : (
				<_BoundedContextPage boundedcontext={boundedContext} />
			)}
		</GenericWorkspacePage>
	);
}
