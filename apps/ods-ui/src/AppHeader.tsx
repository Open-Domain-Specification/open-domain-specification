import {
	ActionIcon,
	Avatar,
	Badge,
	Burger,
	CloseButton,
	Group,
	Menu,
	Text,
	useMantineColorScheme,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { BsLaptop, BsMoon, BsSun } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "./context/WorkspaceContext.tsx";

export function AppHeader({ onToggleMobile }: { onToggleMobile?: () => void }) {
	const { workspace, closeWorkspace } = useWorkspace();
	const nav = useNavigate();
	const { colorScheme, setColorScheme } = useMantineColorScheme();
	const isMobile = useMediaQuery("(max-width: 768px)");

	return (
		<Group justify={"space-between"} flex={"auto"} wrap="nowrap">
			<Group gap={isMobile ? "xs" : "sm"} style={{ minWidth: 0, flex: 1 }}>
				{isMobile && onToggleMobile && (
					<Burger onClick={onToggleMobile} size="sm" />
				)}
				<Avatar
					style={{ cursor: "pointer" }}
					onClick={() => nav("/")}
					radius={"xs"}
					src={workspace.logoUrl}
					color={"initials"}
					name={workspace.name}
					size={isMobile ? "sm" : "md"}
				/>
				{!isMobile && (
					<Text fz={"md"} fw={"bold"}>
						{workspace.name} | {workspace.version}
					</Text>
				)}
				{isMobile && (
					<Text
						fz={"sm"}
						fw={"bold"}
						style={{
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{workspace.name}
					</Text>
				)}
				<Badge size={isMobile ? "sm" : "md"}>{workspace.odsVersion}</Badge>
			</Group>
			<Group gap={isMobile ? "xs" : "sm"} wrap="nowrap">
				<Menu>
					<Menu.Target>
						<ActionIcon variant={"default"} size={isMobile ? "md" : "lg"}>
							{colorScheme === "dark" ? (
								<BsMoon />
							) : colorScheme === "light" ? (
								<BsSun />
							) : (
								<BsLaptop />
							)}
						</ActionIcon>
					</Menu.Target>
					<Menu.Dropdown>
						<Menu.Item
							onClick={() => setColorScheme("light")}
							color={colorScheme === "light" ? "primary" : undefined}
							leftSection={<BsSun />}
						>
							Light
						</Menu.Item>
						<Menu.Item
							onClick={() => setColorScheme("dark")}
							color={colorScheme === "dark" ? "primary" : undefined}
							leftSection={<BsMoon />}
						>
							Dark
						</Menu.Item>
						<Menu.Item
							onClick={() => setColorScheme("auto")}
							color={colorScheme === "auto" ? "primary" : undefined}
							leftSection={<BsLaptop />}
						>
							Auto
						</Menu.Item>
					</Menu.Dropdown>
				</Menu>
				<ActionIcon
					size={isMobile ? "md" : "lg"}
					variant={"default"}
					onClick={closeWorkspace}
				>
					<CloseButton />
				</ActionIcon>
			</Group>
		</Group>
	);
}
