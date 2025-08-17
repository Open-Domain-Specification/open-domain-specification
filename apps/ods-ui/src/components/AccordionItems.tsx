import { Accordion, Alert, Divider, Group, Stack, Title } from "@mantine/core";
import type { ReactNode } from "react";
import { Markdown } from "./Markdown.tsx";

export type AccordionItemProps = {
	icon: ReactNode;

	id: string;
	name: ReactNode;
	description?: string;
	endSlot?: ReactNode;
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
								<Stack>
									<Markdown content={it.description || ""} />
									{it.endSlot && <Divider />}
									{it.endSlot}
								</Stack>
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
