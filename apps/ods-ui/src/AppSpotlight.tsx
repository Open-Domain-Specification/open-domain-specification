import { Spotlight, type SpotlightProps } from "@mantine/spotlight";
import {
	AbstractVisitor,
	type Aggregate,
	type BoundedContext,
	type Consumable,
	type Domain,
	type Entity,
	type Invariant,
	type Service,
	type Subdomain,
	type ValueObject,
} from "@open-domain-specification/core";
import { useMemo } from "react";
import { BiSearch } from "react-icons/bi";
import { useWorkspace } from "./context/WorkspaceContext.tsx";
import { useRefNavigate } from "./hooks/useRefNavigate.ts";
import { Icons } from "./Icons.tsx";

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
			label: `${node.subdomain.domain.name} / ${node.subdomain.name} / ${node.name}`,
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
			label: `${node.boundedcontext.subdomain.domain.name} / ${node.boundedcontext.subdomain.name} / ${node.boundedcontext.name} / ${node.name}`,
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
			label: `${node.boundedcontext.subdomain.domain.name} / ${node.boundedcontext.subdomain.name} / ${node.boundedcontext.name} / ${node.name}`,
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
			label: `${node.provider.boundedcontext.subdomain.domain.name} / ${node.provider.boundedcontext.subdomain.name} / ${node.provider.boundedcontext.name} / ${node.provider.name} / ${node.name}`,
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
			label: `${node.aggregate.boundedcontext.subdomain.domain.name} / ${node.aggregate.boundedcontext.subdomain.name} / ${node.aggregate.boundedcontext.name} / ${node.aggregate.name} / ${node.name}`,
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
			label: `${node.aggregate.boundedcontext.subdomain.domain.name} / ${node.aggregate.boundedcontext.subdomain.name} / ${node.aggregate.boundedcontext.name} / ${node.aggregate.name} / ${node.name}`,
			description: node.description,
			onClick: () => {
				this.navigator(node.aggregate.ref);
			},
			leftSection: Icons.Entity,
			group: "Entities",
		});
		super.visitEntity(node);
	}

	visitValueObject(node: ValueObject) {
		this.actions.push({
			id: node.ref,
			label: `${node.aggregate.boundedcontext.subdomain.domain.name} / ${node.aggregate.boundedcontext.subdomain.name} / ${node.aggregate.boundedcontext.name} / ${node.aggregate.name} / ${node.name}`,
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
