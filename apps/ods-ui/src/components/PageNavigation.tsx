import { Flex, List, Stack, Text } from "@mantine/core";
import type { ReactNode } from "react";
import { useScrollToNavigable } from "../hooks/useScrollToNavigable.ts";

interface Referenceable {
	ref: string;
	name: string;
}

export interface NavigationItem extends Referenceable {
	icon?: ReactNode;
	items?: NavigationItem[];
}

export type PageNavigationProps = {
	sections: { title: string; items: NavigationItem[] }[];
};

export function PageNavigation(props: PageNavigationProps) {
	const scrollToNavigable = useScrollToNavigable();

	return (
		<Stack>
			{props.sections.map((section) => (
				<Stack key={section.title} gap={"xs"}>
					<Text fw={"bold"}>{section.title}</Text>
					<List>
						{section.items.length === 0 && (
							<Text c={"dimmed"} size={"sm"}>
								No {section.title}
							</Text>
						)}
						{section.items.map((item) => (
							<List.Item
								key={item.ref}
								icon={<Flex>{item.icon}</Flex>}
								onClick={() => scrollToNavigable(item)}
								styles={{
									item: { cursor: "pointer" },
								}}
							>
								<Text size={"sm"}>{item.name}</Text>
							</List.Item>
						))}
					</List>
				</Stack>
			))}
		</Stack>
	);
}
