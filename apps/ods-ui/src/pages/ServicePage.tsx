import {
	AppShell,
	Badge,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
	ODSConsumableMap,
	type Service,
	serviceRef,
} from "@open-domain-specification/core";
import { consumableMapToDigraph } from "@open-domain-specification/graphviz";
import { useParams } from "react-router-dom";
import { AccordionItems } from "../components/AccordionItems.tsx";
import { ConsumableAccordionLabel } from "../components/ConsumableAccordionLabel.tsx";
import { ConsumptionAccordionLabel } from "../components/ConsumptionAccordionLabel.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { Graphviz } from "../components/Graphviz.tsx";
import { PageNavigation } from "../components/PageNavigation.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { Icons } from "../Icons.tsx";
import { EntitiesAndValueObjectsHelp } from "../modals/EntitiesAndValueObjectsHelp.tsx";

export function _ServicePage(props: { service: Service }) {
	// Use Mantine's sm breakpoint (48em = 768px) to match AppShell behavior
	const isMobile = useMediaQuery("(max-width: 48em)");
	
	return (
		<>
			<PageSkeleton
				avatar={Icons.Service}
				title={props.service.name}
				description={props.service.description}
			>
				<Badge>{props.service.type}</Badge>

				<Graphviz
					title={`${props.service.name} Consumable Map`}
					height={"50vh"}
					dot={consumableMapToDigraph(
						ODSConsumableMap.fromService(props.service),
					).toDot()}
				/>

				<Stack>
					<Stack gap={2}>
						<Group justify={"space-between"} align={"center"}>
							<Title order={2} id={"entities-and-value-objects"}>
								Service Context
							</Title>
							<EntitiesAndValueObjectsHelp />
						</Group>
						<Divider />
					</Stack>
					{/*<Mermaid chart={serviceToMermaid(workspace, service)} />*/}
				</Stack>

				<AccordionItems
					title={"Provides"}
					items={
						Array.from(props.service.consumables.values())?.map((it) => ({
							id: it.ref,
							name: (
								<ConsumableAccordionLabel name={it.name} pattern={it.pattern} />
							),
							description: it.description,
							icon: it.type === "event" ? Icons.Events : Icons.Operations,
						})) || []
					}
					emptyMessage={"No consumables defined."}
				/>

				<AccordionItems
					title={"Consumes"}
					items={
						Array.from(props.service.consumptions)?.map((it) => {
							return {
								id: it.consumable.ref + it.consumer.ref,
								name: (
									<ConsumptionAccordionLabel
										name={it.consumable.name}
										pattern={it.consumable.pattern}
										consumptionPattern={it.pattern}
										consumableRef={it.consumable.ref}
									/>
								),
								description: it.consumable.description,
								icon: Icons.Consumer,
							};
						}) || []
					}
					emptyMessage={"No consumptions defined."}
				/>
			</PageSkeleton>
			{!isMobile && (
				<AppShell.Aside>
					<ScrollArea p={"md"}>
						<PageNavigation
							sections={[
								{
									title: "Operations",
									items: [],
								},
								{
									title: "Events",
									items: [],
								},
							]}
						/>
					</ScrollArea>
				</AppShell.Aside>
			)}
		</>
	);
}

export function ServicePage() {
	const { domainId, subdomainId, boundedContextId, serviceId } = useParams<{
		domainId: string;
		subdomainId: string;
		boundedContextId: string;
		serviceId: string;
	}>();
	const { workspace } = useWorkspace();
	const service = workspace.getServiceByRefOrThrow(
		serviceRef(domainId!, subdomainId!, boundedContextId!, serviceId!).$ref,
	);

	return (
		<GenericWorkspacePage>
			{!service ? (
				<GenericNotFoundContent />
			) : (
				<_ServicePage service={service} />
			)}
		</GenericWorkspacePage>
	);
}
