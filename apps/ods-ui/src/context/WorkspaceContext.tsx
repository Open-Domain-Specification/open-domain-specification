import { createContext, type ReactNode, useContext, useState } from "react";
import { Workspace } from "../Workspace.ts";

export const INITIAL_WORKSPACE: Workspace = new Workspace({
	id: "",
	name: "",
	description: "",
	odsVersion: "0.0.0",
	version: "0.0.0",
	domains: {},
});

export type WorkspaceContext = {
	workspace: Workspace;
	loadWorkspace: (workspace: Workspace) => void;
	closeWorkspace: () => void;
};
export const WorkspaceContext = createContext<WorkspaceContext>({
	workspace: INITIAL_WORKSPACE,
	closeWorkspace: () => {},
	loadWorkspace: () => {},
});

export function WorkspaceProvider({ children }: { children: ReactNode }) {
	const [workspace, setWorkspace] = useState<Workspace>(INITIAL_WORKSPACE);

	function closeWorkspace() {
		window.location.href = "/";
		setWorkspace(INITIAL_WORKSPACE);
	}

	return (
		<WorkspaceContext.Provider
			value={{
				workspace,
				loadWorkspace: setWorkspace,
				closeWorkspace,
			}}
		>
			{children}
		</WorkspaceContext.Provider>
	);
}

export const useWorkspace = () =>
	useContext<WorkspaceContext>(WorkspaceContext);
