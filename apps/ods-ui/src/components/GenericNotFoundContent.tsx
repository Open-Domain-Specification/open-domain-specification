import { Button, Group } from "@mantine/core";
import { AiOutlineWarning } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { PageSkeleton } from "./PageSkeleton.tsx";

export function GenericNotFoundContent() {
	const nav = useNavigate();

	function handleHome() {
		nav("/");
	}

	return (
		<PageSkeleton
			avatar={<AiOutlineWarning />}
			title={"Not Found"}
			description={"The page you are looking for does not exist."}
		>
			<Group>
				<Button onClick={handleHome}>Home</Button>
			</Group>
		</PageSkeleton>
	);
}
