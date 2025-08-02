import type { BoundedContext, Domain, Subdomain } from "open-domain-schema";
import { useNavigate } from "react-router-dom";
import { Icons } from "../Icons.tsx";
import { GenericCard } from "./GenericCard.tsx";

export function BoundedContextCard({
	boundedContext,
}: {
	domain: Domain;
	subdomain: Subdomain;
	boundedContext: BoundedContext;
}) {
	const nav = useNavigate();

	return (
		<GenericCard
			onClick={() => nav(boundedContext.id)}
			title={boundedContext.name}
			content={boundedContext.description}
			badges={[
				{
					content: boundedContext.aggregates?.length || 0,
					icon: Icons.Aggregate,
				},
			]}
		/>
	);
}
