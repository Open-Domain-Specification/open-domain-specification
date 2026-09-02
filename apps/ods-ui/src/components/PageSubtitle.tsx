import { Group, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useIsMobile } from "../hooks/useIsMobile.ts";

export function PageSubtitle(props: {
	title: string;
	rightSection?: ReactNode;
}) {
	const isMobile = useIsMobile();
	return (
		<Group gap={"xs"}>
			<Text size={isMobile ? "md" : "lg"} fw={"bold"}>
				{props.title}
			</Text>
			{props.rightSection}
		</Group>
	);
}
