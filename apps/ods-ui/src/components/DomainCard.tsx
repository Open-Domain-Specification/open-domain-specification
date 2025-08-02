import type { Domain } from "open-domain-schema";
import { useNavigate } from "react-router-dom";
import { Icons } from "../Icons.tsx";
import { GenericCard } from "./GenericCard";

export function DomainCard({ domain }: { domain: Domain }) {
	const nav = useNavigate();

	return (
		<GenericCard
			onClick={() => nav(domain.id)}
			title={domain.name}
			content={domain.description}
			badges={[
				{
					content: domain.subdomains?.length || 0,
					icon: Icons.Subdomain,
				},
			]}
		/>
	);
}
