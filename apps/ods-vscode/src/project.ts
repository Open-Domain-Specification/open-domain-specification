import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
	type SetDiagnostic,
	type SetPath,
	Workspace,
	type WorkspaceSchema,
} from "@open-domain-specification/core";
import * as vscode from "vscode";
import { type Assembled, assemble } from "./assemble";
import { editorFirstIo } from "./editor-io";
import { vscodeEditorHost } from "./vscode-host";
import {
	applyIntent,
	diskTextIo,
	type Intent,
	type WriteResult,
} from "./writer";

export const SCHEMA_FILE = "schema.json";

/** One JSON file in the .ods folder and what was loaded from it. */
export type WorkspaceFile = {
	uri: vscode.Uri;
	/** Path relative to the .ods folder, forward slashes; the set path of the file and the key for refs across files. */
	relativePath: string;
	/** The text the last load saw: the editor buffer when the file was open, else the disk. */
	text: string;
	/**
	 * What to DISPLAY for this file. When the file loads it is the fresh member
	 * of the folder's set. When it does not load, it is the previous load and
	 * `stale` is true. It is never an input to an edit: the writer reads fresh
	 * text of every file and does not look at this field.
	 */
	workspace?: Workspace;
	/** True when `workspace` is the last good load shown because the current text does not load. */
	stale?: boolean;
	/** Why the file could not be loaded, when it could not, with what to do about it. */
	error?: string;
	/** Character offset of the problem in `text`, when known. */
	errorOffset?: number;
};

/** The set one `.ods` folder assembles to, from the text of all of its files at the last load. */
export type FolderSet = { ods: vscode.Uri; assembled: Assembled };

export function odsFolderOf(folder: vscode.WorkspaceFolder): vscode.Uri {
	const setting = vscode.workspace
		.getConfiguration("ods", folder)
		.get<string>("folder", ".ods");
	return vscode.Uri.joinPath(folder.uri, setting);
}

/** The set path of `uri` under the `.ods` folder `ods`: relative, forward slashes. */
export function setPathOf(ods: vscode.Uri, uri: vscode.Uri): SetPath {
	return path.relative(ods.fsPath, uri.fsPath).split(path.sep).join("/");
}

/** Orders set paths by code point, so the input order of a set never depends on the machine's locale. */
const byCodePoint = (a: string, b: string): number =>
	a < b ? -1 : a > b ? 1 : 0;

/**
 * The set of workspace files across every open folder, one set per `.ods`
 * folder. The files are the artefact; the sets are rebuilt from their text on
 * every load for display, and every edit re-reads the files itself.
 */
export class OdsProject implements vscode.Disposable {
	readonly files = new Map<string, WorkspaceFile>();
	/** One set per `.ods` folder, keyed by the folder's uri, from the last load. */
	readonly sets = new Map<string, FolderSet>();
	private readonly changed = new vscode.EventEmitter<void>();
	readonly onDidChange = this.changed.event;
	private readonly disposables: vscode.Disposable[] = [];
	private reloadTimer?: NodeJS.Timeout;

