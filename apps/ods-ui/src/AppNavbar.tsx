import { Divider, Flex, ScrollArea, TextInput } from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import { PiMagnifyingGlass } from "react-icons/pi";
import { Navbar } from "./components/Navbar.tsx";
import { useWorkspace } from "./context/WorkspaceContext.tsx";
import { useRefNavigate } from "./hooks/useRefNavigate.ts";
import { Icons } from "./Icons.tsx";

export function AppNavbar() {
	const { workspace } = useWorkspace();
	const nav = useRefNavigate();

	return (
		<Flex display={"flex"} direction={"column"} style={{ overflow: "hidden" }}>
			<TextInput
				m={"md"}
				readOnly
				className={"app-spotlight-input"}
				placeholder="Search"
				leftSection={<PiMagnifyingGlass />}
				onClick={spotlight.open}
			/>
			<Divider />
			<ScrollArea flex={"auto"}>
				<Navbar
					groups={(workspace.getDomains() || [])?.map((d) => ({
						id: d.ref,
						label: d.name,
						onClick: () => nav(d.ref),
						leftSection: Icons.Domain,
						active: d.ref.replace(/^#/g, "") === window.location.pathname,
						subgroups:
							workspace.findSubdomainsByDomainId(d.domainId)?.map((sd) => ({
								id: sd.ref,
								label: sd.name,
								onClick: () => nav(sd.ref),
								leftSection: Icons.Subdomain,
								active: sd.ref.replace(/^#/g, "") === window.location.pathname,
								collections:
									workspace
										.findBoundedcontextsByDomainIdAndSubdomainId(
											sd.domainId,
											sd.subdomainId,
										)
										?.map((bc) => ({
											id: bc.ref,
											label: bc.name,
											onClick: () => nav(bc.ref),
											leftSection: Icons.BoundedContext,
											active:
												bc.ref.replace(/^#/g, "") === window.location.pathname,
											items: [
												...(workspace
													.findAggregatesByDomainIdSubdomainIdAndBoundedContextId(
														bc.domainId,
														bc.subdomainId,
														bc.boundedContextId,
													)
													?.map((agg) => ({
														id: agg.ref,
														label: agg.name,
														onClick: () => nav(agg.ref),
														active:
															agg.ref.replace(/^#/g, "") ===
															window.location.pathname,
														leftSection: Icons.Aggregate,
													})) || []),
												...(workspace
													.findServicesByDomainIdSubdomainIdAndBoundedContextId(
														bc.domainId,
														bc.subdomainId,
														bc.boundedContextId,
													)
													?.map((svc) => ({
														id: svc.ref,
														label: svc.name,
														onClick: () => nav(svc.ref),
														active:
															svc.ref.replace(/^#/g, "") ===
															window.location.pathname,
														leftSection: Icons.Service,
													})) || []),
											],
										})) || [],
							})) || [],
					}))}
				/>
			</ScrollArea>
		</Flex>
	);
}
