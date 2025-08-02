import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { type ReactNode, useMemo } from "react";
import { useWorkspace } from "./context/Workspace.tsx";
import { theme } from "./theme.ts";

export type AppMantineProviderProps = {
	children?: ReactNode;
};
export function AppMantineProvider({ children }: AppMantineProviderProps) {
	const { workspace } = useWorkspace();

	const myTheme = useMemo(
		() => theme({ primaryColor: workspace.primaryColor }),
		[workspace.primaryColor],
	);

	return (
		<MantineProvider theme={myTheme} defaultColorScheme={"auto"}>
			<Notifications />
			{children}
		</MantineProvider>
	);
}
