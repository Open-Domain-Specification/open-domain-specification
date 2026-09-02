import { Spotlight, type SpotlightProps } from "@mantine/spotlight";
import {
	AbstractVisitor,
	type Aggregate,
	type BoundedContext,
	boundedContextNamespace,
	type Command,
	type Consumable,
	type Domain,
	type DomainEvent,
	type Entity,
	type GlossaryTerm,
	type Invariant,
	type Policy,
	type Service,
	type Subdomain,
	type ValueObject,
} from "@open-domain-specification/core";
import { useMemo } from "react";
import { BiSearch } from "react-icons/bi";
import { useWorkspace } from "./context/WorkspaceContext.tsx";
import { useRefNavigate } from "./hooks/useRefNavigate.ts";
import { Icons } from "./Icons.tsx";

/** "Domain / Subdomain / Context" for a context, or just its name when it serves no subdomain. */
function contextLabel(bc: BoundedContext): string {
	return boundedContextNamespace(bc)
		.slice(1)
		.map((it) => it.name)
		.concat(bc.name)
		.join(" / ");
}

function aggregateLabel(aggregate: Aggregate): string {
	return `${contextLabel(aggregate.boundedcontext)} / ${aggregate.name}`;
}

class SpotlightCollector extends AbstractVisitor {
	actions: SpotlightProps["actions"];

	constructor(private readonly navigator: (ref: string) => void) {
		super();
		this.actions = [];
	}

	visitDomain(node: Domain) {
		this.actions.push({
			id: node.ref,
			label: node.name,
			description: node.description,
			onClick: () => {
				this.navigator(node.ref);
			},
			leftSection: Icons.Domain,
			group: "Domains",
		});
		super.visitDomain(node);
	}

	visitSubdomain(node: Subdomain) {
		this.actions.push({
			id: node.ref,
			label: `${node.domain.name} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.ref);
			},
			leftSection: Icons.Subdomain,
			group: "Subdomains",
		});
		super.visitSubdomain(node);
	}

	visitBoundedContext(node: BoundedContext) {
		this.actions.push({
			id: node.ref,
			label: contextLabel(node),
			description: node.description,
			onClick: () => {
				this.navigator(node.ref);
			},
			leftSection: Icons.BoundedContext,
			group: "Bounded Contexts",
		});
		super.visitBoundedContext(node);
	}

	visitAggregate(node: Aggregate) {
		this.actions.push({
			id: node.ref,
			label: `${contextLabel(node.boundedcontext)} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.ref);
			},
			leftSection: Icons.Aggregate,
			group: "Aggregates",
		});
		super.visitAggregate(node);
	}

	visitService(node: Service) {
		this.actions.push({
			id: node.ref,
			label: `${contextLabel(node.boundedcontext)} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.ref);
			},
			leftSection: Icons.Service,
			group: "Services",
		});
		super.visitService(node);
	}

	visitConsumable(node: Consumable) {
		this.actions.push({
			id: node.ref,
			label: `${contextLabel(node.provider.boundedcontext)} / ${node.provider.name} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.provider.ref);
			},
			leftSection: node.type === "event" ? Icons.Events : Icons.Operations,
			group: "Consumables",
		});
		super.visitConsumable(node);
	}

	visitInvariant(node: Invariant) {
		this.actions.push({
			id: node.ref,
			label: `${aggregateLabel(node.aggregate)} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.aggregate.ref);
			},
			leftSection: Icons.Invariants,
			group: "Invariants",
		});
		super.visitInvariant(node);
	}

	visitEntity(node: Entity) {
		this.actions.push({
			id: node.ref,
			label: `${aggregateLabel(node.aggregate)} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.aggregate.ref);
			},
			leftSection: Icons.Entity,
			group: "Entities",
		});
		super.visitEntity(node);
	}

	visitCommand(node: Command) {
		this.actions.push({
			id: node.ref,
			label: `${aggregateLabel(node.aggregate)} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.aggregate.ref);
			},
			leftSection: Icons.Operations,
			group: "Commands",
		});
		super.visitCommand(node);
	}

	visitGlossaryTerm(node: GlossaryTerm) {
		this.actions.push({
			id: node.ref,
			label: `${contextLabel(node.boundedcontext)} / ${node.name}`,
			description: node.definition,
			onClick: () => {
				this.navigator(node.boundedcontext.ref);
			},
			leftSection: Icons.Term,
			group: "Glossary",
		});
		super.visitGlossaryTerm(node);
	}

	visitPolicy(node: Policy) {
		this.actions.push({
			id: node.ref,
			label: `${contextLabel(node.boundedcontext)} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.boundedcontext.ref);
			},
			leftSection: Icons.Policy,
			group: "Policies",
		});
		super.visitPolicy(node);
	}

	visitDomainEvent(node: DomainEvent) {
		this.actions.push({
			id: node.ref,
			label: `${aggregateLabel(node.aggregate)} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.aggregate.ref);
			},
			leftSection: Icons.Events,
			group: "Events",
		});
		super.visitDomainEvent(node);
	}

	visitValueObject(node: ValueObject) {
		this.actions.push({
			id: node.ref,
			label: `${aggregateLabel(node.aggregate)} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.aggregate.ref);
			},
			leftSection: Icons.ValueObject,
			group: "Value Objects",
		});
		super.visitValueObject(node);
	}
}

export function AppSpotlight() {
	const { workspace } = useWorkspace();
	const nav = useRefNavigate();

	const spotlightCollector = useMemo(() => {
		const collector = new SpotlightCollector(nav);
		collector.visitWorkspace(workspace);

		return collector;
	}, [workspace, nav]);

	return (
		<Spotlight
			actions={spotlightCollector.actions}
			nothingFound="Nothing found..."
			highlightQuery
			scrollable
			searchProps={{
				leftSection: <BiSearch />,
				placeholder: "Search...",
			}}
		/>
	);
}
