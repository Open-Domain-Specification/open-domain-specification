import { AppShell, Badge, Group, Stack } from "@mantine/core";
import {
	type BoundedContext,
	boundedcontextRef,
	ODSConsumptionGraph,
	ODSContextMap,
} from "@open-domain-specification/core";
import { contextMapToDigraph } from "@open-domain-specification/graphviz";
import { useParams } from "react-router-dom";
import { ConsumptionTable } from "../components/ConsumptionTable.tsx";
import { ContextRelationshipTable } from "../components/ContextRelationshipTable.tsx";
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
			<Group gap={"xs"}>
				{props.boundedcontext.team && (
					<Badge color={"grape"} variant={"light"}>
						{props.boundedcontext.team.name}
					</Badge>
				)}
				{props.boundedcontext.bigBallOfMud && (
					<Badge color={"red"} variant={"light"}>
						big ball of mud
					</Badge>
				)}
				{Array.from(props.boundedcontext.subdomains).map((subdomain) => (
					<Badge
						key={subdomain.ref}
						style={{ cursor: "pointer" }}
						onClick={() => nav(subdomain.ref)}
					>
						{subdomain.domain.name} / {subdomain.name}
					</Badge>
				))}
			</Group>

			<Graphviz
				title={`${props.boundedcontext.name} Context Map`}
				height={"50vh"}
				dot={contextMapToDigraph(
					ODSContextMap.fromBoundedContext(props.boundedcontext),
				).toDot()}
			/>

			<Stack>
				<PageSubtitle title={"Context Relationships"} />
				<ContextRelationshipTable
					map={ODSContextMap.fromBoundedContext(props.boundedcontext)}
				/>
			</Stack>

			<Stack>
				<PageSubtitle title={"Consumptions"} />
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
	const { boundedContextId } = useParams<{ boundedContextId: string }>();
	const { workspace } = useWorkspace();

	const boundedContext = workspace.getBoundedContextByRef(
		boundedcontextRef(boundedContextId!).$ref,
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
