import { randomBytes } from "node:crypto";
import * as vscode from "vscode";
import type { FormToHost, HostToForm } from "./form-protocol";
import { asFormMessage, renderDocument, toWebview } from "./render";
import { type AuthoringPort, type FormRequest, FormSession } from "./session";

/**
 * The vscode glue of one form: a dedicated webview panel over a `FormSession`.
 * It decides nothing about the model. It renders what the session hands it,
 * passes the four messages the page may post to the session, and closes when
 * the form is saved, cancelled or disposed. The session is the authority for
 * every choice, every value and every refusal.
 */

const VIEW_TYPE = "odsForm";

export class FormPanel implements vscode.Disposable {
	private readonly panel: vscode.WebviewPanel;
	private readonly subscriptions: vscode.Disposable[] = [];
	private queue: Promise<void> = Promise.resolve();
	private disposed = false;
	private readonly disposedEmitter = new vscode.EventEmitter<void>();
	readonly onDidDispose = this.disposedEmitter.event;

	/** The title the form opened with (display, and what a test finds the tab by). */
	readonly title: string;
	readonly mode: "add" | "update";
	readonly family: string;
	readonly requestId: string;

	/** Opens the form for `request`, or tells the person why it cannot be opened and returns nothing. */
	static async open(
		extensionUri: vscode.Uri,
		port: AuthoringPort,
		request: FormRequest,
	): Promise<FormPanel | undefined> {
		const opened = await FormSession.open(port, request);
		if (!opened.ok) {
			void vscode.window.showErrorMessage(`${opened.message} ${opened.action}`);
			return undefined;
		}
		return new FormPanel(extensionUri, opened.session);
	}

	private constructor(
		extensionUri: vscode.Uri,
		private readonly session: FormSession,
	) {
		const init = session.init();
		this.title = init.title;
		this.mode = init.mode;
		this.family = init.family;
		this.requestId = init.requestId;
		const media = vscode.Uri.joinPath(extensionUri, "media", "form");
		this.panel = vscode.window.createWebviewPanel(
			VIEW_TYPE,
			init.title,
			{ viewColumn: vscode.ViewColumn.Active, preserveFocus: false },
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [media],
			},
		);
		this.panel.iconPath = vscode.Uri.joinPath(extensionUri, "media/icon.png");
		const webview = this.panel.webview;
		this.panel.webview.html = renderDocument(init, {
			nonce: randomBytes(16).toString("base64url"),
			cspSource: webview.cspSource,
			scriptUri: webview
				.asWebviewUri(vscode.Uri.joinPath(media, "form.js"))
				.toString(),
			styleUri: webview
				.asWebviewUri(vscode.Uri.joinPath(media, "form.css"))
				.toString(),
		});
		this.subscriptions.push(
			webview.onDidReceiveMessage((raw: unknown) => this.receive(raw)),
			this.panel.onDidDispose(() => this.cleanup()),
		);
	}

	private receive(raw: unknown): void {
		const msg = asFormMessage(raw);
		if (!msg || this.disposed) return;
		// One message at a time: a save must finish before the next change is read.
		this.queue = this.queue.then(() => this.handle(msg));
	}

	private async handle(msg: FormToHost): Promise<void> {
		if (this.disposed) return;
		let replies: HostToForm[];
		try {
			replies = await this.session.handle(msg);
		} catch (e) {
			replies = [
				{
					type: "validation",
					requestId: msg.requestId,
					errors: [
						{
							field: null,
							message: `The form could not be processed: ${e instanceof Error ? e.message : String(e)}. Nothing was changed.`,
						},
					],
				},
			];
		}
		if (msg.type === "cancel") {
			this.dispose();
			return;
		}
		for (const reply of replies) {
			if (reply.type === "saved") {
				void vscode.window.showInformationMessage(reply.message);
				this.dispose();
				return;
			}
			const out = toWebview(reply);
			if (out && !this.disposed) await this.panel.webview.postMessage(out);
		}
	}

	private cleanup(): void {
		if (this.disposed) return;
		this.disposed = true;
		// A form closed any other way is a cancel: nothing was written.
		void this.session.handle({ type: "cancel", requestId: this.requestId });
		for (const s of this.subscriptions) s.dispose();
		this.disposedEmitter.fire();
		this.disposedEmitter.dispose();
	}

	get isDisposed(): boolean {
		return this.disposed;
	}

	dispose(): void {
		if (this.disposed) return;
		this.panel.dispose();
		this.cleanup();
	}
}
