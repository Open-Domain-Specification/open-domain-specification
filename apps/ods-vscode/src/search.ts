import type { Workspace } from "@open-domain-specification/core";
import {
	HEALTH_REF,
	ICONS,
	relationshipTitle,
} from "@open-domain-specification/pages";
import * as vscode from "vscode";
import type { OdsProject, WorkspaceFile } from "./project";

type Hit = vscode.QuickPickItem & { file: WorkspaceFile; ref: string };

const kindLabel: Record<keyof typeof ICONS, string> = {
	workspace: "Workspace",
	domain: "Domain",
	subdomain: "Subdomain",
	boundedcontext: "Bounded Context",
	aggregate: "Aggregate",
	service: "Service",
	entity: "Entity",
	valueobject: "Value Object",
	invariant: "Invariant",
	event: "Event",
	command: "Operation",
	policy: "Policy",
	process: "Process",
	deadline: "Deadline",
	term: "Glossary Term",
	team: "Team",
	consumable: "Consumable",
	schema: "Schema",
	consumption: "Consumption",
	relationship: "Relationship",
};

function hit(
	file: WorkspaceFile,
	kind: keyof typeof ICONS,
	el: { ref: string; name: string; id: string; description?: string },
	trail: string[],
	extra?: string,
): Hit {
	return {
		file,
		ref: el.ref,
		label: `$(${ICONS[kind]}) ${el.name}`,
		description: [kindLabel[kind], extra, el.id].filter(Boolean).join(" · "),
		detail: [file.workspace?.name, ...trail].join(" › "),
	};
}

/** Every element with a page, flattened for the quick pick. */
export function* searchIndex(file: WorkspaceFile): Iterable<Hit> {
	const ws = file.workspace as Workspace;
	yield {
		file,
		ref: "#",
		label: `$(${ICONS.workspace}) ${ws.name}`,
		description: `Workspace · ${file.relativePath}`,
		detail: ws.description,
	};
	// The health report is a read of the whole workspace, so it has a route but no element.
	yield {
		file,
		ref: HEALTH_REF,
		label: "$(pulse) Health",
		description: `Report · ${ws.name}`,
		detail:
			"Relationships marked for refactoring, tolerated compromises, and intents with no comments",
	};
	for (const t of ws.teams.values()) yield hit(file, "team", t, []);
	// A relationship has no name or id of its own; it is named by its two ends.
	for (const r of ws.relationships)
		yield {
			file,
			ref: r.ref,
			label: `$(${ICONS.relationship}) ${relationshipTitle(r)}`,
			description: `${kindLabel.relationship} · ${r.type}`,
			detail: r.description,
		};
	for (const d of ws.domains.values()) {
		yield hit(file, "domain", d, []);
		for (const s of d.subdomains.values())
			yield hit(file, "subdomain", s, [d.name], s.type);
	}
	for (const bc of ws.boundedcontexts.values()) {
		yield hit(file, "boundedcontext", bc, []);
		// A value object belongs to the context, not to one of its aggregates.
		for (const v of bc.valueobjects.values())
			yield hit(file, "valueobject", v, [bc.name]);
		// So does a rule no one aggregate can keep (decision 27).
		for (const i of bc.invariants.values())
			yield hit(file, "invariant", i, [bc.name], "across aggregates");
		for (const a of bc.aggregates.values()) {
			const trail = [bc.name, a.name];
			yield hit(file, "aggregate", a, [bc.name]);
			for (const e of a.entities.values())
				yield hit(file, "entity", e, trail, e.root ? "root" : undefined);
			for (const i of a.invariants.values())
				yield hit(file, "invariant", i, trail);
			for (const c of a.consumables.values())
				yield hit(
					file,
					c.type === "event" ? "event" : "command",
					c,
					trail,
					c.internal ? "internal" : undefined,
				);
		}
		for (const s of bc.services.values()) {
			yield hit(file, "service", s, [bc.name], s.type);
			for (const c of s.consumables.values())
				yield hit(
					file,
					c.type === "event" ? "event" : "command",
					c,
					[bc.name, s.name],
					c.internal ? "internal" : undefined,
				);
		}
		for (const p of bc.policies.values())
			yield hit(file, "policy", p, [bc.name]);
		for (const p of bc.processes.values())
			yield hit(file, "process", p, [bc.name]);
		for (const sc of bc.schemas.values())
			yield hit(file, "schema", sc, [bc.name]);
		for (const t of bc.glossary.values())
			yield { ...hit(file, "term", t, [bc.name]), detail: t.definition };
	}
}

/** Spotlight-style search across every loaded workspace; picking a hit opens its page. */
export async function showSearch(project: OdsProject): Promise<void> {
	const items = project.workspaces.flatMap((f) => [...searchIndex(f)]);
	const pick = vscode.window.createQuickPick<Hit>();
	pick.title = "Domain model";
	pick.placeholder =
		"Search domains, contexts, aggregates, entities, events, operations, schemas, terms…";
	pick.matchOnDescription = true;
	pick.matchOnDetail = true;
	pick.items = items;
	pick.onDidAccept(() => {
		const [chosen] = pick.selectedItems;
		pick.hide();
		if (chosen)
			void vscode.commands.executeCommand("ods.openPage", {
				file: chosen.file,
				ref: chosen.ref,
			});
	});
	pick.onDidHide(() => pick.dispose());
	pick.show();
}