	constructor(private readonly extensionUri: vscode.Uri) {
		const watcher = vscode.workspace.createFileSystemWatcher("**/*.json");
		const onFs = (uri: vscode.Uri) => this.onFileEvent(uri);
		this.disposables.push(
			watcher,
			// A file open in an editor is read from its buffer, so typing changes
			// the model before any save.
			vscode.workspace.onDidChangeTextDocument((e) => onFs(e.document.uri)),
			vscode.workspace.onDidCloseTextDocument((d) => onFs(d.uri)),
			vscode.workspace.onDidOpenTextDocument((d) => onFs(d.uri)),
			watcher.onDidChange(onFs),
			watcher.onDidCreate(onFs),
			watcher.onDidDelete(onFs),
			vscode.workspace.onDidChangeWorkspaceFolders(() => this.reload()),
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration("ods.folder")) void this.reload();
			}),
		);
	}

	get workspaces(): WorkspaceFile[] {
		return [...this.files.values()].filter((f) => f.workspace);
	}

	fileOf(workspace: Workspace): WorkspaceFile | undefined {
		return this.workspaces.find((f) => f.workspace === workspace);
	}

	/**
	 * The files of the folder `file` is in, in the order of its set (code point
	 * of the set path), every one of them: a file that does not load is listed
	 * with its error so a reader of the whole folder can say so. The reader of
	 * a set is given exactly these.
	 */
	folderFiles(file: WorkspaceFile): WorkspaceFile[] {
		const ods = this.isInOdsFolder(file.uri);
		if (!ods) return [file];
		return [...this.files.values()]
			.filter((f) => this.isInOdsFolder(f.uri)?.toString() === ods.toString())
			.sort((a, b) => byCodePoint(a.relativePath, b.relativePath));
	}

	/** The key of the `.ods` folder `file` is in: what names its set to a reader. */
	folderKey(file: WorkspaceFile): string {
		return this.isInOdsFolder(file.uri)?.toString() ?? file.uri.toString();
	}

	private isInOdsFolder(uri: vscode.Uri): vscode.Uri | undefined {
		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			const ods = odsFolderOf(folder);
			const rel = path.relative(ods.fsPath, uri.fsPath);
			if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return ods;
		}
		return undefined;
	}

	private onFileEvent(uri: vscode.Uri): void {
		if (!this.isInOdsFolder(uri)) return;
		if (path.basename(uri.fsPath) === SCHEMA_FILE) return;
		if (!uri.fsPath.endsWith(".json")) return;
		clearTimeout(this.reloadTimer);
		this.reloadTimer = setTimeout(() => void this.reload(), 150);
	}

	private reloading: Promise<void> = Promise.resolve();

	/** Loads every workspace file again; calls are serialised so two reloads never interleave. */
	reload(): Promise<void> {
		this.reloading = this.reloading.then(() => this.reloadNow());
		return this.reloading;
	}

	/** The text of a file as the person sees it: the open editor's buffer, else the disk. */
	private async readSource(uri: vscode.Uri): Promise<string> {
		const key = uri.toString();
		const open = vscode.workspace.textDocuments.find(
			(d) => !d.isClosed && d.uri.toString() === key,
		);
		return open ? open.getText() : fs.readFile(uri.fsPath, "utf8");
	}

	/**
	 * Loads every folder's files into one set per folder. The set is built from
	 * the text of all of its files at once, so a ref across files means the same
	 * thing everywhere and a Problems entry lands on the file that owns it. A
	 * file that does not load is left out of the set and shown with its own
	 * error; its previous load stays on screen, labelled stale.
	 */
	private async reloadNow(): Promise<void> {
		const seen = new Set<string>();
		const folders = new Set<string>();
		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			const ods = odsFolderOf(folder);
			folders.add(ods.toString());
			const uris = await this.listJsonFiles(ods);
			if (uris.length > 0) await this.ensureSchema(ods);
			const sources: Array<{ uri: vscode.Uri; file: SetPath; text: string }> =
				[];
			for (const uri of uris) {
				try {
					sources.push({
						uri,
						file: setPathOf(ods, uri),
						text: await this.readSource(uri),
					});
				} catch {
					// Deleted between the listing and the read: the next event reloads.
				}
			}
			const assembled = assemble(
				sources.map(({ file, text }) => ({ file, text })),
			);
			this.sets.set(ods.toString(), { ods, assembled });
			for (const { uri, file, text } of sources) {
				const key = uri.toString();
				seen.add(key);
				const entry = assembled.files.get(file);
				const fresh = entry?.workspace;
				const previous = this.files.get(key);
				const excluded = entry?.excluded;
				this.files.set(key, {
					uri,
					relativePath: file,
					text,
					workspace: fresh ?? previous?.workspace,
					stale: fresh ? undefined : previous?.workspace ? true : undefined,
					// A path the set cannot take is reported by `file-path-invalid` itself.
					error:
						excluded && excluded.cause !== "path"
							? excluded.message
							: undefined,
					errorOffset: excluded?.offset,
				});
			}
		}
		for (const key of this.files.keys())
			if (!seen.has(key)) this.files.delete(key);
		for (const key of this.sets.keys())
			if (!folders.has(key)) this.sets.delete(key);
		this.changed.fire();
	}

	/** The set diagnostics about one file, as of the last load. Empty for a file that is not in its set. */
	diagnosticsOf(file: WorkspaceFile): SetDiagnostic[] {
		const ods = this.isInOdsFolder(file.uri);
		const set = ods ? this.sets.get(ods.toString()) : undefined;
		return set?.assembled.diagnostics.get(file.relativePath) ?? [];
	}

	/** Set when a rule threw during the last load of the folder holding `file`; shown, never swallowed. */
	validationErrorOf(file: WorkspaceFile): string | undefined {
		const ods = this.isInOdsFolder(file.uri);
		return ods
			? this.sets.get(ods.toString())?.assembled.validationError
			: undefined;
	}

	/**
	 * Applies one form intent to the file that owns it, under the `.ods` folder
	 * `ods`. The file list and every file's text are read now, from the editor
	 * when open; nothing from the last load is consulted (see
	 * {@link WorkspaceFile.workspace}). Only the owning file changes.
	 */
	async applyIntent(ods: vscode.Uri, intent: Intent): Promise<WriteResult> {
		const files = (await this.listJsonFiles(ods)).map((uri) =>
			setPathOf(ods, uri),
		);
		const io = editorFirstIo(diskTextIo(ods.fsPath), vscodeEditorHost(ods));
		const result = await applyIntent(io, files, intent);
		if (result.ok) void this.reload();
		return result;
	}

	private async listJsonFiles(ods: vscode.Uri): Promise<vscode.Uri[]> {
		const out: vscode.Uri[] = [];
		const walk = async (dir: vscode.Uri) => {
			let entries: [string, vscode.FileType][];
			try {
				entries = await vscode.workspace.fs.readDirectory(dir);
			} catch {
				return;
			}
			for (const [name, type] of entries) {
				const child = vscode.Uri.joinPath(dir, name);
				if (type === vscode.FileType.Directory) await walk(child);
				else if (name.endsWith(".json") && name !== SCHEMA_FILE)
					out.push(child);
			}
		};
		await walk(ods);
		return out.sort((a, b) =>
			byCodePoint(setPathOf(ods, a), setPathOf(ods, b)),
		);
	}

	/** Serialises the in-memory workspace and writes it atomically, with $schema pointing at the sibling schema.json. Used for a workspace that was just created; edits go through {@link applyIntent}. */
	async dump(file: WorkspaceFile): Promise<void> {
		if (!file.workspace) return;
		const ods = this.isInOdsFolder(file.uri);
		const schemaRel = ods
			? path
					.relative(
						path.dirname(file.uri.fsPath),
						path.join(ods.fsPath, SCHEMA_FILE),
					)
					.split(path.sep)
					.join("/")
			: SCHEMA_FILE;
		const schema: WorkspaceSchema = {
			$schema: schemaRel.startsWith(".") ? schemaRel : `./${schemaRel}`,
			...file.workspace.toSchema(),
		};
		const text = `${JSON.stringify(schema, null, 2)}\n`;
		await this.writeOwn(file.uri, text);
		file.text = text;
		if (ods) await this.ensureSchema(ods);
		this.changed.fire();
	}

	private async writeOwn(uri: vscode.Uri, text: string): Promise<void> {
		const tmp = `${uri.fsPath}.${process.pid}.tmp`;
		await fs.mkdir(path.dirname(uri.fsPath), { recursive: true });
		await fs.writeFile(tmp, text, "utf8");
		await fs.rename(tmp, uri.fsPath);
	}

	/** Copies the core-generated JSON schema into the .ods folder when missing or stale. */
	async ensureSchema(ods: vscode.Uri): Promise<void> {
		const source = vscode.Uri.joinPath(this.extensionUri, SCHEMA_FILE);
		const target = vscode.Uri.joinPath(ods, SCHEMA_FILE);
		const text = await fs.readFile(source.fsPath, "utf8");
		let current: string | undefined;
		try {
			current = await fs.readFile(target.fsPath, "utf8");
		} catch {
			current = undefined;
		}
		if (current !== text) await this.writeOwn(target, text);
	}

	/** Creates a new workspace file in the folder's .ods directory and returns it. */
	async create(
		folder: vscode.WorkspaceFolder,
		name: string,
		description: string,
	): Promise<WorkspaceFile> {
		const workspace = new Workspace(name, {
			description,
			version: "0.1.0",
		});
		const ods = odsFolderOf(folder);
		const uri = vscode.Uri.joinPath(ods, `${workspace.id}.json`);
		const file: WorkspaceFile = {
			uri,
			relativePath: `${workspace.id}.json`,
			text: "",
			workspace,
		};
		this.files.set(uri.toString(), file);
		await this.dump(file);
		return file;
	}

	dispose(): void {
		clearTimeout(this.reloadTimer);
		for (const d of this.disposables) d.dispose();
		this.changed.dispose();
	}
}
