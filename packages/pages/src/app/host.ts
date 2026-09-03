import type { Bootstrap, WebviewMessage } from "../protocol";

export type { Bootstrap, HostMessage, WorkspacePayload } from "../protocol";

type VsCodeApi = { postMessage(msg: WebviewMessage): void };
declare const acquireVsCodeApi: (() => VsCodeApi) | undefined;

/** The VS Code bridge when running in a webview, else undefined. */
export const vscode: VsCodeApi | undefined =
	typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : undefined;

/** True when a host embeds the app and owns navigation chrome (the extension's tree view). */
export const embedded = vscode !== undefined;

export const bootstrap = (): Bootstrap | undefined =>
	(window as unknown as { __ODS__?: Bootstrap }).__ODS__;
