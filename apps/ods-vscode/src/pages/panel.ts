import { readFileSync } from "node:fs";
import type {
	HostMessage,
	WebviewMessage,
} from "@open-domain-specification/pages";
import * as vscode from "vscode";
import type { OdsDiagnostics } from "../diagnostics";
import type { OdsProject, WorkspaceFile } from "../project";

type Location = { file: WorkspaceFile; ref: string };

/**
 * One reusable webview hosting the shared pages app. The extension feeds it the
 * workspace and diagnostics over postMessage; the app owns routing and reports
 * every navigation back so the tree can follow.
 */
export class DetailPanel implements vscode.Disposable {
	private panel?: vscode.WebviewPanel;
	private current?: Location;
	private ready = false;
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
		const sameFile =
			this.current?.file.uri.toString() === location.file.uri.toString();
		this.current = location;
		this.ensurePanel();
		if (sameFile && this.ready)
			this.post({ type: "navigate", ref: location.ref });
		else this.send();
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
		});
		this.panel.webview.onDidReceiveMessage((msg: WebviewMessage) => {
			this.received.fire(msg);
			if (!this.current) return;
			switch (msg.type) {
				case "ready":
					this.ready = true;
					this.send();
					break;
				case "navigated":
					if (msg.ref && msg.ref !== this.current.ref) {
						this.current = { file: this.current.file, ref: msg.ref };
						this.opened.fire(this.current);
					}
					break;
				case "reveal":
					void vscode.commands.executeCommand("ods.revealInJson", {
						file: this.current.file,
						ref: msg.ref,
					});
					break;
			}
		});
		this.panel.webview.html = this.shell();
	}

	private post(msg: HostMessage): void {
		void this.panel?.webview.postMessage(msg);
	}

	/** Sends the current file's workspace and diagnostics; the app re-renders in place. */
	private send(): void {
		if (!this.panel || !this.current) return;
		const { file, ref } = this.current;
		const live = this.project.files.get(file.uri.toString());
		if (!live?.workspace) {
			this.panel.title = "Unavailable";
			this.post({ type: "model", workspaces: [], ref });
			return;
		}
		this.panel.title = live.workspace.name;
		this.post({
			type: "model",
			workspaces: [
				{
					schema: live.workspace.toSchema(),
					fileLabel: live.relativePath,
					diagnostics: this.diagnostics.byFile.get(live.uri.toString()) ?? [],
				},
			],
			ref,
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
	<span class="spacer"></span>
	<button class="icon" data-action="reveal" title="Reveal in JSON"><i class="codicon codicon-go-to-file"></i></button>
</div>
<div id="app"></div>
<script nonce="${nonce}">
	// The app acquires the VS Code API itself; this shell only forwards the toolbar and says hello.
	window.__ODS__ = { workspaces: [] };
	document.querySelector('[data-action="reveal"]').addEventListener("click", () => {
		window.postMessage({ type: "toolbar", action: "reveal" }, "*");
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
