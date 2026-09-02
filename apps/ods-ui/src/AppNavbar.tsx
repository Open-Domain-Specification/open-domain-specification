import { Divider, Flex, ScrollArea, TextInput } from "@mantine/core";
import { spotlight } from "@mantine/spotlight";
import type {
	BoundedContext,
	Workspace,
} from "@open-domain-specification/core";
import { PiMagnifyingGlass } from "react-icons/pi";
import {
	Navbar,
	type NavbarCollection,
	type NavbarProps,
} from "./components/Navbar.tsx";
import { useWorkspace } from "./context/WorkspaceContext.tsx";
import { useRefNavigate } from "./hooks/useRefNavigate.ts";
import { Icons } from "./Icons.tsx";

const isCurrentPage = (ref: string) =>
	ref.replace(/^#/g, "") === window.location.pathname;

/** A context and its services and aggregates as one navbar collection. */
function contextCollection(
	bc: BoundedContext,
	nav: (ref: string) => void,
): NavbarCollection {
	return {
		id: bc.ref,
		label: bc.name,
		onClick: () => nav(bc.ref),
		leftSection: Icons.BoundedContext,
		active: isCurrentPage(bc.ref),
		items: [...bc.services.values(), ...bc.aggregates.values()].map((svc) => ({
			id: svc.ref,
			label: svc.name,
			onClick: () => nav(svc.ref),
			active: isCurrentPage(svc.ref),
			leftSection: Icons.Service,
		})),
	};
}

/** Contexts linked to no subdomain would otherwise be unreachable from the tree. */
function unservedContextsGroup(
	workspace: Workspace,
	nav: (ref: string) => void,
): NavbarProps["groups"] {
	const unserved = Array.from(workspace.boundedcontexts.values()).filter(
		(bc) => bc.subdomains.size === 0,
	);
	if (unserved.length === 0) return [];
	return [
		{
			id: "unserved-contexts",
			label: "Other Bounded Contexts",
			leftSection: Icons.BoundedContext,
			subgroups: [
				{
					id: "unserved-contexts-list",
					label: "Not linked to a subdomain",
					leftSection: Icons.BoundedContext,
					collections: unserved.map((bc) => contextCollection(bc, nav)),
				},
			],
		},
	];
}

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
					groups={[
						...Array.from(workspace.domains.values()).map((d) => ({
							id: d.ref,
							label: d.name,
							onClick: () => nav(d.ref),
							leftSection: Icons.Domain,
							active: isCurrentPage(d.ref),
							subgroups: Array.from(d.subdomains.values()).map((sd) => ({
								id: sd.ref,
								label: sd.name,
								onClick: () => nav(sd.ref),
								leftSection: Icons.Subdomain,
								active: isCurrentPage(sd.ref),
								collections: Array.from(sd.boundedcontexts.values()).map((bc) =>
									contextCollection(bc, nav),
								),
							})),
						})),
						...unservedContextsGroup(workspace, nav),
					]}
				/>
			</ScrollArea>
		</Flex>
	);
}
