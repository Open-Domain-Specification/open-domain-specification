import {
	ActionIcon,
	Avatar,
	Badge,
	CloseButton,
	Group,
	Menu,
	Text,
	useMantineColorScheme,
} from "@mantine/core";
import { BsLaptop, BsMoon, BsSun } from "react-icons/bs";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "./context/Workspace.tsx";

export function AppHeader() {
	const { workspace, closeWorkspace } = useWorkspace();
	const nav = useNavigate();
	const { colorScheme, setColorScheme } = useMantineColorScheme();

	return (
		<Group justify={"space-between"} flex={"auto"}>
			<Group>
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
							color={colorScheme === "auto" ? "primary" : undefined}
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
			</Group>
		</Group>
	);
}
