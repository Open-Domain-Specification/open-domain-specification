import { useCallback } from "react";

export function useScrollToNavigable(offset: number = 100) {
	return useCallback(
		({ ref }: { ref: string }) => {
			const element = document.getElementById(ref);
			if (element) {
				const y = element.getBoundingClientRect().top + window.scrollY - offset;

				window.scrollTo({ top: y, behavior: "smooth" });
				element.getElementsByTagName("button").item(0)?.click();
			}
		},
		[offset],
	);
}
