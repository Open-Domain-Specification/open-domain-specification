import {
	AppShell,
	type AppShellAsideConfiguration,
	type AppShellHeaderConfiguration,
	type AppShellNavbarConfiguration,
} from "@mantine/core";
import type { ReactNode } from "react";
import { AppHeader } from "../AppHeader.tsx";
import { AppNavbar } from "../AppNavbar.tsx";
import { AppSpotlight } from "../AppSpotlight.tsx";

export function GenericWorkspacePage({
	children,
	header = { height: 65 },
	navbar = { width: 300, breakpoint: "sm", collapsed: { mobile: true } },
	aside,
}: {
	children: ReactNode;
	header?: AppShellHeaderConfiguration;
	navbar?: AppShellNavbarConfiguration;
	aside?: AppShellAsideConfiguration;
}) {
	return (
		<AppShell header={header} navbar={navbar} aside={aside}>
			<AppSpotlight />
			<AppShell.Header className={"app-header"}>
				<AppHeader />
			</AppShell.Header>
			<AppShell.Navbar>
				<AppNavbar />
			</AppShell.Navbar>
			<AppShell.Main>{children}</AppShell.Main>
		</AppShell>
	);
}

// {
// 				width: location.pathname?.split("/").length === 5 ? 300 : 0,
// 				breakpoint: 0,
// 				collapsed: { mobile: true },
// 			}
