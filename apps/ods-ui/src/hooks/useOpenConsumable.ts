import type * as React from "react";
import { type MouseEventHandler, useCallback } from "react";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { useRefNavigate } from "./useRefNavigate.ts";

export function useOpenConsumable(
	consumableRef: string,
): MouseEventHandler<HTMLButtonElement> {
	const { workspace } = useWorkspace();
	const nav = useRefNavigate();

	return useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event?.stopPropagation();
			event?.preventDefault();

			const consumable = workspace.getConsumableByRef(consumableRef);

			if (!consumable) {
				throw new Error("No consumable found for ref: " + consumableRef);
			}

			nav(consumable.provider.ref);
		},
		[consumableRef, nav, workspace],
	);
}
