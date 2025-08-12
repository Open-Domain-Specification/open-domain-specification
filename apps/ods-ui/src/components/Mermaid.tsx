import { CodeHighlight } from "@mantine/code-highlight";
import { Card, Tabs, useComputedColorScheme } from "@mantine/core";
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
			flowchart: {
				nodeSpacing: 20,
				rankSpacing: 20,
				padding: 5,
				diagramPadding: 5,
				subGraphTitleMargin: {
					top: 5,
					bottom: 5,
				},
			},
		});
		mermaid.render(id, chart, ref.current).then((it) => {
			if (ref.current) ref.current.innerHTML = it.svg.replaceAll("__()", "");
		});
	}

	return (
		<Tabs defaultValue={"mermaid"} variant={"outline"}>
			<Tabs.List>
				<Tabs.Tab value="mermaid">Diagram</Tabs.Tab>
				<Tabs.Tab value="source">Source</Tabs.Tab>
			</Tabs.List>
			<Tabs.Panel value="mermaid">
				<Card>
					<div
						ref={ref}
						className="mermaid"
						style={{ width: "100%", textAlign: "center" }}
					/>
				</Card>
			</Tabs.Panel>
			<Tabs.Panel value="source">
				<CodeHighlight code={chart} language="mermaid" />
			</Tabs.Panel>
		</Tabs>
	);
}
