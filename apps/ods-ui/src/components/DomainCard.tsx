import { Badge, Card, Stack, Text, Title } from "@mantine/core";
import type { Subdomain } from "open-domain-schema";
import { VscSymbolClass } from "react-icons/vsc";

export function SubDomainCard({ subdomain }: { subdomain: Subdomain }) {
	return (
		<Card withBorder>
			<Stack gap={"xs"}>
				<Title order={4}>{subdomain.name}</Title>
				<Text lineClamp={2}>{subdomain.description}</Text>
				<Badge
					color={"primary"}
					variant={"light"}
					leftSection={<VscSymbolClass />}
				>
					{subdomain.boundedContexts?.length || 0}
				</Badge>
			</Stack>
		</Card>
	);
}
