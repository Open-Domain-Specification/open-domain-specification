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
import { BiDownload } from "react-icons/bi";
import { BsLaptop, BsMoon, BsSun } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "./context/WorkspaceContext.tsx";
import { useExportWorkspace } from "./hooks/useExportWorkspace.ts";

export function AppHeader({ onToggleMobile }: { onToggleMobile?: () => void }) {
	const { workspace, closeWorkspace } = useWorkspace();
	const nav = useNavigate();
	const { colorScheme, setColorScheme } = useMantineColorScheme();
	const exportWorkspace = useExportWorkspace();
	const isMobile = useMediaQuery("(max-width: 768px)");

	return (
		<Group justify={"space-between"} flex={"auto"}>
			<Group>
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
				/>
				<Text fz={"md"} fw={"bold"}>
					{workspace.name} | {workspace.version}
				</Text>
				<Badge>{workspace.odsVersion}</Badge>
			</Group>
			<Group>
				<Menu>
					<Menu.Target>
						<ActionIcon variant={"default"} size={"lg"}>
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
				<ActionIcon size={"lg"} variant={"default"} onClick={closeWorkspace}>
					<CloseButton />
				</ActionIcon>
				<ActionIcon size={"lg"} variant={"default"} onClick={exportWorkspace}>
					<BiDownload />
				</ActionIcon>
			</Group>
		</Group>
	);
}
