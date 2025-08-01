import { Badge, Card, Stack, Text, Title } from "@mantine/core";
import type { Subdomain } from "open-domain-schema";
import { VscSymbolClass } from "react-icons/vsc";
import { NavLink } from "react-router-dom";

export function SubDomainCard({ subdomain }: { subdomain: Subdomain }) {
	return (
		<Card withBorder>
			<Stack>
				<Stack gap={"xs"}>
					<NavLink to={subdomain.id}>
						<Title order={4}>{subdomain.name}</Title>
					</NavLink>
					<Text lineClamp={2}>{subdomain.description}</Text>
				</Stack>
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
