import { Spotlight } from "@mantine/spotlight";
import { BiSearch } from "react-icons/bi";

export function AppSpotlight() {
	return (
		<Spotlight
			actions={[]}
			nothingFound="Nothing found..."
			highlightQuery
			searchProps={{
				leftSection: <BiSearch />,
				placeholder: "Search...",
			}}
		/>
	);
}
