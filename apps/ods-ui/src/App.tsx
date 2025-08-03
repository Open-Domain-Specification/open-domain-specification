import { Route, Routes } from "react-router-dom";
import { GenericNotFoundContent } from "./components/GenericNotFoundContent.tsx";
import { INITIAL_WORKSPACE, useWorkspace } from "./context/Workspace.tsx";
import { AggregatePage } from "./pages/AggregatePage.tsx";
import { BoundedContextPage } from "./pages/BoundedContextPage.tsx";
import { DomainPage } from "./pages/DomainPage.tsx";
import { HomePage } from "./pages/HomePage.tsx";
import { ImportWorkspacePage } from "./pages/ImportWorkspacePage.tsx";
import { ServicePage } from "./pages/ServicePage.tsx";
import { SubdomainPage } from "./pages/SubdomainPage.tsx";

export function App() {
	const { workspace } = useWorkspace();
	return (
		<Routes>
			{workspace === INITIAL_WORKSPACE ? (
				<Route path={"/*"} element={<ImportWorkspacePage />} />
			) : (
				<>
					<Route path={"/"} element={<HomePage />} />
					<Route path={"/:domainId"} element={<DomainPage />} />
					<Route path={"/:domainId/:subdomainId"} element={<SubdomainPage />} />
					<Route
						path={"/:domainId/:subdomainId/:boundedContextId"}
						element={<BoundedContextPage />}
					/>
					<Route
						path={
							"/:domainId/:subdomainId/:boundedContextId/services/:serviceId"
						}
						element={<ServicePage />}
					/>
					<Route
						path={
							"/:domainId/:subdomainId/:boundedContextId/aggregates/:aggregateId"
						}
						element={<AggregatePage />}
					/>
					<Route path={"*"} element={<GenericNotFoundContent />} />
				</>
			)}
		</Routes>
	);
}
