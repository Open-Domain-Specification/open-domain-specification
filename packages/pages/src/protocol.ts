import type { Diagnostic } from "@open-domain-specification/core";

/**
 * The contract between the app and whatever hosts it. Pure types, exported
 * from the package root so the extension and the app compile against one
 * definition.
 */

/** One workspace as handed to the app: its schema JSON, a label and optional diagnostics. */
export type WorkspacePayload = {
	schema: unknown;
	fileLabel: string;
	diagnostics?: Diagnostic[];
};

/** What a host may place on `window.__ODS__` before the app script runs. */
export type Bootstrap = {
	workspaces: WorkspacePayload[];
	/** Ref to open first, when the host wants one other than the hash. */
	ref?: string;
};

/** Messages from the VS Code extension to the webview. */
export type HostMessage =
	| { type: "model"; workspaces: WorkspacePayload[]; ref?: string }
	| { type: "navigate"; ref: string }
	/** Relayed by the webview shell when its toolbar is used. */
	| { type: "toolbar"; action: "reveal" };

/** Messages from the webview back to the extension. */
export type WebviewMessage =
	| { type: "ready" }
	| { type: "navigated"; ref: string }
	| { type: "reveal"; ref: string };
