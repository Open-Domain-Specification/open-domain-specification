import { ActionIcon, Modal, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { VscQuestion } from "react-icons/vsc";
import { Markdown } from "./Markdown.tsx";

export function HelpModalWithButton({
	content,
	title,
}: {
	content: string;
	title: string;
}) {
	const [isOpen, open] = useDisclosure();

	return (
		<>
			<ActionIcon variant={"subtle"} onClick={open.open}>
				<VscQuestion />
			</ActionIcon>
			<Modal
				title={
					<Text fz={"lg"} fw={"bold"}>
						{title}
					</Text>
				}
				size={"xl"}
				opened={isOpen}
				onClose={open.close}
			>
				<Markdown content={content} />
			</Modal>
		</>
	);
}
