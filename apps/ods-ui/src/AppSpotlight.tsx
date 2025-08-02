import { Spotlight, type SpotlightProps } from "@mantine/spotlight";
import { useMemo } from "react";
import { BiSearch } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import { useWorkspace } from "./context/Workspace.tsx";
import { getSubdomainId } from "./utils/getSubdomainId.ts";

export function AppSpotlight() {
	const { workspace } = useWorkspace();
	const nav = useNavigate();

	const actions = useMemo(() => {
		return workspace.domains.flatMap((domain): SpotlightProps["actions"] => {
			return [
				...(domain.subdomains?.map(
					(subdomain): SpotlightProps["actions"][number] => ({
						id: getSubdomainId(domain, subdomain),
						label: subdomain.name,
						description: subdomain.description,
						onClick: () => nav(`/${domain.id}/${subdomain.id}`),
						group: domain.name,
					}),
				) || []),
			];
		});
	}, [workspace, nav]);

	return (
		<Spotlight
			actions={actions}
			nothingFound="Nothing found..."
			highlightQuery
			searchProps={{
				leftSection: <BiSearch />,
				placeholder: "Search...",
			}}
		/>
	);
}
