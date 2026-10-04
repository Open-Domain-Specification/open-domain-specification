import { exportSite } from "@open-domain-specification/pages/site";
import * as vscode from "vscode";
import { OdsDiagnostics, rangeOfRef } from "./diagnostics";
import { DetailPanel } from "./pages/panel";
import { OdsProject, odsFolderOf } from "./project";
import { exportSources } from "./reader";
import { showSearch } from "./search";
import { installSkillCommand, promptWhenSkillStale } from "./skill";
import { type ModelNode, ModelTree } from "./tree";

type RefTarget = { file: ModelNode["file"]; ref?: string };

/**
 * Test seam: what `activate` resolves to, so an integration test running in a
 * real VS Code window can reach the loaded project and the webview host.
 */
export type OdsTestApi = {
	project: OdsProject;
	panel: DetailPanel;
	tree: ModelTree;
};

export async function activate(
	context: vscode.ExtensionContext,
): Promise<OdsTestApi> {
	const project = new OdsProject(context.extensionUri);
	const diagnostics = new OdsDiagnostics(project);
	const tree = new ModelTree(project, diagnostics);
	const pages = new DetailPanel(context.extensionUri, project, diagnostics);
	const view = vscode.window.createTreeView("odsModel", {
		treeDataProvider: tree,
		showCollapseAll: true,
	});

	context.subscriptions.push(
		project,
		diagnostics,
		tree,
		pages,
		view,
		pages.onDidOpen(({ file, ref }) => {
			const node = tree.find(file, ref);
			if (node && view.visible)
				void view.reveal(node, { select: true, focus: false });
		}),
		vscode.commands.registerCommand("ods.openPage", (target: RefTarget) => {
			if (!target?.ref) return;
			return pages.open({ file: target.file, ref: target.ref });
		}),
		vscode.commands.registerCommand("ods.refresh", () => project.reload()),
		vscode.commands.registerCommand("ods.search", () => showSearch(project)),
		vscode.commands.registerCommand(
			"ods.revealInJson",
			async (node: ModelNode) => {
				if (!node?.ref) return;
				const doc = await vscode.workspace.openTextDocument(node.file.uri);
				const range = rangeOfRef(
					{ ...node.file, text: doc.getText() },
					node.ref,
				);
				await vscode.window.showTextDocument(doc, {
					selection: range,
					preserveFocus: true,
					preview: true,
				});
			},
		),
		vscode.commands.registerCommand(
			"ods.revealRef",
			async (file: ModelNode["file"], ref: string) => {
				const target = tree.find(file, ref);
				if (target)
					await view.reveal(target, {
						select: true,
						expand: true,
						focus: true,
					});
			},
		),
		vscode.commands.registerCommand("ods.writeSchema", async () => {
			for (const folder of vscode.workspace.workspaceFolders ?? []) {
				await project.ensureSchema(odsFolderOf(folder));
			}
		}),
		vscode.commands.registerCommand("ods.installSkill", async () =>
			installSkillCommand(await pickFolder({ optional: true })),
		),
		vscode.commands.registerCommand("ods.exportSite", async () => {
			const folder = await pickFolder();
			if (!folder) return;
			// Every file of a `.ods` folder is exported as a file of that folder's
			// set (see `exportSources`), so the export of a folder is the folder.
			const inFolder = project.workspaces.filter((f) =>
				f.uri.fsPath.startsWith(folder.uri.fsPath),
			);
			const sets = new Map<string, typeof inFolder>();
			for (const f of inFolder) {
				const key = project.folderKey(f);
				sets.set(key, [...(sets.get(key) ?? []), f]);
			}
			const sources = [...sets].flatMap(([key, files]) =>
				exportSources(
					key,
					files.map((f) => ({
						relativePath: f.relativePath,
						workspace: f.workspace,
						stale: f.stale,
						error: f.error,
						diagnostics: diagnostics.byFile.get(f.uri.toString()) ?? [],
					})),
				),
			);
			if (sources.length === 0) {
				vscode.window.showErrorMessage("No ODS workspaces to export.");
				return;
			}
			const outDir = vscode.Uri.joinPath(folder.uri, "ods-site");
			const result = await vscode.window.withProgress(
				{
					location: vscode.ProgressLocation.Notification,
					title: "Exporting domain model site",
				},
				() =>
					exportSite({
						sources,
						outDir: outDir.fsPath,
						appDir: vscode.Uri.joinPath(context.extensionUri, "media", "app")
							.fsPath,
					}),
			);
			const open = "Open in Browser";
			const choice = await vscode.window.showInformationMessage(
				`Exported ${result.workspaces} workspace${result.workspaces === 1 ? "" : "s"} to ${vscode.workspace.asRelativePath(outDir)}.`,
				open,
			);
			if (choice === open)
				await vscode.env.openExternal(vscode.Uri.file(result.indexPath));
		}),
		vscode.commands.registerCommand("ods.createWorkspace", async () => {
			const folder = await pickFolder();
			if (!folder) return;
			const name = await vscode.window.showInputBox({
				prompt: "Workspace name",
				placeHolder: "Petstore",
				validateInput: (v) => (v.trim() ? undefined : "A name is required"),
			});
			if (!name) return;
			const description = await vscode.window.showInputBox({
				prompt: "What does this workspace model?",
				placeHolder: "Catalog, sales and inventory for the pet store",
			});
			if (description === undefined) return;
			const file = await project.create(
				folder,
				name.trim(),
				description.trim(),
			);
			await vscode.window.showTextDocument(file.uri);
		}),
	);

	await project.reload();
	void promptWhenSkillStale(context);

	return { project, panel: pages, tree };
}

async function pickFolder(
	options: { optional?: boolean } = {},
): Promise<vscode.WorkspaceFolder | undefined> {
	const folders = vscode.workspace.workspaceFolders ?? [];
	if (folders.length === 0) {
		if (!options.optional)
			vscode.window.showErrorMessage(
				"Open a folder before creating an ODS workspace.",
			);
		return undefined;
	}
	if (folders.length === 1) return folders[0];
	return vscode.window.showWorkspaceFolderPick({
		placeHolder: "Folder to hold the .ods directory",
	});
}

export function deactivate() {}
