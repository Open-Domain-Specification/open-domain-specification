import {
	AppShell,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Title,
} from "@mantine/core";
import type {
	Aggregate,
	BoundedContext,
	Domain,
	Subdomain,
} from "open-domain-schema";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import {
	type AccordionItemProps,
	AccordionItems,
} from "../components/AccordionItems.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { Mermaid } from "../components/Mermaid.tsx";
import { PageNavigation } from "../components/PageNavigation.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/Workspace.tsx";
import { Icons } from "../Icons.tsx";
import { EntitiesAndValueObjectsHelp } from "../modals/EntitiesAndValueObjectsHelp.tsx";
import { aggregateToMermaid } from "../utils/aggregateToMermaid.ts";

function toAccordionItems(
	items:
		| Aggregate["operations"]
		| Aggregate["events"]
		| Aggregate["invariants"],
): AccordionItemProps[] {
	return (
		items?.map((item) => ({
			id: item.id,
			name: item.name,
			description: item.description,
		})) || []
	);
}

function toNavigationItems(
	icon: ReactNode,
	onScrollToSection: (id: string) => void,
	items:
		| Aggregate["operations"]
		| Aggregate["events"]
		| Aggregate["invariants"],
) {
	return (
		items?.map((item) => ({
			key: item.id,
			label: item.name,
			icon: icon,
			onClick: () => onScrollToSection(item.id),
		})) || []
	);
}

export function _AggregatePage({
	aggregate,
}: {
	domain: Domain;
	subdomain: Subdomain;
	boundedContext: BoundedContext;
	aggregate: Aggregate;
}) {
	const { workspace } = useWorkspace();
	const scrollToSection = (id: string) => {
		const element = document.getElementById(id);
		if (element) {
			const y = element.getBoundingClientRect().top + window.scrollY - 100;

			window.scrollTo({ top: y, behavior: "smooth" });
			element.getElementsByTagName("button").item(0)?.click();
		}
	};

	return (
		<>
			<PageSkeleton
				avatar={Icons.Aggregate}
				title={aggregate.name}
				description={aggregate.description}
			>
				<Stack>
					<Stack gap={2}>
						<Group justify={"space-between"} align={"center"}>
							<Title order={2} id={"entities-and-value-objects"}>
								Entities & Value Objects
							</Title>
							<EntitiesAndValueObjectsHelp />
						</Group>
						<Divider />
					</Stack>
					<Mermaid chart={aggregateToMermaid(workspace, aggregate)} />
				</Stack>
				<AccordionItems
					title={"Operations"}
					icon={Icons.Operations}
					items={toAccordionItems(aggregate.operations)}
					emptyMessage={"No operations defined."}
				/>

				<AccordionItems
					icon={Icons.Events}
					title={"Events"}
					items={toAccordionItems(aggregate.events)}
					emptyMessage={"No events defined."}
				/>

				<AccordionItems
					icon={Icons.Invariants}
					title={"Invariants"}
					items={toAccordionItems(aggregate.invariants)}
					emptyMessage={"No invariants defined."}
				/>
			</PageSkeleton>
			<AppShell.Aside>
				<ScrollArea p={"md"}>
					<PageNavigation
						sections={[
							{
								title: "Entities",
								items: toNavigationItems(
									Icons.Entity,
									() => scrollToSection("entities-and-value-objects"),
									aggregate.entities,
								),
							},
							{
								title: "Value Objects",
								items: toNavigationItems(
									Icons.ValueObject,
									() => scrollToSection("entities-and-value-objects"),
									aggregate.valueObjects,
								),
							},
							{
								title: "Operations",
								items: toNavigationItems(
									Icons.Operations,
									scrollToSection,
									aggregate.operations,
								),
							},
							{
								title: "Events",
								items: toNavigationItems(
									Icons.Events,
									scrollToSection,
									aggregate.events,
								),
							},
							{
								title: "Invariants",
								items: toNavigationItems(
									Icons.Invariants,
									scrollToSection,
									aggregate.invariants,
								),
							},
						]}
					/>
				</ScrollArea>
			</AppShell.Aside>
		</>
	);
}

export function AggregatePage() {
	const { domainId, subdomainId, boundedContextId, aggregateId } = useParams<{
		domainId: string;
		subdomainId: string;
		boundedContextId: string;
		aggregateId: string;
	}>();
	const { workspace } = useWorkspace();
	const domain = workspace.domains.find((domain) => domain.id === domainId);
	const subdomain = domain?.subdomains?.find(
		(subdomain) => subdomain.id === subdomainId,
	);
	const boundedContext = subdomain?.boundedContexts?.find(
		(boundedContext) => boundedContext.id === boundedContextId,
	);
	const aggregate = boundedContext?.aggregates?.find(
		(aggregate) => aggregate.id === aggregateId,
	);

	return (
		<GenericWorkspacePage>
			{!domain || !subdomain || !boundedContext || !aggregate ? (
				<GenericNotFoundContent />
			) : (
				<_AggregatePage
					domain={domain}
					subdomain={subdomain}
					boundedContext={boundedContext}
					aggregate={aggregate}
				/>
			)}
		</GenericWorkspacePage>
	);
}
