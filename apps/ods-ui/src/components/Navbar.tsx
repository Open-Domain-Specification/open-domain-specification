import {
	ActionIcon,
	Button,
	type ButtonProps,
	Collapse,
	Flex,
	Group,
	Stack,
	Text,
	useComputedColorScheme,
	useMantineTheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { FC, ReactNode } from "react";
import { VscChevronDown, VscChevronRight } from "react-icons/vsc";

export type NavButtonProps = {
	buttonProps?: ButtonProps;
	withCollapse?: boolean;
	defaultOpened?: boolean;
	children?: ReactNode;
	label: ReactNode;
	leftSection?: ReactNode;
	onClick?: () => void;
};
export const NavButton: FC<NavButtonProps> = ({
	withCollapse,
	label,
	defaultOpened,
	children,
	leftSection,
	onClick,
	buttonProps,
}) => {
	const [opened, collapse] = useDisclosure(defaultOpened || !withCollapse);

	return (
		<Flex direction={"column"}>
			<Group justify={"space-between"} gap={0} wrap={"nowrap"}>
				<Button
					variant={"transparent"}
					onClick={onClick}
					leftSection={leftSection}
					fullWidth
					justify={"start"}
					{...buttonProps}
				>
					{label}
				</Button>
				{children && withCollapse && (
					<ActionIcon variant={"subtle"} onClick={collapse.toggle}>
						{opened ? <VscChevronDown /> : <VscChevronRight />}
					</ActionIcon>
				)}
			</Group>
			{children && (
				<Collapse in={opened} pl={"lg"}>
					{children}
				</Collapse>
			)}
		</Flex>
	);
};

export type NavbarItem = {
	id: string;
	label: string;
	onClick?: () => void;
	leftSection?: ReactNode;
	active?: boolean;
};

export type NavbarCollection = {
	id: string;
	label: string;
	items: NavbarItem[];
	onClick?: () => void;
	leftSection?: ReactNode;
	active?: boolean;
};

export type NavbarSubgroup = {
	id: string;
	label: string;
	collections: NavbarCollection[];
	onClick?: () => void;
	leftSection?: ReactNode;
	active?: boolean;
};

export type NavbarGroup = {
	id: string;
	label: string;
	subgroups: NavbarSubgroup[];
	onClick?: () => void;
	leftSection?: ReactNode;
	active?: boolean;
};

export type NavbarProps = {
	groups: NavbarGroup[];
};

export function Navbar(props: NavbarProps) {
	const { colors } = useMantineTheme();
	const theme = useComputedColorScheme();

	return (
		<Flex direction={"column"} flex={"auto"} p={"sm"} gap={"xs"}>
			{props.groups.map((group) => (
				<NavButton
					withCollapse
					leftSection={group.leftSection}
					defaultOpened={true}
					key={group.id}
					label={
						<Text fw={group.active ? "bold" : undefined} lineClamp={1}>
							{group.label}
						</Text>
					}
					onClick={group.onClick}
				>
					<Stack
						gap={0}
						styles={{
							root: {
								borderLeft: "solid 1px",
								borderLeftColor: colors.dark[0],
							},
						}}
					>
						{group.subgroups.map((subgroup) => (
							<NavButton
								leftSection={subgroup.leftSection}
								key={subgroup.id}
								label={
									<Text
										fw={subgroup.active ? "bold" : undefined}
										size={"sm"}
										lineClamp={1}
									>
										{subgroup.label}
									</Text>
								}
								onClick={subgroup.onClick}
							>
								{subgroup.collections.map((collection) => (
									<NavButton
										buttonProps={{
											size: "compact-md",
											color: theme === "dark" ? "dimmed" : "dark",
										}}
										onClick={collection.onClick}
										leftSection={collection.leftSection}
										key={collection.id}
										label={
											<Text
												fw={collection.active ? "bold" : undefined}
												size={"sm"}
												lineClamp={1}
											>
												{collection.label}
											</Text>
										}
									>
										{collection.items.map((it) => (
											<NavButton
												label={
													<Text
														fw={it.active ? "bold" : undefined}
														size={"sm"}
														lineClamp={1}
													>
														{it.label}
													</Text>
												}
												buttonProps={{
													size: "compact-md",
													color: theme === "dark" ? "dimmed" : "dark",
												}}
												leftSection={it.leftSection}
												key={it.id}
												onClick={it.onClick}
											/>
										))}
									</NavButton>
								))}
							</NavButton>
						))}
					</Stack>
				</NavButton>
			))}
		</Flex>
	);
}
