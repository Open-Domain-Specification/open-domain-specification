import { CodeHighlight } from "@mantine/code-highlight";
import {
	ActionIcon,
	Card,
	Collapse,
	Flex,
	Group,
	LoadingOverlay,
	Modal,
	Stack,
	Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { type Engine, graphviz } from "d3-graphviz";
import { type CSSProperties, useRef } from "react";
import { VscCode, VscScreenFull } from "react-icons/vsc";
import { useAsync } from "react-use";

function Graph({ dot, engine }: { dot: string; engine?: Engine }) {
	const graph = useRef<HTMLDivElement>(null);

	const state = useAsync(
		() =>
			new Promise((resolve, reject) => {
				graphviz(graph.current, {
					zoom: true,
					height: graph.current?.offsetHeight,
					width: graph.current?.offsetWidth,
					fit: true,
					engine,
				})
					.renderDot(dot)
					.on("error", () => {
						reject(new Error("Error rendering graph"));
					})
					.on("renderEnd", () => {
						setTimeout(() => {
							resolve(true);
						}, 1000);
					});
			}),
		[dot, engine],
	);

	return (
		<Flex flex={"auto"}>
			<LoadingOverlay visible={state.loading} />
			<div
				style={{
					flex: "auto",
					width: "100%",
					height: "100%",
				}}
				ref={graph}
			/>
		</Flex>
	);
}

export interface IGraphvizProps {
	dot: string;
	title: string;
	engine?: Engine;
	height?: CSSProperties["height"];
}
export const Graphviz = ({ title, dot, engine, height }: IGraphvizProps) => {
	const [isExpanded, expanded] = useDisclosure(false);
	const [isOpen, open] = useDisclosure(false);

	return (
		<Stack gap={"xs"}>
			<Group justify={"space-between"}>
				<Text size={"lg"} fw={"bold"}>
					{title}
				</Text>
				<Group>
					<ActionIcon variant={"subtle"} onClick={expanded.toggle}>
						<VscCode />
					</ActionIcon>
					<ActionIcon variant={"subtle"} onClick={open.toggle}>
						<VscScreenFull />
					</ActionIcon>
				</Group>
			</Group>
			<Card h={height} flex={"auto"} style={{ overflow: "hidden" }} withBorder>
				<Card.Section flex={"auto"} display={"flex"}>
					<Graph dot={dot} engine={engine} />
				</Card.Section>
			</Card>

			<Collapse in={isExpanded} transitionDuration={200}>
				<CodeHighlight code={dot} language={"dot"} />
			</Collapse>

			<Modal
				opened={isOpen}
				onClose={open.close}
				fullScreen
				display={"flex"}
				withCloseButton
				styles={{
					content: {
						display: "flex",
						flexDirection: "column",
						overflow: "hidden",
						padding: 0,
					},
					body: {
						display: "flex",
						flexDirection: "column",
						flex: "auto",
						padding: 0,
					},
				}}
				title={
					<Text size={"lg"} fw={"bold"}>
						{title}
					</Text>
				}
			>
				<Graph dot={dot} engine={engine} />
			</Modal>
		</Stack>
	);
};
