import {
	CodeHighlightAdapterProvider,
	createShikiAdapter,
} from "@mantine/code-highlight";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { type ReactNode, useMemo } from "react";
import { useWorkspace } from "./context/WorkspaceContext.tsx";
import { theme } from "./theme.ts";

async function loadShiki() {
	const { createHighlighter } = await import("shiki");
	const shiki = await createHighlighter({
		langs: ["json", "mermaid"],
		themes: [],
	});

	return shiki;
}

const shikiAdapter = createShikiAdapter(loadShiki);

export type AppMantineProviderProps = {
	children?: ReactNode;
};
export function AppMantineProvider({ children }: AppMantineProviderProps) {
	const { workspace } = useWorkspace();

	const myTheme = useMemo(
		() => theme({ primaryColor: workspace.workspace.primaryColor }),
		[workspace.workspace.primaryColor],
	);

	return (
		<MantineProvider theme={myTheme} defaultColorScheme={"auto"}>
			<CodeHighlightAdapterProvider adapter={shikiAdapter}>
				<Notifications />
				{children}
			</CodeHighlightAdapterProvider>
		</MantineProvider>
	);
}
