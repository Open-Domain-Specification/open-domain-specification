import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App.tsx";
import { AppMantineProvider } from "./AppMantineProvider.tsx";
import { WorkspaceProvider } from "./context/Workspace.tsx";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<WorkspaceProvider>
			<AppMantineProvider>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</AppMantineProvider>
		</WorkspaceProvider>
	</StrictMode>,
);
