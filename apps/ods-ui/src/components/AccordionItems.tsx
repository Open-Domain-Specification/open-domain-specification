import { Accordion, Alert, Group, Stack, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { EventsHelp } from "../modals/EventsHelp.tsx";
import { Markdown } from "./Markdown.tsx";

export type AccordionItemProps = {
	id: string;
	name: string;
	description?: string;
};
export type AccordionItemsProps = {
	icon: ReactNode;
	title: string;
	emptyMessage?: string;
	items: AccordionItemProps[];
};
export function AccordionItems({
	title,
	emptyMessage,
	items,
	icon,
}: AccordionItemsProps) {
	console.log(items);

	return (
		<Stack>
			<Group justify={"space-between"} align={"center"}>
				<Title order={2}>{title}</Title>
				<EventsHelp />
			</Group>

			{items.length ? (
				<Accordion multiple variant={"separated"}>
					{items.map((it) => (
						<Accordion.Item id={it.id} key={it.id} value={it.id}>
							<Accordion.Control icon={icon}>{it.name}</Accordion.Control>
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
