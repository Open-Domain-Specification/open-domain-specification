import { AppShell, Stack } from "@mantine/core";
import {
	type BoundedContext,
	boundedcontextRef,
	ODSConsumptionGraph,
	ODSContextMap,
} from "@open-domain-specification/core";
import { contextMapToDigraph } from "@open-domain-specification/graphviz";
import { useParams } from "react-router-dom";
import { ConsumptionTable } from "../components/ConsumptionTable.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { Graphviz } from "../components/Graphviz.tsx";
import { PageNavigation } from "../components/PageNavigation.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { PageSubtitle } from "../components/PageSubtitle.tsx";
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
				<PageSubtitle title={"Relationships"} />
				<ConsumptionTable
					graph={ODSConsumptionGraph.fromBoundedContext(props.boundedcontext)}
				/>
			</Stack>

			<AppShell.Aside p={"md"}>
				<PageNavigation
					sections={[
						{
							title: "Aggregates",
							items: Array.from(props.boundedcontext.aggregates.values()).map(
								(aggregate) => ({
									ref: aggregate.ref,
									name: aggregate.name,
									icon: Icons.Aggregate,
									onClick: () => nav(aggregate.ref),
								}),
							),
						},
						{
							title: "Services",
							items: Array.from(props.boundedcontext.services.values()).map(
								(service) => ({
									ref: service.ref,
									name: service.name,
									icon: Icons.Service,
									onClick: () => nav(service.ref),
								}),
							),
						},
					]}
				/>
			</AppShell.Aside>
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
