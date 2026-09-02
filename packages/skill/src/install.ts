import { BUNDLE, SKILL_VERSION } from "./bundle.generated";
import { SKILL_NAME, type SkillTarget, skillDir } from "./targets";

export type SkillFile = { path: string; content: string };

const STAMP = /<!-- ods-skill-version: ([^\s]+) -->/;

function stamp(content: string): string {
	return `${content.trimEnd()}\n\n<!-- ods-skill-version: ${SKILL_VERSION} -->\n`;
}

/** Every file of the skill bundle, paths relative to the skill folder. */
export function skillFiles(): SkillFile[] {
	return BUNDLE.map((f) =>
		f.path === "SKILL.md" ? { ...f, content: stamp(f.content) } : { ...f },
	);
}

export type InstallOptions = {
	/** The project or home folder the skill is installed into. */
	root: string;
	target: SkillTarget;
	/** Writes one file; receives an absolute-ish path built from `root`. */
	write: (path: string, content: string) => Promise<void>;
	/** Override the files to install; defaults to the bundle. */
	files?: SkillFile[];
};

/** Writes the bundle into `<root>/<target skills dir>/ods-authoring/` and returns the paths written. */
export async function installSkill(options: InstallOptions): Promise<string[]> {
	const base = `${options.root}/${skillDir(options.target)}`;
	const written: string[] = [];
	for (const file of options.files ?? skillFiles()) {
		const path = `${base}/${file.path}`;
		await options.write(path, file.content);
		written.push(path);
	}
	return written;
}

export type InstallState = "missing" | "stale" | "current";

/** Compares the version stamp of an installed SKILL.md with this package's. */
export async function isInstalled(
	root: string,
	target: SkillTarget,
	read: (path: string) => Promise<string | undefined>,
): Promise<InstallState> {
	const content = await read(`${root}/${skillDir(target)}/SKILL.md`);
	if (content === undefined) return "missing";
	return STAMP.exec(content)?.[1] === SKILL_VERSION ? "current" : "stale";
}

/** A paragraph for AGENTS.md or copilot-instructions.md pointing agents at the installed skill. */
export function rulesSnippet(target: SkillTarget = "agents"): string {
	return [
		"## Domain model (Open Domain Specification)",
		"",
		`This project keeps its domain model as an Open Domain Specification workspace. Before creating or editing anything under \`.ods/\` or a TypeScript file that builds a \`Workspace\` from \`@open-domain-specification/core\`, read \`${skillDir(target)}/SKILL.md\` and follow it: detect whether the model is authored as JSON or via the TypeScript DSL, interview the user in plain language before modelling, and validate after every change.`,
		"",
	].join("\n");
}

export { SKILL_NAME, SKILL_VERSION };
