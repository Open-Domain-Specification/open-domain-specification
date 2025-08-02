import { Divider, Flex, ScrollArea, TextInput } from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import { PiMagnifyingGlass } from "react-icons/pi";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-use";
import { Navbar } from "./components/Navbar.tsx";
import { useWorkspace } from "./context/Workspace.tsx";
import { Icons } from "./Icons.tsx";
import { getAggregateId } from "./utils/getAggregateId.ts";
import { getBoundedContextId } from "./utils/getBoundedContextId.ts";
import { getSubdomainId } from "./utils/getSubdomainId.ts";

export function AppNavbar() {
	const { workspace } = useWorkspace();
	const nav = useNavigate();
	const location = useLocation();

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
					groups={workspace.domains.map((d) => ({
						id: d.id,
						label: d.name,
						onClick: () => nav(`/${d.id}`),
						leftSection: Icons.Domain,
						active:
							location.pathname?.split("/").length === 2 &&
							location.pathname?.endsWith(d.id),
						subgroups:
							d.subdomains?.map((sd) => ({
								id: getSubdomainId(d, sd).replace(":", "/"),
								label: sd.name,
								onClick: () => nav(`/${d.id}/${sd.id}`),
								leftSection: Icons.Subdomain,
								active:
									location.pathname?.split("/").length === 3 &&
									location.pathname?.endsWith(sd.id),
								collections:
									sd.boundedContexts?.map((bc) => ({
										id: getBoundedContextId(d, sd, bc).replace(":", "/"),
										label: bc.name,
										onClick: () => nav(`/${d.id}/${sd.id}/${bc.id}`),
										leftSection: Icons.BoundedContext,
										active:
											location.pathname?.split("/").length === 4 &&
											location.pathname?.endsWith(bc.id),
										items:
											bc.aggregates?.map((agg) => ({
												id: getAggregateId(d, sd, bc, agg).replace(":", "/"),
												label: agg.name,
												onClick: () =>
													nav(`/${d.id}/${sd.id}/${bc.id}/${agg.id}`),
												active:
													location.pathname?.split("/").length === 5 &&
													location.pathname?.endsWith(agg.id),
												leftSection: Icons.Aggregate,
											})) || [],
									})) || [],
							})) || [],
					}))}
				/>
			</ScrollArea>
		</Flex>
	);
}
