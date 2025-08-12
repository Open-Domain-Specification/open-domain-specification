import { GenericCard } from "./GenericCard.tsx";

export function BoundedContextCard(props: {
	name: string;
	description: string;
	onClick: () => void;
}) {
	return (
		<GenericCard
			onClick={props.onClick}
			title={props.name}
			content={props.description}
			badges={[]}
		/>
	);
}
