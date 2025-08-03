import { Accordion, Alert, Group, Stack, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { Markdown } from "./Markdown.tsx";

export type AccordionItemProps = {
	icon: ReactNode;

	id: string;
	name: string;
	description?: string;
};
export type AccordionItemsProps = {
	title: string;
	emptyMessage?: string;
	items: AccordionItemProps[];
	rightSection?: ReactNode;
};
export function AccordionItems({
	title,
	emptyMessage,
	items,
	rightSection,
}: AccordionItemsProps) {
	console.log(items);

	return (
		<Stack>
			<Group justify={"space-between"} align={"center"}>
				<Title order={2}>{title}</Title>
				{rightSection}
			</Group>

			{items.length ? (
				<Accordion multiple variant={"separated"}>
					{items.map((it) => (
						<Accordion.Item id={it.id} key={it.id} value={it.id}>
							<Accordion.Control icon={it.icon}>{it.name}</Accordion.Control>
							<Accordion.Panel>
								<Markdown content={it.description || ""} />
							</Accordion.Panel>
						</Accordion.Item>
					))}
				</Accordion>
			) : (
				<Alert>{emptyMessage}</Alert>
			)}
		</Stack>
	);
}
