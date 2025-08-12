import { Icons } from "../Icons.tsx";
import { GenericCard } from "./GenericCard.tsx";

export function ServiceCard(props: {
	name: string;
	description: string;
	type: string;
	onClick: () => void;
}) {
	return (
		<GenericCard
			onClick={props.onClick}
			title={props.name}
			content={props.description}
			badges={[{ content: props.type, icon: Icons.Service }]}
		/>
	);
}
