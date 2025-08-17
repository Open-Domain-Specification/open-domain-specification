import { Text } from "@mantine/core";
import { useIsMobile } from "../hooks/useIsMobile.ts";

export function PageSubtitle(props: { title: string }) {
	const isMobile = useIsMobile();
	return (
		<Text size={isMobile ? "md" : "lg"} fw={"bold"}>
			{props.title}
		</Text>
	);
}
