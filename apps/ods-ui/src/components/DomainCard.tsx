import type { JSX } from "react";
import { GenericCard } from "./GenericCard";

export function DomainCard({
	onClick,
	name,
	description,
}: {
	onClick?: () => void;
	name: string;
	description: string;
}): JSX.Element {
	return (
		<GenericCard
			onClick={onClick}
			title={name}
			content={description}
			badges={[]}
		/>
	);
}
