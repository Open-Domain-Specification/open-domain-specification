import { AppShell, Stack } from "@mantine/core";
import {
	type Domain,
	domainRef,
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

export function _DomainPage(props: { domain: Domain }) {
	const nav = useRefNavigate();

	return (
		<PageSkeleton
			avatar={Icons.Domain}
			title={props.domain.name}
			description={props.domain.description}
		>
			<Graphviz
				title={`${props.domain.name} Context Map`}
				height={"50vh"}
				dot={contextMapToDigraph(
					ODSContextMap.fromDomain(props.domain),
				).toDot()}
			/>

			<Stack>
				<PageSubtitle title={"Relationships"} />
				<ConsumptionTable
					graph={ODSConsumptionGraph.fromDomain(props.domain)}
				/>
			</Stack>

			<AppShell.Aside p={"md"}>
				<PageNavigation
					sections={[
						{
							title: "Subdomains",
							items: Array.from(props.domain.subdomains.values()).map(
								(subdomain) => ({
									ref: subdomain.ref,
									name: subdomain.name,
									icon: Icons.Subdomain,
									onClick: () => nav(subdomain.ref),
								}),
							),
						},
					]}
				/>
			</AppShell.Aside>
		</PageSkeleton>
	);
}

export function DomainPage() {
	const { domainId } = useParams<{ domainId: string }>();
	const { workspace } = useWorkspace();
	const domain = workspace.getDomainByRefOrThrow(domainRef(domainId!).$ref);

	return (
		<GenericWorkspacePage>
			{!domain ? <GenericNotFoundContent /> : <_DomainPage domain={domain} />}
		</GenericWorkspacePage>
	);
}
