/** Where each agent looks for skills, relative to a project or home folder. */
export type SkillTarget = "claude" | "agents" | "codex";

/** The folder name of the skill under every `skills/` directory. */
export const SKILL_NAME = "ods-authoring";

export const TARGETS: ReadonlyArray<{
	id: SkillTarget;
	label: string;
	/** The skills directory, relative to the root the skill is installed into. */
	dir: string;
}> = [
	{ id: "claude", label: "Claude Code", dir: ".claude/skills" },
	{ id: "agents", label: "Agent Skills (.agents)", dir: ".agents/skills" },
	{ id: "codex", label: "OpenAI Codex (.codex)", dir: ".codex/skills" },
];

export const TARGET_DIRS: Record<SkillTarget, string> = Object.fromEntries(
	TARGETS.map((t) => [t.id, t.dir]),
) as Record<SkillTarget, string>;

/** The directory the skill lands in for a target, relative to `root`. */
export function skillDir(target: SkillTarget): string {
	return `${TARGET_DIRS[target]}/${SKILL_NAME}`;
}
