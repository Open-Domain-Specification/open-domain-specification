import { describe, expect, it } from "vitest";
import {
	installSkill,
	isInstalled,
	rulesSnippet,
	SKILL_VERSION,
	skillFiles,
} from "./install";
import { SKILL_NAME, skillDir, TARGETS } from "./targets";

describe("skillFiles", () => {
	it("contains the skill entry point, references and examples", () => {
		const paths = skillFiles().map((f) => f.path);
		expect(paths).toContain("SKILL.md");
		expect(paths).toContain("references/model-reference.md");
		expect(paths).toContain("references/validation-rules.md");
		expect(paths).toContain("examples/minimal.ods.json");
	});

	it("stamps SKILL.md with the package version", () => {
		const skill = skillFiles().find((f) => f.path === "SKILL.md")!;
		expect(skill.content).toContain(
			`<!-- ods-skill-version: ${SKILL_VERSION} -->`,
		);
	});
});

describe("installSkill", () => {
	it.each(TARGETS.map((t) => t.id))(
		"writes under %s's skills folder",
		async (target) => {
			const written = new Map<string, string>();
			const paths = await installSkill({
				root: "/proj",
				target,
				write: async (p, c) => {
					written.set(p, c);
				},
			});
			expect(
				paths.every((p) => p.startsWith(`/proj/${skillDir(target)}/`)),
			).toBe(true);
			expect(written.has(`/proj/${skillDir(target)}/SKILL.md`)).toBe(true);
			expect(skillDir(target).endsWith(`/skills/${SKILL_NAME}`)).toBe(true);
		},
	);
});

describe("isInstalled", () => {
	const at = (content?: string) => async () => content;

	it("is missing without a SKILL.md", async () => {
		expect(await isInstalled("/p", "claude", at(undefined))).toBe("missing");
	});

	it("is stale when the stamp differs", async () => {
		expect(
			await isInstalled(
				"/p",
				"claude",
				at("x\n<!-- ods-skill-version: 0.0.0 -->\n"),
			),
		).toBe("stale");
	});

	it("is current after installing", async () => {
		const files = new Map<string, string>();
		await installSkill({
			root: "/p",
			target: "codex",
			write: async (p, c) => {
				files.set(p, c);
			},
		});
		expect(await isInstalled("/p", "codex", async (p) => files.get(p))).toBe(
			"current",
		);
	});
});

describe("rulesSnippet", () => {
	it("points at the installed SKILL.md for the target", () => {
		expect(rulesSnippet("claude")).toContain(
			".claude/skills/ods-authoring/SKILL.md",
		);
		expect(rulesSnippet()).toContain(".agents/skills/ods-authoring/SKILL.md");
	});
});
