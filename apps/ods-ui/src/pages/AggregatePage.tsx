import {
	AppShell,
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
import { Mermaid } from "../components/Mermaid.tsx";
import { PageNavigation } from "../components/PageNavigation.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { Icons } from "../Icons.tsx";
import { EntitiesAndValueObjectsHelp } from "../modals/EntitiesAndValueObjectsHelp.tsx";
import { InvariantsHelp } from "../modals/InvariantsHelp.tsx";
import { aggregateToMermaid } from "../utils/aggregateToMermaid.ts";

export function _AggregatePage(props: {
	name: string;
	description: string;
	domainId: string;
	subdomainId: string;
	boundedcontextId: string;
	aggregateId: string;
}) {
	const { workspace } = useWorkspace();

	const consumables =
		workspace.findAggregateConsumablesByDomainIdSubdomainIdAndBoundedContextIdAndAggregateId(
			props.domainId,
			props.subdomainId,
			props.boundedcontextId,
			props.aggregateId,
		);

	const consumptions =
		workspace.findAggregateConsumptionsByDomainIdSubdomainIdAndBoundedContextIdAndAggregateId(
			props.domainId,
			props.subdomainId,
			props.boundedcontextId,
			props.aggregateId,
		);

	const invariants =
		workspace.findAggregateInvariantsByDomainIdSubdomainIdAndBoundedContextIdAndAggregateId(
			props.domainId,
			props.subdomainId,
			props.boundedcontextId,
			props.aggregateId,
		);

	return (
		<>
			<PageSkeleton
				avatar={Icons.Aggregate}
				title={props.name}
				description={props.description}
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
					{workspace.sqlJsDatabase && (
						<Mermaid
							chart={aggregateToMermaid(
								workspace.sqlJsDatabase,
								props.aggregateId,
							)}
						/>
					)}
				</Stack>

				<AccordionItems
					title={"Invariants"}
					items={
						invariants?.map((it) => ({
							id: it.invariantId,
							name: it.name,
							description: it.description,
							icon: Icons.Invariants,
						})) || []
					}
					emptyMessage={"No invariants defined."}
					rightSection={<InvariantsHelp />}
				/>

				<AccordionItems
					title={"Provides"}
					items={
						consumables?.map((it) => ({
							id: it.consumableId,
							name: (
								<ConsumableAccordionLabel name={it.name} pattern={it.pattern} />
							),
							description: it.description,
							icon: it.type === "event" ? Icons.Events : Icons.Operations,
						})) || []
					}
					emptyMessage={"No provisions defined."}
				/>

				<AccordionItems
					title={"Consumes"}
					items={
						consumptions?.map((it) => {
							return {
								id:
									it.aggregate_consumer.aggregateRef +
									it.aggregate_consumer.consumableRef,
								name: (
									<ConsumptionAccordionLabel
										name={it.consumable.name}
										pattern={it.consumable.pattern}
										consumptionPattern={it.aggregate_consumer.pattern}
										consumableRef={it.consumable.ref}
									/>
								),
								description: `${it.consumable.name} (${it?.consumable.pattern}) <-- ${it.aggregate_consumer.pattern}`,
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
								title: "Invariants",
								items: [],
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
	const aggregate =
		workspace.findAggregateByDomainIdSubdomainIdAndBoundedContextId(
			domainId!,
			subdomainId!,
			boundedContextId!,
			aggregateId!,
		);

	return (
		<GenericWorkspacePage>
			{!aggregate ? (
				<GenericNotFoundContent />
			) : (
				<_AggregatePage
					domainId={domainId!}
					subdomainId={subdomainId!}
					boundedcontextId={boundedContextId!}
					aggregateId={aggregateId!}
					name={aggregate.name}
					description={aggregate.description}
				/>
			)}
		</GenericWorkspacePage>
	);
}
