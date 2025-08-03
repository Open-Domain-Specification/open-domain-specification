import { AppShell, Badge, ScrollArea } from "@mantine/core";
import type {
	BoundedContext,
	Domain,
	Service,
	Subdomain,
} from "open-domain-schema";
import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { AccordionItems } from "../components/AccordionItems.tsx";
import { GenericNotFoundContent } from "../components/GenericNotFoundContent.tsx";
import { GenericWorkspacePage } from "../components/GenericWorkspacePage.tsx";
import { PageNavigation } from "../components/PageNavigation.tsx";
import { PageSkeleton } from "../components/PageSkeleton.tsx";
import { useWorkspace } from "../context/Workspace.tsx";
import { Icons } from "../Icons.tsx";

function toNavigationItems(
	icon: ReactNode,
	onScrollToSection: (id: string) => void,
	items: Service["provides"],
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

export function _ServicePage({
	service,
}: {
	domain: Domain;
	subdomain: Subdomain;
	boundedContext: BoundedContext;
	service: Service;
}) {
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
				avatar={Icons.Service}
				title={service.name}
				description={service.description}
			>
				<Badge>{service.type}</Badge>

				<AccordionItems
					title={"Provides"}
					items={
						service.provides?.map((it) => ({
							id: it.id,
							name: it.name,
							description: it.description,
							icon: it.type === "event" ? Icons.Events : Icons.Operations,
						})) || []
					}
					emptyMessage={"No provisions defined."}
				/>

				<AccordionItems
					title={"Consumes"}
					items={
						service.consumes?.map((it) => ({
							id: it.target,
							name: it.target,
							description: it.pattern,
							icon: Icons.Consumer,
						})) || []
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
								items: toNavigationItems(
									Icons.Operations,
									scrollToSection,
									service.provides?.filter((it) => it.type === "operation"),
								),
							},
							{
								title: "Events",
								items: toNavigationItems(
									Icons.Events,
									scrollToSection,
									service.provides?.filter((it) => it.type === "event"),
								),
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
	const domain = workspace.domains.find((domain) => domain.id === domainId);
	const subdomain = domain?.subdomains?.find(
		(subdomain) => subdomain.id === subdomainId,
	);
	const boundedContext = subdomain?.boundedContexts?.find(
		(boundedContext) => boundedContext.id === boundedContextId,
	);
	const service = boundedContext?.services?.find(
		(service) => service.id === serviceId,
	);

	return (
		<GenericWorkspacePage>
			{!domain || !subdomain || !boundedContext || !service ? (
				<GenericNotFoundContent />
			) : (
				<_ServicePage
					domain={domain}
					subdomain={subdomain}
					boundedContext={boundedContext}
					service={service}
				/>
			)}
		</GenericWorkspacePage>
	);
}
