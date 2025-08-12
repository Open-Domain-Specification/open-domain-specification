import { useCallback } from "react";
import type { OnPageNavigable } from "../Workspace.ts";

export function useScrollToNavigable(offset: number = 100) {
	return useCallback(
		({ htmlId }: OnPageNavigable) => {
			const element = document.getElementById(htmlId);
			if (element) {
				const y = element.getBoundingClientRect().top + window.scrollY - offset;

				window.scrollTo({ top: y, behavior: "smooth" });
				element.getElementsByTagName("button").item(0)?.click();
			}
		},
		[offset],
	);
}
