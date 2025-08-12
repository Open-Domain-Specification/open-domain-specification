import { useCallback } from "react";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { exportWorkspace } from "../store/export.ts";

/**
 * Custom hook to export the workspace using the workspace context.
 *
 * This hook provides a memoized callback function that triggers the `exportWorkspace`
 * function with the current workspace instance. It ensures that the callback is
 * re-created only when the workspace instance changes.
 *
 * @returns {Function} A memoized callback function to export the workspace.
 */
export function useExportWorkspace() {
	const { workspace } = useWorkspace();

	// useCallback ensures the function is memoized and only changes when `db` changes.
	return useCallback(
		() => workspace.database && exportWorkspace(workspace.database),
		[workspace.database],
	);
}
