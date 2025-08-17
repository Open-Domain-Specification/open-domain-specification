import { Anchor, AppShell, Badge } from "@mantine/core";
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
import { useRefNavigate } from "../hooks/useRefNavigate.ts";
import { useScrollToNavigable } from "../hooks/useScrollToNavigable.ts";
import { Icons } from "../Icons.tsx";
import { ProvidesHelp } from "../modals/ProvidesHelp.tsx";

export function _ServicePage(props: { service: Service }) {
	const scrollToNavigable = useScrollToNavigable(100);
	const nav = useRefNavigate();

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

				<AccordionItems
					title={"Provides"}
					items={Array.from(props.service.consumables.values()).map((it) => ({
						id: it.ref,
						name: <ConsumableAccordionLabel consumable={it} />,
						description: it.description,
						icon: it.type === "event" ? Icons.Events : Icons.Operations,
					}))}
					emptyMessage={"This service does not provide any consumables."}
					rightSection={<ProvidesHelp />}
				/>

				<AccordionItems
					title={"Consumes"}
					items={Array.from(props.service.consumptions).map((it) => {
						return {
							id: it.consumable.ref,
							name: <ConsumptionAccordionLabel consumption={it} />,
							description: it.consumable.description,
							icon: Icons.Consumer,
							endSlot: (
								<Anchor onClick={() => nav(it.consumable.provider.ref)}>
									{it.consumable.provider.name}
								</Anchor>
							),
						};
					})}
					emptyMessage={"This service does not consume anything."}
				/>
			</PageSkeleton>
			<AppShell.Aside p={"md"}>
				<PageNavigation
					sections={[
						{
							title: "Provides",
							items: Array.from(props.service.consumables.values()).map(
								(consumable) => ({
									ref: consumable.ref,
									name: consumable.name,
									icon:
										consumable.type === "event"
											? Icons.Events
											: Icons.Operations,
									onClick: () => scrollToNavigable(consumable),
								}),
							),
						},
						{
							title: "Consumes",
							items: Array.from(props.service.consumptions).map((it) => ({
								ref: it.consumable.ref,
								name: it.consumable.name,
								icon: Icons.Consumer,
								onClick: () => scrollToNavigable(it.consumable),
							})),
						},
					]}
				/>
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
