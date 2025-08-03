import type {
	BoundedContext,
	Domain,
	Service,
	Subdomain,
} from "open-domain-schema";
import { useNavigate } from "react-router-dom";
import { Icons } from "../Icons.tsx";
import { GenericCard } from "./GenericCard.tsx";

export function ServiceCard({
	service,
}: {
	domain: Domain;
	subdomain: Subdomain;
	boundedContext: BoundedContext;
	service: Service;
}) {
	const nav = useNavigate();
	return (
		<GenericCard
			onClick={() => nav(`services/${service.id}`)}
			title={service.name}
			content={service.description}
			badges={[
				{ content: service.provides?.length || 0, icon: Icons.Provider },
				{
					content: service.consumes?.length || 0,
					icon: Icons.Consumer,
				},
				{ content: service.type, icon: Icons.Service },
			]}
		/>
	);
}
