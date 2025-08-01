import type { Workspace } from "open-domain-schema";
import { createContext, useContext, useState } from "react";
import { defaultWorkspace } from "../default-workspace.ts";

export type WorkspaceContext = {
	workspace: Workspace;
	setWorkspace: (workspace: Workspace) => void;
};
export const WorkspaceContext = createContext<WorkspaceContext>({
	workspace: defaultWorkspace,
	setWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
	const [workspace, setWorkspace] = useState<Workspace>(defaultWorkspace);

	return (
		<WorkspaceContext.Provider value={{ workspace, setWorkspace }}>
			{children}
		</WorkspaceContext.Provider>
	);
}

export const useWorkspace = () =>
	useContext<WorkspaceContext>(WorkspaceContext);
