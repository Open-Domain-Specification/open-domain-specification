import { Workspace } from "@open-domain-specification/core";
import { createContext, type ReactNode, useContext, useState } from "react";

export const INITIAL_WORKSPACE: Workspace = new Workspace("", {
	description: "",
	odsVersion: "0.0.0",
	version: "0.0.0",
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
