import * as path from "node:path";
import {
	type BoundedContext,
	relationshipTitle,
	type SetPath,
	type WorkspaceSet,
} from "@open-domain-specification/core";
import * as vscode from "vscode";
import { jsonPathOfRef, valueAtPath } from "../locate";
import { type OdsProject, odsFolderOf, type WorkspaceFile } from "../project";
import { ModelNode, targetOfNode } from "../tree";
import { addFamiliesUnder, familyById, familyOfRef } from "./families";
import type { FamilyId } from "./form-protocol";
import { FormPanel } from "./panel";
import type { AuthoringPort, FormRequest } from "./session";

/**
 * The two commands, `ods.add` and `ods.update`, and what answers them. Both
 * are in the command palette and on the tree's context menus; neither asks a
 * field question, they only choose WHAT to author (the folder when there is
 * more than one, the element or parent, the family) and open the form for it.
 * A tree call passes the row; a programmatic call passes a `FormRequest`.
 */

export type AuthoringApi = {
	/** Opens the form for `request` in the `.ods` folder `ods` (the only one when omitted). */
	open(request: FormRequest, ods?: vscode.Uri): Promise<FormPanel | undefined>;
	/** The forms open now. */
	readonly panels: ReadonlyArray<FormPanel>;
};

type Plain = { [key: string]: unknown };
type Named = { ref: string; name: string; id?: string };

/** One element a form can be about, with the file that holds it. */
export type Target = {
	file: SetPath;
	ref: string;
	family: FamilyId;
	label: string;
	/** Where it sits, outermost first. */
	trail: string[];
	/** Entity relation only: the row of the owner's `relations`. */
	row?: number;
};

function plainOf(value: unknown): Plain | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Plain)
		: undefined;
}

/** Every element of the fresh set a form could be about, in file order then document order. */
export function* targetsOf(
	set: WorkspaceSet,
	members: ReadonlyArray<SetPath>,
): Iterable<Target> {
	for (const file of members) {
		const ws = set.byPath(file);
		if (!ws) continue;
		const canonical = set.toSchemas().get(file);
		const at = (family: FamilyId, it: Named, trail: string[]): Target => ({
			file,
			ref: it.ref,
			family,
			label: it.name || it.id || it.ref,
			trail,
		});
		/** The rows of an entity's or value object's `relations`, read from the file's own JSON. */
		const rows = function* (it: Named, trail: string[]): Iterable<Target> {
			const path = canonical && jsonPathOfRef(canonical, it.ref);
			const node = path && plainOf(valueAtPath(canonical, path));
			const relations = Array.isArray(node?.relations) ? node.relations : [];
			for (const [row, raw] of relations.entries()) {
				const r = plainOf(raw);
				const to = plainOf(r?.target)?.$ref;
				yield {
					file,
					ref: it.ref,
					family: "entityRelation",
					label: String(
						r?.label ??
							`${it.name} ${r?.relation ?? "relates to"} ${to ?? "?"}`,
					),
					trail: [...trail, it.name],
					row,
				};
			}
		};
		const attributes = function* (
			owner: Named & { attributes: Map<string, Named> },
			trail: string[],
		): Iterable<Target> {
			for (const a of owner.attributes.values())
				yield at("attribute", a, [...trail, owner.name]);
		};
		const context = function* (bc: BoundedContext): Iterable<Target> {
			const into = [bc.name];
			for (const v of bc.valueobjects.values()) {
				yield at("valueObject", v, into);
				yield* attributes(v, into);
				yield* rows(v, into);
			}
			for (const i of bc.invariants.values()) yield at("invariant", i, into);
			for (const a of bc.aggregates.values()) {
				const inA = [...into, a.name];
				yield at("aggregate", a, into);
				for (const e of a.entities.values()) {
					yield at("entity", e, inA);
					yield* attributes(e, inA);
					yield* rows(e, inA);
				}
				for (const i of a.invariants.values()) yield at("invariant", i, inA);
				for (const c of a.consumables.values()) yield at("consumable", c, inA);
				for (const c of a.consumptions)
					yield at(
						"consumption",
						{ ref: c.ref, name: `takes ${c.consumable.name}` },
						inA,
					);
			}
			for (const s of bc.services.values()) {
				const inS = [...into, s.name];
				yield at("service", s, into);
				for (const c of s.consumables.values()) yield at("consumable", c, inS);
				for (const c of s.consumptions)
					yield at(
						"consumption",
						{ ref: c.ref, name: `takes ${c.consumable.name}` },
						inS,
					);
			}
			for (const p of bc.policies.values()) yield at("policy", p, into);
			for (const p of bc.processes.values()) {
				yield at("process", p, into);
				for (const d of p.deadlines.values())
					yield at("deadline", d, [...into, p.name]);
			}
			for (const sc of bc.schemas.values()) {
				yield at("schema", sc, into);
				yield* attributes(sc, into);
			}
			for (const t of bc.glossary.values()) yield at("term", t, into);
		};

		yield at("workspace", { ref: "#", name: ws.name, id: ws.id }, []);
		for (const t of ws.teams.values()) yield at("team", t, []);
		for (const r of ws.relationships)
			yield at("relationship", { ref: r.ref, name: relationshipTitle(r) }, []);
		for (const d of ws.domains.values()) {
			yield at("domain", d, []);
			for (const s of d.subdomains.values()) yield at("subdomain", s, [d.name]);
		}
		for (const bc of ws.boundedcontexts.values()) {
			yield at("context", bc, []);
			yield* context(bc);
		}
	}
}

