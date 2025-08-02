import type {
	Aggregate,
	BoundedContext,
	Domain,
	Subdomain,
} from "open-domain-schema";
import { useNavigate } from "react-router-dom";
import { Icons } from "../Icons.tsx";
import { GenericCard } from "./GenericCard.tsx";

export function AggregateCard({
	aggregate,
}: {
	domain: Domain;
	subdomain: Subdomain;
	boundedContext: BoundedContext;
	aggregate: Aggregate;
}) {
	const nav = useNavigate();
	return (
		<GenericCard
			onClick={() => nav(aggregate.id)}
			title={aggregate.name}
			content={aggregate.description}
			badges={[
				{ content: aggregate.entities?.length || 0, icon: Icons.Entity },
				{
					content: aggregate.valueObjects?.length || 0,
					icon: Icons.ValueObject,
				},
			]}
		/>
	);
}
