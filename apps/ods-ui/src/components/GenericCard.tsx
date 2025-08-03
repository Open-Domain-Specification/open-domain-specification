import { Badge, Card, Group, Stack, Text, Title } from "@mantine/core";
import { useHover } from "@mantine/hooks";
import type { ReactNode } from "react";

export type GenericCardProps = {
	title: string;
	onClick?: () => void;
	content: string;
	badges?: { icon: ReactNode; content: number | string }[];
};
export function GenericCard(props: GenericCardProps) {
	const { ref, hovered } = useHover();
	return (
		<Card
			ref={ref}
			withBorder
			onClick={props.onClick}
			display={"flex"}
			styles={{
				root: {
					cursor: "pointer",
				},
			}}
			shadow={hovered ? "sm" : undefined}
		>
			<Stack align={"space-between"} flex={"auto"}>
				<Stack gap={"xs"} flex={"auto"}>
					<Title order={4} lineClamp={2}>
						{props.title}
					</Title>
					<Text lineClamp={2}>{props.content}</Text>
				</Stack>
				<Group>
					{props.badges?.map((badge) => (
						<Badge
							color={"primary"}
							variant={"light"}
							leftSection={badge.icon}
							key={badge.content}
						>
							{badge.content}
						</Badge>
					))}
				</Group>
			</Stack>
		</Card>
	);
}
