import {
	AppShell,
	type AppShellAsideConfiguration,
	type AppShellHeaderConfiguration,
	type AppShellNavbarConfiguration,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();

	return (
		<AppShell
			header={header}
			navbar={{
				...navbar,
				collapsed: { mobile: !mobileOpened },
			}}
			aside={aside}
		>
			<AppSpotlight />
			<AppShell.Header className={"app-header"}>
				<AppHeader onToggleMobile={toggleMobile} />
			</AppShell.Header>
			<AppShell.Navbar>
				<AppNavbar />
			</AppShell.Navbar>
			<AppShell.Main>{children}</AppShell.Main>
		</AppShell>
	);
}
