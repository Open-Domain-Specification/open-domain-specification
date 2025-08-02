import { Card, useComputedColorScheme } from "@mantine/core";
import { useId } from "@mantine/hooks";
import mermaid from "mermaid";
import { useRef } from "react";

export type MermaidProps = {
	chart: string;
};
export function Mermaid({ chart }: MermaidProps) {
	const id = useId();
	const ref = useRef<HTMLDivElement>(null);
	const colorScheme = useComputedColorScheme();

	if (chart && ref.current) {
		mermaid.initialize({
			theme: colorScheme === "dark" ? "dark" : "default",
			darkMode: colorScheme === "dark",
		});
		mermaid.render(id, chart, ref.current).then((it) => {
			if (ref.current) ref.current.innerHTML = it.svg;
		});
	}

	return (
		<Card>
			<div
				ref={ref}
				className="mermaid"
				style={{ width: "100%", textAlign: "center" }}
			/>
		</Card>
	);
}
