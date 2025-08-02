import type { Subdomain } from "open-domain-schema";
import { useNavigate } from "react-router-dom";
import { Icons } from "../Icons.tsx";
import { GenericCard } from "./GenericCard";

export function SubDomainCard({ subdomain }: { subdomain: Subdomain }) {
	const nav = useNavigate();

	return (
		<GenericCard
			onClick={() => nav(subdomain.id)}
			title={subdomain.name}
			content={subdomain.description}
			badges={[
				{
					content: subdomain.boundedContexts?.length || 0,
					icon: Icons.BoundedContext,
				},
			]}
		/>
	);
}
