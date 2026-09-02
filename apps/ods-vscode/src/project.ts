import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import * as path from "node:path";
import {
	Workspace,
	type WorkspaceSchema,
} from "@open-domain-specification/core";
import * as vscode from "vscode";

export const SCHEMA_FILE = "schema.json";

/** One JSON file in the .ods folder and what was loaded from it. */
export type WorkspaceFile = {
	uri: vscode.Uri;
	/** Path relative to the .ods folder, forward slashes; the key for refs across files. */
	relativePath: string;
	text: string;
	workspace?: Workspace;
	/** Why the file could not be loaded, when it could not. */
	error?: string;
};

export function odsFolderOf(folder: vscode.WorkspaceFolder): vscode.Uri {
	const setting = vscode.workspace
		.getConfiguration("ods", folder)
		.get<string>("folder", ".ods");
	return vscode.Uri.joinPath(folder.uri, setting);
}

function hash(text: string): string {
	return createHash("sha1").update(text).digest("hex");
}

/**
 * The set of workspace files across every open folder. Holds the in-memory
 * workspaces, which are the only mutation path; the files are the artefact.
 */
export class OdsProject implements vscode.Disposable {
	readonly files = new Map<string, WorkspaceFile>();
	private readonly changed = new vscode.EventEmitter<void>();
	readonly onDidChange = this.changed.event;
	/** Hashes of content this extension wrote, so its own dumps do not trigger reloads. */
	private readonly ownWrites = new Map<string, string>();
	private readonly disposables: vscode.Disposable[] = [];
	private reloadTimer?: NodeJS.Timeout;

	constructor(private readonly extensionUri: vscode.Uri) {
		const watcher = vscode.workspace.createFileSystemWatcher("**/*.json");
		const onFs = (uri: vscode.Uri) => this.onFileEvent(uri);
		this.disposables.push(
			watcher,
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
		clearTimeout(this.reloadTimer);
		this.reloadTimer = setTimeout(() => void this.reload(), 150);
	}

	private reloading: Promise<void> = Promise.resolve();

	/** Loads every workspace file again; calls are serialised so two reloads never interleave. */
	reload(): Promise<void> {
		this.reloading = this.reloading.then(() => this.reloadNow());
		return this.reloading;
	}

	private async reloadNow(): Promise<void> {
		const seen = new Set<string>();
		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			const ods = odsFolderOf(folder);
			const uris = await this.listJsonFiles(ods);
			if (uris.length > 0) await this.ensureSchema(ods);
			for (const uri of uris) {
				const key = uri.toString();
				seen.add(key);
				const text = await fs.readFile(uri.fsPath, "utf8");
				const previous = this.files.get(key);
				// A file whose content is exactly what this extension last wrote needs no reload; the guard is consumed once.
				if (previous && this.ownWrites.get(key) === hash(text)) {
					this.ownWrites.delete(key);
					continue;
				}
				const loaded = this.load(text);
				this.files.set(key, {
					uri,
					relativePath: path
						.relative(ods.fsPath, uri.fsPath)
						.split(path.sep)
						.join("/"),
					text,
					// A file that no longer parses keeps its last good instance so the tree stays usable.
					workspace: loaded.workspace ?? previous?.workspace,
					error: loaded.error,
				});
			}
		}
		for (const key of this.files.keys())
			if (!seen.has(key)) this.files.delete(key);
		this.changed.fire();
	}

	private load(text: string): Pick<WorkspaceFile, "workspace" | "error"> {
		try {
			const schema = JSON.parse(text) as WorkspaceSchema;
			return { workspace: Workspace.fromSchema(schema) };
		} catch (e) {
			return { error: e instanceof Error ? e.message : String(e) };
		}
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
		return out.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
	}

	/** Serialises the in-memory workspace and writes it atomically, with $schema pointing at the sibling schema.json. */
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
		this.ownWrites.set(uri.toString(), hash(text));
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
			odsVersion: "1.0.0",
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
