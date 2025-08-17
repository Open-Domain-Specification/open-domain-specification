import {
	AppShell,
	Divider,
	Group,
	ScrollArea,
	Stack,
	Title,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
	type Aggregate,
	aggregateRef,
	ODSConsumableMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import {
	consumableMapToDigraph,
	relationMapToDigraph,
} from "@open-domain-specification/graphviz";
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
import { InvariantsHelp } from "../modals/InvariantsHelp.tsx";

export function _AggregatePage(props: { aggregate: Aggregate }) {
	const isMobile = useMediaQuery("(max-width: 768px)");

	return (
		<>
			<PageSkeleton
				avatar={Icons.Aggregate}
				title={props.aggregate.name}
				description={props.aggregate.description}
			>
				<Graphviz
					title={`${props.aggregate.name} Relation Map`}
					height={"50vh"}
					dot={relationMapToDigraph(
						ODSRelationMap.fromAggregate(props.aggregate),
					).toDot()}
				/>
				<Graphviz
					title={`${props.aggregate.name} Consumable Map`}
					height={"50vh"}
					dot={consumableMapToDigraph(
						ODSConsumableMap.fromAggregate(props.aggregate),
					).toDot()}
				/>

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
				</Stack>

				<AccordionItems
					title={"Invariants"}
					items={
						Array.from(props.aggregate.invariants.values())?.map((it) => ({
							id: it.ref,
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
						Array.from(props.aggregate.consumables.values())?.map((it) => ({
							id: it.ref,
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
						Array.from(props.aggregate.consumptions.values())?.map((it) => {
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
								description: `${it.consumable.name} (${it?.consumable.pattern}) <-- ${it.pattern}`,
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
									title: "Invariants",
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

export function AggregatePage() {
	const { domainId, subdomainId, boundedContextId, aggregateId } = useParams<{
		domainId: string;
		subdomainId: string;
		boundedContextId: string;
		aggregateId: string;
	}>();
	const { workspace } = useWorkspace();
	const aggregate = workspace.getAggregateByRefOrThrow(
		aggregateRef(domainId!, subdomainId!, boundedContextId!, aggregateId!).$ref,
	);

	return (
		<GenericWorkspacePage>
			{!aggregate ? (
				<GenericNotFoundContent />
			) : (
				<_AggregatePage aggregate={aggregate} />
			)}
		</GenericWorkspacePage>
	);
}