/** The `.ods` folders of the open workspace folders. */
const odsFolders = (): vscode.Uri[] =>
	(vscode.workspace.workspaceFolders ?? []).map(odsFolderOf);

/** The `.ods` folder a file of the project is in. */
function odsOf(file: WorkspaceFile): vscode.Uri | undefined {
	return odsFolders().find((ods) => {
		const rel = path.relative(ods.fsPath, file.uri.fsPath);
		return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
	});
}

const requestOf = (
	mode: "add" | "update",
	target: Target,
	family: FamilyId,
): FormRequest =>
	mode === "add"
		? { kind: "add", file: target.file, parentRef: target.ref, family }
		: {
				kind: "update",
				file: target.file,
				ref: target.ref,
				family,
				...(target.row !== undefined ? { row: target.row } : {}),
			};

const isRequest = (arg: unknown): arg is FormRequest =>
	typeof arg === "object" &&
	arg !== null &&
	((arg as FormRequest).kind === "add" ||
		(arg as FormRequest).kind === "update") &&
	typeof (arg as FormRequest).family === "string" &&
	typeof (arg as FormRequest).file === "string";

export function registerAuthoring(
	context: vscode.ExtensionContext,
	project: OdsProject,
): AuthoringApi {
	const panels: FormPanel[] = [];

	const portFor = (ods: vscode.Uri): AuthoringPort => ({
		readFresh: () => project.readFresh(ods),
		applyIntent: (intent) => project.applyIntent(ods, intent),
	});

	const open = async (
		request: FormRequest,
		ods?: vscode.Uri,
	): Promise<FormPanel | undefined> => {
		const folder = ods ?? (await pickFolder());
		if (!folder) return undefined;
		const panel = await FormPanel.open(
			context.extensionUri,
			portFor(folder),
			request,
		);
		if (!panel) return undefined;
		panels.push(panel);
		panel.onDidDispose(() => {
			const at = panels.indexOf(panel);
			if (at >= 0) panels.splice(at, 1);
		});
		return panel;
	};

	/** The `.ods` folder to work in: the only one with files, else the person's pick. */
	const pickFolder = async (): Promise<vscode.Uri | undefined> => {
		const loaded = odsFolders().filter((ods) =>
			project.workspaces.some((f) => odsOf(f)?.toString() === ods.toString()),
		);
		if (loaded.length === 0) {
			void vscode.window.showErrorMessage(
				"There is no workspace file to author in. Run ODS: Create Workspace, or fix the files listed in the Problems panel.",
			);
			return undefined;
		}
		if (loaded.length === 1) return loaded[0];
		const picked = await vscode.window.showQuickPick(
			loaded.map((ods) => ({
				label: path.basename(path.dirname(ods.fsPath)),
				description: ods.fsPath,
				ods,
			})),
			{ title: "Which .ods folder?", placeHolder: "Choose the folder to edit" },
		);
		return picked?.ods;
	};

	const pickFamily = async (
		mode: "add" | "update",
		families: FamilyId[],
	): Promise<FamilyId | undefined> => {
		if (families.length === 1) return families[0];
		const picked = await vscode.window.showQuickPick(
			families.map((id) => ({ label: familyById(id).label, id })),
			{
				title: mode === "add" ? "What do you want to add?" : "What kind?",
				placeHolder: "Choose a kind of element",
			},
		);
		return picked?.id;
	};

	/** The palette: the folder, then the element (a parent for add), then the family when it is not decided yet. */
	const fromPalette = async (mode: "add" | "update"): Promise<void> => {
		const ods = await pickFolder();
		if (!ods) return;
		let fresh: Awaited<ReturnType<OdsProject["readFresh"]>>;
		try {
			fresh = await project.readFresh(ods);
		} catch (e) {
			void vscode.window.showErrorMessage(
				`The model could not be read: ${e instanceof Error ? e.message : String(e)} Check the .ods folder and try again.`,
			);
			return;
		}
		const wanted = (t: Target) =>
			mode === "add"
				? addFamiliesUnder(t.ref).length > 0 && t.family !== "entityRelation"
				: familyById(t.family)?.update !== undefined;
		const items = [...targetsOf(fresh.set, fresh.members)]
			.filter(wanted)
			.map((target) => ({
				label: target.label,
				description: `${familyById(target.family).label}${target.row !== undefined ? ` ${target.row + 1}` : ""}`,
				// The file is always part of the answer: two files may each have a `ledger`.
				detail: [target.file, ...target.trail].join(" › "),
				target,
			}));
		if (items.length === 0) {
			void vscode.window.showInformationMessage(
				mode === "add"
					? "Nothing here can hold a new element yet."
					: "There is nothing to edit yet.",
			);
			return;
		}
		const picked = await vscode.window.showQuickPick(items, {
			title:
				mode === "add" ? "Add under which element?" : "Edit which element?",
			placeHolder: "Type to filter by name, kind or file",
			matchOnDescription: true,
			matchOnDetail: true,
		});
		if (!picked) return;
		const { target } = picked;
		const family = await pickFamily(
			mode,
			mode === "add" ? addFamiliesUnder(target.ref) : [target.family],
		);
		if (!family) return;
		await open(requestOf(mode, target, family), ods);
	};

	/** A tree row: the element or the group's parent is already decided; only a family may be asked. */
	const fromNode = async (
		mode: "add" | "update",
		node: ModelNode,
	): Promise<void> => {
		const target = targetOfNode(node, mode);
		const ods = odsOf(node.file);
		if (!target || !ods) {
			void vscode.window.showInformationMessage(
				mode === "add"
					? "Nothing can be added here."
					: "This row cannot be edited here.",
			);
			return;
		}
		const family = await pickFamily(
			mode,
			mode === "add" ? target.families : [target.family as FamilyId],
		);
		if (!family) return;
		await open(
			mode === "add"
				? {
						kind: "add",
						file: target.file,
						parentRef: target.ref,
						family,
					}
				: {
						kind: "update",
						file: target.file,
						ref: target.ref,
						family: target.family ?? (familyOfRef(target.ref) as FamilyId),
					},
			ods,
		);
	};

	const command = (mode: "add" | "update") => async (arg?: unknown) => {
		if (isRequest(arg)) {
			await open(arg);
			return;
		}
		if (arg instanceof ModelNode) {
			await fromNode(mode, arg);
			return;
		}
		await fromPalette(mode);
	};

	context.subscriptions.push(
		vscode.commands.registerCommand("ods.add", command("add")),
		vscode.commands.registerCommand("ods.update", command("update")),
		{
			dispose: () => {
				for (const p of [...panels]) p.dispose();
			},
		},
	);

	return { open, panels };
}
