import { readFileSync } from "node:fs";
import type {
	HostMessage,
	WebviewMessage,
} from "@open-domain-specification/pages";
import * as vscode from "vscode";
import type { OdsDiagnostics } from "../diagnostics";
import type { OdsProject, WorkspaceFile } from "../project";
import { locationOfRoute, readerPayloads, routeOfLocation } from "../reader";

type Location = { file: WorkspaceFile; ref: string };

/**
 * One reusable webview hosting the shared pages app. The extension feeds it the
 * whole `.ods` folder (every file that has a workspace to show) and the
 * diagnostics of each file over postMessage; the app owns routing and reports
 * every navigation back, as a route that names a file, so the tree can follow
 * to the file that owns the page.
 */
export class DetailPanel implements vscode.Disposable {
	private panel?: vscode.WebviewPanel;
	private current?: Location;
	private ready = false;
	/** The folder whose files the webview holds, so a different one restarts its history. */
	private shown?: string;
	/** The files the webview was handed last, in the order it was given them. */
	private members: WorkspaceFile[] = [];
	private readonly subscriptions: vscode.Disposable[] = [];
	private readonly opened = new vscode.EventEmitter<Location>();
	/** Fires whenever a page is shown, so the tree can follow. */
	readonly onDidOpen = this.opened.event;
	private readonly received = new vscode.EventEmitter<WebviewMessage>();
	/**
	 * Test seam: every message the webview posts, before it is acted on. Lets an
	 * integration test observe the real app booting and routing inside VS Code.
	 */
	readonly onDidReceiveWebviewMessage: vscode.Event<WebviewMessage> =
		this.received.event;

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly project: OdsProject,
		private readonly diagnostics: OdsDiagnostics,
	) {
		this.subscriptions.push(
			project.onDidChange(() => {
				if (this.current) this.send();
			}),
		);
	}

	async open(location: Location): Promise<void> {
		// The webview holds the whole folder, so another file of it is a page of
		// what it already has, not another workspace.
		const sameFolder =
			this.shown !== undefined &&
			this.shown === this.project.folderKey(location.file) &&
			this.members.some(
				(f) => f.uri.toString() === location.file.uri.toString(),
			);
		this.current = location;
		this.ensurePanel();
		if (sameFolder && this.ready)
			this.post({ type: "navigate", ref: this.routeOf(location) });
		else this.send();
	}

	/** The route the app writes for a location: qualified by file when the app holds more than one. */
	private routeOf({ file, ref }: Location): string {
		return routeOfLocation(
			this.members.map((f) => f.relativePath),
			file.relativePath,
			ref,
		);
	}

	private ensurePanel(): void {
		if (this.panel) {
			this.panel.reveal(undefined, true);
			return;
		}
		this.panel = vscode.window.createWebviewPanel(
			"odsPage",
			"ODS",
			{ viewColumn: vscode.ViewColumn.One, preserveFocus: true },
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "media")],
			},
		);
		this.panel.iconPath = vscode.Uri.joinPath(
			this.extensionUri,
			"media/icon.png",
		);
		this.panel.onDidDispose(() => {
			this.panel = undefined;
			this.ready = false;
			this.shown = undefined;
		});
		this.panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
			this.received.fire(msg);
			if (!this.current) return;
			switch (msg.type) {
				case "ready":
					this.ready = true;
					// A webview that says ready has a fresh page and an empty history.
					this.shown = undefined;
					this.send();
					break;
				case "navigated": {
					const at = this.locate(msg.ref);
					if (
						at &&
						(at.file !== this.current.file || at.ref !== this.current.ref)
					) {
						this.current = at;
						this.opened.fire(this.current);
					}
					break;
				}
				case "reveal": {
					// The route of a page that is no one file's (the set's own) reveals
					// the file the reader was last in.
					const at = this.locate(msg.ref) ?? {
						file: this.current.file,
						ref: "#",
					};
					void vscode.commands.executeCommand("ods.revealInJson", {
						file: at.file,
						ref: at.ref,
					});
					break;
				}
			}
		});
		this.panel.webview.html = this.shell();
	}

	/** The file and local ref a route of the app names, among the files the app was handed. */
	private locate(route: string): Location | undefined {
		const at = locationOfRoute(
			this.members.map((f) => f.relativePath),
			route,
		);
		const file = at && this.members.find((f) => f.relativePath === at.file);
		return at && file ? { file, ref: at.ref } : undefined;
	}

	/**
	 * Test seam: asks the webview what its rendered descriptions hold, and what
	 * each of `selectors` matches; it answers with a `rendered` message.
	 */
	probe(selectors?: string[]): void {
		this.post({ type: "probe", selectors });
	}

	private post(msg: HostMessage): void {
		void this.panel?.webview.postMessage(msg);
	}

	/** Sends the folder of the current file; the app re-renders in place. */
	private send(): void {
		if (!this.panel || !this.current) return;
		const { file } = this.current;
		const key = file.uri.toString();
		const folder = this.project.folderKey(file);
		// Another folder, or a webview with no history yet, starts its history here.
		const reset = this.shown !== folder;
		this.shown = folder;
		const live = this.project.files.get(key);
		if (!live?.workspace) {
			this.members = [];
			this.panel.title = "Unavailable";
			this.post({
				type: "model",
				workspaces: [],
				ref: this.current.ref,
				...(reset && { reset }),
			});
			return;
		}
		this.members = this.project.folderFiles(live).filter((f) => f.workspace);
		// A route is read against the files the app now holds, so the current
		// location is looked up in them afresh: a file that no longer loads at
		// all is a different folder to the app, and `live` is in it by its stale
		// load.
		const current = { file: live, ref: this.current.ref };
		this.current = current;
		this.panel.title = live.workspace.name;
		this.post({
			type: "model",
			workspaces: readerPayloads(
				folder,
				this.members.map((f) => ({
					relativePath: f.relativePath,
					workspace: f.workspace,
					stale: f.stale,
					error: f.error,
					diagnostics: this.diagnostics.byFile.get(f.uri.toString()) ?? [],
				})),
			),
			ref: this.routeOf(current),
			...(reset && { reset }),
		});
		this.opened.fire(this.current);
	}

	private shell(): string {
		const webview = this.panel!.webview;
		const appDir = vscode.Uri.joinPath(this.extensionUri, "media", "app");
		const media = (name: string) =>
			webview.asWebviewUri(vscode.Uri.joinPath(appDir, name));
		// Vite's index.html names the current entry chunk and stylesheet.
		let html = "";
		try {
			html = readFileSync(
				vscode.Uri.joinPath(appDir, "index.html").fsPath,
				"utf8",
			);
		} catch {}
		const script = html.match(/src="\.\/(assets\/index-[^"]+\.js)"/)?.[1];
		const style = html.match(/href="\.\/(assets\/index-[^"]+\.css)"/)?.[1];
		if (!script || !style)
			throw new Error(
				`Pages app bundle not found in ${appDir.fsPath}; rebuild the extension.`,
			);
		const nonce = Math.random().toString(36).slice(2);
		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}' 'wasm-unsafe-eval';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${media(style)}">
