import { Anchor, AppShell, ScrollArea } from "@mantine/core";
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
import { AttributeList } from "../components/AttributeList.tsx";
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
import { EntitiesAndValueObjectsHelp } from "../modals/EntitiesAndValueObjectsHelp.tsx";
import { EventsHelp } from "../modals/EventsHelp.tsx";
import { InvariantsHelp } from "../modals/InvariantsHelp.tsx";
import { ProvidesHelp } from "../modals/ProvidesHelp.tsx";

export function _AggregatePage(props: { aggregate: Aggregate }) {
	const scrollToNavigable = useScrollToNavigable(100);
	const nav = useRefNavigate();

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
					items={Array.from(props.aggregate.consumables.values()).map((it) => ({
						id: it.ref,
						name: <ConsumableAccordionLabel consumable={it} />,
						description: it.description,
						icon: it.type === "event" ? Icons.Events : Icons.Operations,
					}))}
					emptyMessage={"This aggregate does not provide any consumables."}
					rightSection={<ProvidesHelp />}
				/>

				<AccordionItems
					title={"Consumes"}
					items={Array.from(props.aggregate.consumptions.values()).map((it) => {
						return {
							id: it.consumable.ref,
							name: <ConsumptionAccordionLabel consumption={it} />,
							description: `${it.consumable.name} (${it?.consumable.pattern}) <-- ${it.pattern}`,
							icon: Icons.Consumer,
							endSlot: (
								<Anchor onClick={() => nav(it.consumable.provider.ref)}>
									{it.consumable.provider.name}
								</Anchor>
							),
						};
					})}
					emptyMessage={"This aggregate does not consume anything."}
				/>

				<AccordionItems
					title={"Commands"}
					items={Array.from(props.aggregate.commands.values()).map((it) => ({
						id: it.ref,
						name: it.name,
						description: it.raisedEvents.length
							? `${it.description} Raises: ${it.raisedEvents.map((e) => e.name).join(", ")}.`
							: it.description,
						icon: Icons.Operations,
						endSlot: <AttributeList attributes={it.attributes} />,
					}))}
					emptyMessage={"No commands defined."}
				/>

				<AccordionItems
					title={"Events"}
					items={Array.from(props.aggregate.events.values()).map((it) => ({
						id: it.ref,
						name: it.name,
						description: it.description,
						icon: Icons.Events,
						endSlot: <AttributeList attributes={it.attributes} />,
					}))}
					emptyMessage={"No domain events defined."}
					rightSection={<EventsHelp />}
				/>

				<AccordionItems
					title={"Entities"}
					items={
						Array.from(props.aggregate.entities.values())?.map((it) => ({
							id: it.ref,
							name: it.root ? `${it.name} (root)` : it.name,
							description: it.description,
							icon: Icons.Entity,
							endSlot: <AttributeList attributes={it.attributes} />,
						})) || []
					}
					emptyMessage={"No entities defined."}
					rightSection={<EntitiesAndValueObjectsHelp />}
				/>

				<AccordionItems
					title={"Value Objects"}
					items={
						Array.from(props.aggregate.valueobjects.values())?.map((it) => ({
							id: it.ref,
							name: it.name,
							description: it.description,
							icon: Icons.ValueObject,
							endSlot: <AttributeList attributes={it.attributes} />,
						})) || []
					}
					emptyMessage={"No value objects defined."}
					rightSection={<EntitiesAndValueObjectsHelp />}
				/>
			</PageSkeleton>
			<AppShell.Aside>
				<ScrollArea p={"md"}>
					<PageNavigation
						sections={[
							{
								title: "Invariants",
								items: Array.from(props.aggregate.invariants.values()).map(
									(invariant) => ({
										ref: invariant.ref,
										name: invariant.name,
										icon: Icons.Invariants,
										onClick: () => scrollToNavigable(invariant),
									}),
								),
							},
							{
								title: "Provides",
								items: Array.from(props.aggregate.consumables.values()).map(
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
								items: Array.from(props.aggregate.consumptions).map((it) => ({
									ref: it.consumable.ref,
									name: it.consumable.name,
									icon: Icons.Consumer,
									onClick: () => scrollToNavigable(it.consumable),
								})),
							},
							{
								title: "Commands",
								items: Array.from(props.aggregate.commands.values()).map(
									(command) => ({
										ref: command.ref,
										name: command.name,
										icon: Icons.Operations,
										onClick: () => scrollToNavigable(command),
									}),
								),
							},
							{
								title: "Events",
								items: Array.from(props.aggregate.events.values()).map(
									(event) => ({
										ref: event.ref,
										name: event.name,
										icon: Icons.Events,
										onClick: () => scrollToNavigable(event),
									}),
								),
							},
							{
								title: "Entities",
								items: Array.from(props.aggregate.entities.values()).map(
									(entity) => ({
										ref: entity.ref,
										name: entity.name,
										icon: Icons.Entity,
										onClick: () => scrollToNavigable(entity),
									}),
								),
							},
							{
								title: "Value Objects",
								items: Array.from(props.aggregate.valueobjects.values()).map(
									(valueObject) => ({
										ref: valueObject.ref,
										name: valueObject.name,
										icon: Icons.ValueObject,
										onClick: () => scrollToNavigable(valueObject),
									}),
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
	const { boundedContextId, aggregateId } = useParams<{
		boundedContextId: string;
		aggregateId: string;
	}>();
	const { workspace } = useWorkspace();
	const aggregate = workspace.getAggregateByRefOrThrow(
		aggregateRef(boundedContextId!, aggregateId!).$ref,
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
