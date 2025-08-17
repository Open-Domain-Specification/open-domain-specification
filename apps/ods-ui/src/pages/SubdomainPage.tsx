import { AppShell, Stack } from "@mantine/core";
import {
	ODSConsumptionGraph,
	ODSContextMap,
	type Subdomain,
	subdomainRef,
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

export function _SubdomainPage(props: { subdomain: Subdomain }) {
	const nav = useRefNavigate();

	return (
		<PageSkeleton
			avatar={Icons.Subdomain}
			title={props.subdomain.name}
			description={props.subdomain.description}
		>
			<Graphviz
				title={`${props.subdomain.name} Context Map`}
				height={"50vh"}
				dot={contextMapToDigraph(
					ODSContextMap.fromSubdomain(props.subdomain),
				).toDot()}
			/>

			<Stack>
				<PageSubtitle title={"Relationships"} />
				<ConsumptionTable
					graph={ODSConsumptionGraph.fromSubdomain(props.subdomain)}
				/>
			</Stack>

			<AppShell.Aside p={"md"}>
				<PageNavigation
					sections={[
						{
							title: "Bounded Contexts",
							items: Array.from(props.subdomain.boundedcontexts.values()).map(
								(boundedcontext) => ({
									ref: boundedcontext.ref,
									name: boundedcontext.name,
									icon: Icons.BoundedContext,
									onClick: () => nav(boundedcontext.ref),
								}),
							),
						},
					]}
				/>
			</AppShell.Aside>
		</PageSkeleton>
	);
}

export function SubdomainPage() {
	const { domainId, subdomainId } = useParams<{
		domainId: string;
		subdomainId: string;
	}>();
	const { workspace } = useWorkspace();
	const subdomain = workspace.getSubdomainByRef(
		subdomainRef(domainId!, subdomainId!).$ref,
	);

	return (
		<GenericWorkspacePage>
			{!subdomain ? (
				<GenericNotFoundContent />
			) : (
				<_SubdomainPage subdomain={subdomain} />
			)}
		</GenericWorkspacePage>
	);
}
