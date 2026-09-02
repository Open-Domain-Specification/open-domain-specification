import {
	diagramModal,
	dotToSvg,
	esc,
	renderPage,
	tocList,
} from "@open-domain-specification/pages";
import * as vscode from "vscode";
import type { OdsDiagnostics } from "../diagnostics";
import type { OdsProject, WorkspaceFile } from "../project";

type Location = { file: WorkspaceFile; ref: string };

/** One reusable webview that shows the page for whichever element was last opened. */
export class DetailPanel implements vscode.Disposable {
	private panel?: vscode.WebviewPanel;
	private current?: Location;
	private readonly history: Location[] = [];
	private readonly forward: Location[] = [];
	private renderGeneration = 0;
	private readonly subscriptions: vscode.Disposable[] = [];
	private readonly opened = new vscode.EventEmitter<Location>();
	/** Fires whenever a page is shown, so the tree can follow. */
	readonly onDidOpen = this.opened.event;

	constructor(
		private readonly extensionUri: vscode.Uri,
		private readonly project: OdsProject,
		private readonly diagnostics: OdsDiagnostics,
	) {
		this.subscriptions.push(
			project.onDidChange(() => {
				if (this.current) void this.render();
			}),
		);
	}

	async open(
		location: Location,
		opts: { record?: boolean } = {},
	): Promise<void> {
		if (opts.record !== false && this.current) {
			this.history.push(this.current);
			this.forward.length = 0;
		}
		this.current = location;
		this.ensurePanel();
		await this.render();
		this.opened.fire(location);
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
			"media/activity.svg",
		);
		this.panel.onDidDispose(() => {
			this.panel = undefined;
		});
		this.panel.webview.onDidReceiveMessage(
			(msg: { type: string; ref?: string }) => {
				if (!this.current) return;
				switch (msg.type) {
					case "navigate":
						if (msg.ref) void this.navigateRef(msg.ref);
						break;
					case "back": {
						const prev = this.history.pop();
						if (prev) {
							this.forward.push(this.current);
							void this.open(prev, { record: false });
						}
						break;
					}
					case "forward": {
						const next = this.forward.pop();
						if (next) {
							this.history.push(this.current);
							void this.open(next, { record: false });
						}
						break;
					}
					case "reveal":
						void vscode.commands.executeCommand("ods.revealInJson", {
							file: this.current.file,
							ref: msg.ref ?? this.current.ref,
						});
						break;
				}
			},
		);
	}

	/** Refs from the page are local to the current file until card 07 adds file-qualified refs. */
	private async navigateRef(ref: string): Promise<void> {
		if (!this.current) return;
		await this.open({ file: this.current.file, ref });
	}

	private async render(): Promise<void> {
		if (!this.panel || !this.current) return;
		const { file, ref } = this.current;
		const live = this.project.files.get(file.uri.toString());
		const generation = ++this.renderGeneration;
		if (!live?.workspace) {
			this.panel.title = "Unavailable";
			this.panel.webview.html = this.shell(
				"Unavailable",
				`<p class="empty">${esc(live ? (live.error ?? "Workspace not loaded.") : `${file.relativePath} is no longer in the .ods folder.`)}</p>`,
				[],
				undefined,
			);
			return;
		}
		const page = await renderPage({
			workspace: live.workspace,
			ref,
			fileLabel: live.relativePath,
			diagnostics: this.diagnostics.byFile.get(live.uri.toString()) ?? [],
			svg: dotToSvg,
		});
		// A later navigation may have finished first; never overwrite it with an older page.
		if (generation !== this.renderGeneration || !this.panel) return;
		this.panel.title = page.title;
		this.panel.webview.html = this.shell(
			page.title,
			page.body,
			page.sections,
			page.anchor,
		);
	}

	private shell(
		title: string,
		body: string,
		sections: { id: string; label: string }[],
		anchor: string | undefined,
	): string {
		const webview = this.panel!.webview;
		const media = (p: string) =>
			webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, "media", p));
		const nonce = Math.random().toString(36).slice(2);
		const canBack = this.history.length > 0;
		const canForward = this.forward.length > 0;
		return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource}; img-src ${webview.cspSource} data:; script-src 'nonce-${nonce}';">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="${media("codicons/codicon.css")}">
<link rel="stylesheet" href="${media("page.css")}">
<title>${esc(title)}</title>
</head>
<body data-anchor="${anchor ? esc(anchor) : ""}">
<div class="toolbar">
	<button class="icon" data-action="back" ${canBack ? "" : "disabled"} title="Back"><i class="codicon codicon-arrow-left"></i></button>
	<button class="icon" data-action="forward" ${canForward ? "" : "disabled"} title="Forward"><i class="codicon codicon-arrow-right"></i></button>
	<span class="spacer"></span>
	<button class="icon" data-action="reveal" title="Reveal in JSON"><i class="codicon codicon-go-to-file"></i></button>
</div>
<div class="layout">
	<main>${body}</main>
	${tocList(sections)}
</div>
${diagramModal()}
<script nonce="${nonce}" src="${media("page.js")}"></script>
</body>
</html>`;
	}

	dispose(): void {
		this.panel?.dispose();
		for (const s of this.subscriptions) s.dispose();
		this.opened.dispose();
	}
}