<title>ODS</title>
</head>
<body>
<div class="toolbar">
	<button class="icon" data-action="back" title="Back" aria-label="Back" disabled><i class="codicon codicon-arrow-left"></i></button>
	<button class="icon" data-action="forward" title="Forward" aria-label="Forward" disabled><i class="codicon codicon-arrow-right"></i></button>
	<span class="spacer"></span>
	<button class="icon" data-action="reveal" title="Reveal in JSON"><i class="codicon codicon-go-to-file"></i></button>
</div>
<div id="app"></div>
<script nonce="${nonce}">
	// The app acquires the VS Code API itself; this shell only forwards the toolbar and says hello.
	window.__ODS__ = { workspaces: [] };
	for (const button of document.querySelectorAll("[data-action]")) {
		button.addEventListener("click", () => {
			window.postMessage({ type: "toolbar", action: button.dataset.action }, "*");
		});
	}
	// Back and Forward stay disabled until the app, which owns the history, says
	// there is a page to go to. Only the app's own window posts these; the host's
	// messages come from elsewhere.
	const back = document.querySelector('[data-action="back"]');
	const forward = document.querySelector('[data-action="forward"]');
	window.addEventListener("message", (e) => {
		if (e.source !== window || e.data?.type !== "history") return;
		back.disabled = !e.data.canGoBack;
		forward.disabled = !e.data.canGoForward;
	});
</script>
<script type="module" nonce="${nonce}" src="${media(script)}"></script>
</body>
</html>`;
	}

	dispose(): void {
		this.panel?.dispose();
		for (const s of this.subscriptions) s.dispose();
		this.opened.dispose();
		this.received.dispose();
	}
}
