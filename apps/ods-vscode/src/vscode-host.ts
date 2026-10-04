import type { SetPath } from "@open-domain-specification/core";
import * as vscode from "vscode";
import type { EditorHost } from "./editor-io";

/** The real editor for the files under one `.ods` folder: open documents come from `workspace.textDocuments`, edits go through `workspace.applyEdit`. */
export function vscodeEditorHost(
	root: vscode.Uri,
): EditorHost<vscode.TextDocument> {
	const uriOf = (file: SetPath) =>
		vscode.Uri.joinPath(root, ...file.split("/"));
	return {
		openDocument(file) {
			const key = uriOf(file).toString();
			return vscode.workspace.textDocuments.find(
				(d) => !d.isClosed && d.uri.toString() === key,
			);
		},
		async replaceAll(_file, document, text) {
			const edit = new vscode.WorkspaceEdit();
			const end = document.lineAt(document.lineCount - 1).range.end;
			edit.replace(
				document.uri,
				new vscode.Range(0, 0, end.line, end.character),
				text,
			);
			return vscode.workspace.applyEdit(edit);
		},
	};
}
