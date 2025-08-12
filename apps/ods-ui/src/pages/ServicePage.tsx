import {
	AppShell,
	Badge,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Title,
} from "@mantine/core";
import { useParams } from "react-router-dom";
import { AccordionItems } from "../components/AccordionItems.tsx";
import { ConsumableAccordionLabel } from "../components/ConsumableAccordionLabel.tsx";
import { ConsumptionAccordionLabel } from "../components/ConsumptionAccordionLabel.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageNavigation } from "../components/PageNavigation.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { Icons } from "../Icons.tsx";
import { EntitiesAndValueObjectsHelp } from "../modals/EntitiesAndValueObjectsHelp.tsx";

export function _ServicePage(props: {
	name: string;
	description: string;
	type: string;
	domainId: string;
	subdomainId: string;
	boundedcontextId: string;
	serviceId: string;
}) {
	const { workspace } = useWorkspace();

	const consumables =
		workspace.findServiceConsumablesByDomainIdSubdomainIdAndBoundedContextIdAndServiceId(
			props.domainId,
			props.subdomainId,
			props.boundedcontextId,
			props.serviceId,
		);

	const consumptions =
		workspace.findServiceConsumptionsByDomainIdSubdomainIdAndBoundedContextIdAndServiceId(
			props.domainId,
			props.subdomainId,
			props.boundedcontextId,
			props.serviceId,
		);

	return (
		<>
			<PageSkeleton
				avatar={Icons.Service}
				title={props.name}
				description={props.description}
			>
				<Badge>{props.type}</Badge>

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
						consumables?.map((it) => ({
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
						consumptions?.map((it) => {
							return {
								id:
									it.service_consumer.serviceRef +
									it.service_consumer.consumableRef,
								name: (
									<ConsumptionAccordionLabel
										name={it.consumable.name}
										pattern={it.consumable.pattern}
										consumptionPattern={it.service_consumer.pattern}
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
	const service =
		workspace.findServiceByDomainIdSubdomainIdAndBoundedContextIdAndServiceId(
			domainId!,
			subdomainId!,
			boundedContextId!,
			serviceId!,
		);

	return (
		<GenericWorkspacePage>
			{!service ? (
				<GenericNotFoundContent />
			) : (
				<_ServicePage
					name={service.name}
					description={service.description}
					type={service.type}
					domainId={service.domainId}
					subdomainId={service.subdomainId}
					boundedcontextId={service.boundedContextId}
					serviceId={service.serviceId}
				/>
			)}
		</GenericWorkspacePage>
	);
}
