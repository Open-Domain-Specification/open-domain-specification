import type { Diagnostic } from "@open-domain-specification/core";
import * as vscode from "vscode";
import { locateRef } from "./locate";
import type { OdsProject, WorkspaceFile } from "./project";

/** Converts a span from locateRef into an editor range for the file's current text. */
export function rangeOfRef(file: WorkspaceFile, ref: string): vscode.Range {
	const { start, end } = locateRef(file.text, ref);
	const position = (offset: number) => {
		const before = file.text.slice(0, offset);
		const line = before.split("\n").length - 1;
		return new vscode.Position(line, offset - (before.lastIndexOf("\n") + 1));
	};
	return new vscode.Range(position(start), position(end));
}

function severityOf(d: Diagnostic): vscode.DiagnosticSeverity {
	return d.severity === "error"
		? vscode.DiagnosticSeverity.Error
		: vscode.DiagnosticSeverity.Warning;
}

/** Publishes core validation results and load failures to the Problems panel, one entry per file. */
export class OdsDiagnostics implements vscode.Disposable {
	private readonly collection =
		vscode.languages.createDiagnosticCollection("ods");
	/** Latest diagnostics per file uri, for badges elsewhere in the UI. */
	readonly byFile = new Map<string, Diagnostic[]>();
	private readonly subscription: vscode.Disposable;

	constructor(private readonly project: OdsProject) {
		this.subscription = project.onDidChange(() => this.refresh());
		this.refresh();
	}

	refresh(): void {
		this.collection.clear();
		this.byFile.clear();
		for (const file of this.project.files.values()) {
			const entries: vscode.Diagnostic[] = [];
			if (file.error) {
				entries.push(
					new vscode.Diagnostic(
						new vscode.Range(0, 0, 0, 0),
						`Workspace file could not be loaded: ${file.error}`,
						vscode.DiagnosticSeverity.Error,
					),
				);
			}
			const model = file.workspace?.validate() ?? [];
			this.byFile.set(file.uri.toString(), model);
			for (const d of model) {
				const entry = new vscode.Diagnostic(
					rangeOfRef(file, d.ref),
					d.message,
					severityOf(d),
				);
				entry.source = "ods";
				entry.code = d.rule;
				entries.push(entry);
			}
			this.collection.set(file.uri, entries);
		}
	}

	/** Diagnostics whose ref is the element or one of its descendants. */
	forRef(file: WorkspaceFile, ref: string): Diagnostic[] {
		const all = this.byFile.get(file.uri.toString()) ?? [];
		return all.filter((d) => d.ref === ref || d.ref.startsWith(`${ref}/`));
	}

	dispose(): void {
		this.subscription.dispose();
		this.collection.dispose();
	}
}
