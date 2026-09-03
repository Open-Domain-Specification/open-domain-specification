import { homedir } from "node:os";
import {
	installSkill,
	isInstalled,
	rulesSnippet,
	SKILL_NAME,
	SKILL_VERSION,
	type SkillTarget,
	skillDir,
	TARGETS,
} from "@open-domain-specification/skill";
import * as vscode from "vscode";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

async function readText(uri: vscode.Uri): Promise<string | undefined> {
	try {
		return decoder.decode(await vscode.workspace.fs.readFile(uri));
	} catch {
		return undefined;
	}
}

async function writeText(uri: vscode.Uri, content: string): Promise<void> {
	await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(uri, ".."));
	await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
}

type TargetPick = vscode.QuickPickItem & { target: SkillTarget };

/** Writes the skill bundle for each chosen target under `root`. */
async function installInto(
	root: vscode.Uri,
	targets: SkillTarget[],
): Promise<string[]> {
	const written: string[] = [];
	for (const target of targets) {
		const paths = await installSkill({
			root: root.fsPath,
			target,
			write: (path, content) => writeText(vscode.Uri.file(path), content),
		});
		written.push(...paths);
	}
	return written;
}

/** Appends the pointer paragraph to a rules file, creating AGENTS.md if none exists. */
async function addRulesPointer(
	root: vscode.Uri,
	target: SkillTarget,
): Promise<vscode.Uri | undefined> {
	const candidates = ["AGENTS.md", ".github/copilot-instructions.md"].map((f) =>
		vscode.Uri.joinPath(root, f),
	);
	const existing: Array<{ uri: vscode.Uri; text: string }> = [];
	for (const uri of candidates) {
		const text = await readText(uri);
		if (text !== undefined) existing.push({ uri, text });
	}
	const snippet = rulesSnippet(target);
	if (existing.length === 0) {
		const uri = candidates[0];
		await writeText(uri, `# Agent instructions\n\n${snippet}`);
		return uri;
	}
	for (const { uri, text } of existing) {
		if (text.includes(`${skillDir(target)}/SKILL.md`)) continue;
		await writeText(uri, `${text.trimEnd()}\n\n${snippet}`);
		return uri;
	}
	return undefined;
}

/** The `ODS: Install AI Skill` command. */
export async function installSkillCommand(
	folder: vscode.WorkspaceFolder | undefined,
): Promise<void> {
	const picks = await vscode.window.showQuickPick<TargetPick>(
		TARGETS.map((t) => ({
			label: t.label,
			description: `${t.dir}/${SKILL_NAME}`,
			target: t.id,
			picked: t.id === "claude",
		})),
		{
			canPickMany: true,
			title: "Install the ODS authoring skill for which agents?",
		},
	);
	if (!picks || picks.length === 0) return;
	const targets = picks.map((p) => p.target);

	const scope = await vscode.window.showQuickPick(
		[
			{
				label: "This project",
				description: folder ? folder.uri.fsPath : "no folder open",
				scope: "project" as const,
			},
			{
				label: "My user folder",
				description: homedir(),
				scope: "user" as const,
			},
		].filter((s) => s.scope === "user" || folder),
		{ title: "Where should the skill be installed?" },
	);
	if (!scope) return;
	const root =
		scope.scope === "project" && folder
			? folder.uri
			: vscode.Uri.file(homedir());

	const written = await installInto(root, targets);

	let pointer: vscode.Uri | undefined;
	if (scope.scope === "project") {
		const answer = await vscode.window.showQuickPick(
			[
				{
					label: "Yes",
					description:
						"Append a pointer to AGENTS.md or .github/copilot-instructions.md",
					add: true,
				},
				{ label: "No", add: false },
			],
			{ title: "Point other agents (Cursor, Copilot) at the skill?" },
		);
		if (answer?.add) pointer = await addRulesPointer(root, targets[0]);
	}

	const summary = `Installed the ODS authoring skill (${SKILL_VERSION}): ${written.length} files under ${targets
		.map(skillDir)
		.join(
			", ",
		)}${pointer ? `; pointer added to ${vscode.workspace.asRelativePath(pointer)}` : ""}.`;
	const open = await vscode.window.showInformationMessage(
		summary,
		"Open SKILL.md",
	);
	if (open) {
		const skill = vscode.Uri.joinPath(root, skillDir(targets[0]), "SKILL.md");
		await vscode.window.showTextDocument(skill);
	}
}

const STALE_PROMPT_KEY = "ods.skill.stalePromptedFor";

/**
 * Offers an update once per skill version when a project has installed the
 * skill and the extension carries a newer one.
 */
export async function promptWhenSkillStale(
	context: vscode.ExtensionContext,
): Promise<void> {
	if (context.workspaceState.get<string>(STALE_PROMPT_KEY) === SKILL_VERSION)
		return;
	for (const folder of vscode.workspace.workspaceFolders ?? []) {
		const stale: SkillTarget[] = [];
		for (const t of TARGETS) {
			const state = await isInstalled(folder.uri.fsPath, t.id, (path) =>
				readText(vscode.Uri.file(path)),
			);
			if (state === "stale") stale.push(t.id);
		}
		if (stale.length === 0) continue;
		await context.workspaceState.update(STALE_PROMPT_KEY, SKILL_VERSION);
		const choice = await vscode.window.showInformationMessage(
			`The ODS authoring skill in ${folder.name} is older than the one this extension carries (${SKILL_VERSION}).`,
			"Update",
		);
		if (choice === "Update") {
			const written = await installInto(folder.uri, stale);
			vscode.window.showInformationMessage(
				`Updated the ODS authoring skill: ${written.length} files.`,
			);
		}
		return;
	}
}
