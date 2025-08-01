import { Badge, Card, Stack, Text, Title } from "@mantine/core";
import type { BoundedContext, Domain, Subdomain } from "open-domain-schema";
import { VscSymbolClass } from "react-icons/vsc";

export function BoundedContextCard({
	boundedContext,
}: {
	domain: Domain;
	subdomain: Subdomain;
	boundedContext: BoundedContext;
}) {
	return (
		<Card withBorder>
			<Stack>
				<Stack gap={"xs"}>
					<Title order={4}>{boundedContext.name}</Title>
					<Text lineClamp={2}>{boundedContext.description}</Text>
				</Stack>
				<Badge
					color={"primary"}
					variant={"light"}
					leftSection={<VscSymbolClass />}
				>
					{boundedContext.aggregates?.length || 0}
				</Badge>
			</Stack>
		</Card>
	);
}
