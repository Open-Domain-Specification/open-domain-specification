import {
	ActionIcon,
	Alert,
	Container,
	FileInput,
	Flex,
	Image,
	Stack,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { useLocalStorage } from "@mantine/hooks";
import { showNotification } from "@mantine/notifications";
import { drizzle } from "drizzle-orm/sql-js";
import { useEffect, useRef } from "react";
import { BiImport } from "react-icons/bi";
import { useSearchParams } from "react-router-dom";
import { useAsyncFn, useMount, useWindowSize } from "react-use";
import { LearningResources } from "../components/LearningResources.tsx";
import { Markdown } from "../components/Markdown.tsx";
import { useWorkspace } from "../context/WorkspaceContext.tsx";
import { importWorkspaceToDatabase } from "../store/importWorkspaceToDatabase.ts";
import { initializeWorkspace } from "../store/initializeWorkspace.ts";
import { Workspace } from "../Workspace.ts";

const intro = `\
Use the **Open Domain Specification (ODS)** to model, document, and communicate your domain design using proven Domain-Driven Design patterns.
`;

export function ImportWorkspacePage() {
	const windowSize = useWindowSize();
	const inputRef = useRef<HTMLInputElement>(null);
	const { loadWorkspace } = useWorkspace();
	const [searchParams] = useSearchParams();

	const defaultExample = `${window.location.origin}/big-bank-workspace.json`;

	useMount(() => {
		const url = searchParams.get("url");
		if (url) {
			handleImportFromUrl(url);
		}
	});

	const [url, setUrl] = useLocalStorage<string | undefined>({
		key: "workspaceUrl",
		defaultValue: defaultExample,
		getInitialValueInEffect: true,
	});

	const [fileState, handleImportFromFile] = useAsyncFn(
		async (payload: File | null) => {
			const text = await payload?.text();

			if (!text) throw new Error("No file content provided");

			const data = JSON.parse(text);

			const database = await initializeWorkspace();
			const sqlJsDatabase = drizzle(database);
			importWorkspaceToDatabase(data, sqlJsDatabase);

			loadWorkspace(new Workspace(data, { database, sqlJsDatabase }));

			showNotification({
				title: "Workspace Loaded",
				message: `Loaded workspace: ${data.name} v${data.version}`,
				color: "green",
			});
		},
		[],
	);

	const [urlState, handleImportFromUrl] = useAsyncFn(
		async (url: string) => {
			setUrl(url);

			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch workspace from ${url}`);
			}

			const data = await response.json();

			const database = await initializeWorkspace();
			const sqlJsDatabase = drizzle(database);
			importWorkspaceToDatabase(data, sqlJsDatabase);

			loadWorkspace(new Workspace(data, { database, sqlJsDatabase }));

			showNotification({
				title: "Workspace Loaded",
				message: `Loaded workspace: ${data.name} v${data.version}`,
				color: "green",
			});
		},
		[setUrl],
	);

	useEffect(() => {
		if (url && inputRef.current) {
			inputRef.current.value = url;
		}
	}, [url]);

	return (
		<Container p={"xl"} size={"xl"} flex={"auto"} display={"flex"}>
			<Stack gap={"xl"}>
				<Flex align={"center"} flex={"auto"}>
					<Stack>
						<Stack flex={"auto"}>
							<Title>Open Domain Specification</Title>
							<Markdown content={intro} />

							<TextInput
								placeholder={defaultExample}
								disabled={fileState.loading}
								readOnly={urlState.loading}
								label={"Import"}
								description={`Import an existing workspace from a URL, this will be loaded locally. ${defaultExample}`}
								ref={inputRef}
								defaultValue={url}
								onBlur={(e) => {
									if (e.currentTarget.value === "") {
										e.currentTarget.value = defaultExample;
									}
								}}
								rightSection={
									<ActionIcon
										variant={"transparent"}
										onClick={() =>
											inputRef.current &&
											handleImportFromUrl(inputRef.current?.value)
										}
										loading={urlState.loading}
									>
										<BiImport />
									</ActionIcon>
								}
							/>

							{urlState.error && (
								<Alert color={"red"} title={urlState.error.name}>
									{urlState.error?.message}
								</Alert>
							)}

							<FileInput
								readOnly={fileState.loading}
								label={"Upload"}
								description={
									"Import an existing workspace from a local file, this will be imported into the browser."
								}
								onChange={handleImportFromFile}
								disabled={urlState.loading}
								accept={".json"}
							/>

							{fileState.error && (
								<Alert color={"red"} title={fileState.error.name}>
									{fileState.error?.message}
								</Alert>
							)}

							<Alert>
								<Stack gap={"sm"}>
									<Text fw={"bold"} size={"sm"}>
										🔒 100% Client-Side. Your Data Never Leaves Your Browser.
									</Text>
									<Text size={"xs"}>
										This app runs entirely in your browser — no servers, no
										telemetry, no tracking. When importing a workspace, the app
										fetches your file directly from the provided URL, so make
										sure it supports CORS.
									</Text>
								</Stack>
							</Alert>
						</Stack>
					</Stack>
					{windowSize.width > windowSize.height && (
						<Stack w={"50%"} justify={"center"} flex={"auto"} align={"center"}>
							<Image src={"/logo.png"} alt="logo" w={"20vw"} />
						</Stack>
					)}
				</Flex>
				<LearningResources />
			</Stack>
		</Container>
	);
}
