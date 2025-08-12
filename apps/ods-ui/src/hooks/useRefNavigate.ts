import { useCallback } from "react";
import { type NavigateOptions, useNavigate } from "react-router-dom";

export function useRefNavigate() {
	const nav = useNavigate();

	return useCallback(
		(to: string, options?: NavigateOptions) => {
			return nav(to.replace(/^#/g, ""), options);
		},
		[nav],
	);
}
