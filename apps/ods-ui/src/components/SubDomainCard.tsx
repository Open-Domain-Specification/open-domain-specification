import { GenericCard } from "./GenericCard";

export function SubDomainCard(props: {
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
