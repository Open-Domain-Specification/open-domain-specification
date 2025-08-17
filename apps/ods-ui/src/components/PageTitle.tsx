import { Text } from "@mantine/core";
import { useIsMobile } from "../hooks/useIsMobile.ts";

export function PageTitle(props: { title: string }) {
	const isMobile = useIsMobile();
	return (
		<Text size={isMobile ? "lg" : "xl"} fw={"bold"}>
			{props.title}
		</Text>
	);
}
