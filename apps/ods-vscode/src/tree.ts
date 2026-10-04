import {
	type Aggregate,
	type BoundedContext,
	type Consumable,
	type Domain,
	relationshipTitle,
	type Service,
	type Subdomain,
	type Workspace,
	workspaceOf,
} from "@open-domain-specification/core";
import { healthCountsOf } from "@open-domain-specification/pages";
import * as vscode from "vscode";
import {
	addFamiliesUnder,
	familyById,
	familyOfRef,
} from "./authoring/families";
import type { FamilyId } from "./authoring/form-protocol";
import type { OdsDiagnostics } from "./diagnostics";
import type { OdsProject, WorkspaceFile } from "./project";

type Children = () => ModelNode[];

type NodeOptions = {
	ref?: string;
	/** Shown dimmed after the label; the id for elements. */
	description?: string;
	/** A link node reveals the real node for this ref instead of expanding. */
	linkTo?: string;
	/**
	 * The file that owns the `linkTo` element, when it is not the file the link
	 * is in: a consumption names a consumable of another file, and a ref alone
	 * does not say which file's `ledger` is meant.
	 */
	linkFile?: WorkspaceFile;
	parent?: ModelNode;
	expanded?: boolean;
};

/** A row in the model tree. Nodes with a ref point at an element in a workspace file. */
export class ModelNode {
	constructor(
		readonly file: WorkspaceFile,
		readonly label: string,
		readonly icon: string,
		readonly children: Children = () => [],
		readonly options: NodeOptions = {},
	) {}

	get ref(): string | undefined {
		return this.options.ref;
	}

	/** Stable identity for reveal and expansion state: file plus ref, or file plus label path. */
	get key(): string {
		const base = this.file.uri.toString();
		if (this.options.ref && !this.options.linkTo)
			return `${base}${this.options.ref}`;
		const parent = `${this.options.parent?.key ?? base}/${this.label}`;
		// Two links of one parent may carry one name and name different elements,
		// or one local ref in different files; what they point at tells them apart.
		return this.options.linkTo
			? `${parent}\u2192${(this.options.linkFile ?? this.file).uri.toString()}${this.options.linkTo}`
			: parent;
	}
}

/** The family a group row lists, by the label `group()` is given; a group is where a new one of that family is added. */
const GROUP_FAMILY: Record<string, FamilyId> = {
	Domains: "domain",
	"Bounded Contexts": "context",
	Teams: "team",
	Relationships: "relationship",
	Aggregates: "aggregate",
	Services: "service",
	Invariants: "invariant",
	"Value Objects": "valueObject",
	Policies: "policy",
	Processes: "process",
	Schemas: "schema",
	Glossary: "term",
	Entities: "entity",
	Provides: "consumable",
	Consumes: "consumption",
};

/** The element a new child would be added under: the row itself, or the nearest row above a group that names an element of its own. */
function parentElementOf(node: ModelNode): ModelNode | undefined {
	for (
		let n: ModelNode | undefined = node.ref ? node : node.options.parent;
		n;
		n = n.options.parent
	)
		if (n.ref && !n.options.linkTo) return n;
	return undefined;
}

/**
 * What the row can author, as context-menu tokens: `ods-update` on an element
 * whose family has an update form, `ods-add` on an element that can hold a
 * child family, `ods-add:<family>` on a group whose family may be added under
 * the element above it. Links, and rows of a file that no longer loads, carry
 * none (a stale file is shown from its last good load and is never edited).
 */
export function authoringTokens(node: ModelNode): string[] {
	if (node.options.linkTo || node.file.stale) return [];
	if (node.ref) {
		const family = familyOfRef(node.ref);
		if (!family) return [];
		return [
			...(familyById(family)?.update ? ["ods-update"] : []),
			...(addFamiliesUnder(node.ref).length > 0 ? ["ods-add"] : []),
		];
	}
	const family = GROUP_FAMILY[node.label];
	const parent = parentElementOf(node);
	return family && parent?.ref && addFamiliesUnder(parent.ref).includes(family)
		? [`ods-add:${family}`]
		: [];
}

/** Where a tree row sends the add and update commands: the parent or element, in the file that holds it. */
export type NodeTarget = {
	/** The set path of the file that holds `ref`. */
	file: string;
	ref: string;
	/** Add: the families that can be added there (one for a group row, so it needs no question). */
	families: FamilyId[];
	/** Update: the family of the element itself. */
	family?: FamilyId;
};

export function targetOfNode(
	node: ModelNode,
	mode: "add" | "update",
): NodeTarget | undefined {
	const tokens = authoringTokens(node);
	if (mode === "update") {
		if (!tokens.includes("ods-update") || !node.ref) return undefined;
		return {
			file: node.file.relativePath,
			ref: node.ref,
			families: [],
			family: familyOfRef(node.ref),
		};
	}
	const parent = parentElementOf(node);
	if (!parent?.ref) return undefined;
	if (node.ref) {
		return tokens.includes("ods-add")
			? {
					file: node.file.relativePath,
					ref: node.ref,
					families: addFamiliesUnder(node.ref),
				}
			: undefined;
	}
	const group = tokens.find((t) => t.startsWith("ods-add:"));
	return group
		? {
				file: parent.file.relativePath,
				ref: parent.ref,
				families: [group.slice("ods-add:".length) as FamilyId],
			}
		: undefined;
}

function group(
	parent: ModelNode,
	label: string,
	icon: string,
	children: () => ModelNode[],
): ModelNode | undefined {
	const items = children();
	if (items.length === 0) return undefined;
	const node = new ModelNode(parent.file, label, icon, () => items, { parent });
	for (const item of items) item.options.parent = node;
	return node;
}

/**
 * The health report's three counts as they read on the workspace node, or
 * undefined when the model is clean on all three — a row of zeroes beside
 * every file would be noise rather than a signal.
 */
export function healthDescription(ws: Workspace): string | undefined {
	const { refactor, tolerated, noComments } = healthCountsOf(ws);
	if (refactor + tolerated + noComments === 0) return undefined;
	return `${refactor} to refactor, ${tolerated} tolerated, ${noComments} uncommented`;
}

/** Tree of every workspace: Domains, Bounded Contexts, Teams and Relationships per workspace root. */
export class ModelTree
	implements vscode.TreeDataProvider<ModelNode>, vscode.Disposable
{
	private readonly changed = new vscode.EventEmitter<ModelNode | undefined>();
	readonly onDidChangeTreeData = this.changed.event;
	private roots: ModelNode[] = [];
	private readonly index = new Map<string, ModelNode>();

	constructor(
		private readonly project: OdsProject,
		private readonly diagnostics: OdsDiagnostics,
	) {
		this.subscription = project.onDidChange(() => this.refresh());
	}

	private readonly subscription: vscode.Disposable;

	dispose(): void {
		this.subscription.dispose();
		this.changed.dispose();
	}

	refresh(): void {
		this.roots = this.project.workspaces.map((f) => this.workspaceNode(f));
		this.index.clear();
		this.changed.fire(undefined);
	}

	getChildren(node?: ModelNode): ModelNode[] {
		const children = node ? node.children() : this.roots;
		for (const c of children) this.index.set(c.key, c);
		return children;
	}

	getParent(node: ModelNode): ModelNode | undefined {
		return node.options.parent;
	}

	/** Finds the real node for a ref by walking the tree, so link nodes can reveal it. */
	find(file: WorkspaceFile, ref: string): ModelNode | undefined {
		const key = `${file.uri.toString()}${ref}`;
		const cached = this.index.get(key);
		if (cached) return cached;
		const walk = (nodes: ModelNode[]): ModelNode | undefined => {
			for (const n of nodes) {
				if (n.key === key) return n;
				if (n.ref && !n.options.linkTo && !ref.startsWith(n.ref)) continue;
				const hit = walk(this.getChildren(n));
				if (hit) return hit;
			}
			return undefined;
		};
		return walk(this.roots);
	}

	getTreeItem(node: ModelNode): vscode.TreeItem {
		const children = node.children();
		const item = new vscode.TreeItem(
			node.label,
			node.options.linkTo || children.length === 0
				? vscode.TreeItemCollapsibleState.None
				: node.options.expanded
					? vscode.TreeItemCollapsibleState.Expanded
					: vscode.TreeItemCollapsibleState.Collapsed,
		);
		item.id = node.key;
		item.description = node.options.description;
		item.contextValue = [
			node.ref ? "ref" : "group",
			...authoringTokens(node),
		].join(" ");
		// A link is judged where the element it names lives.
		const problems = node.ref
			? this.diagnostics.forRef(node.options.linkFile ?? node.file, node.ref)
			: [];
		const worst = problems.some((d) => d.severity === "error")
			? "error"
			: problems.length > 0
				? "warning"
				: undefined;
		item.iconPath = new vscode.ThemeIcon(
			node.icon,
			worst === "error"
				? new vscode.ThemeColor("problemsErrorIcon.foreground")
				: worst === "warning"
					? new vscode.ThemeColor("problemsWarningIcon.foreground")
					: undefined,
		);
		if (problems.length > 0) {
			item.tooltip = new vscode.MarkdownString(
				problems
					.map((d) => `$(${d.severity}) **${d.rule}**: ${d.message}`)
					.join("\n\n"),
				true,
			);
		}
		if (node.options.linkTo) {
			item.command = {
				command: "ods.revealRef",
				title: "Reveal",
				arguments: [node.options.linkFile ?? node.file, node.options.linkTo],
			};
		} else if (node.ref) {
			item.command = {
				command: "ods.openPage",
				title: "Open Page",
				arguments: [node],
			};
		}
		return item;
	}

	/** The file that owns an element, so a link to it opens the right file's node. */
	private ownerOf(element: object): WorkspaceFile | undefined {
		const owner = workspaceOf(element);
		return owner ? this.project.fileOf(owner) : undefined;
	}

	private workspaceNode(file: WorkspaceFile): ModelNode {
		const ws = file.workspace as Workspace;
		const root: ModelNode = new ModelNode(
			file,
			ws.name,
			"package",
			() =>
				[
					group(root, "Domains", "symbol-namespace", () =>
						[...ws.domains.values()].map((d) => this.domainNode(root, d)),
					),
					group(root, "Bounded Contexts", "symbol-class", () =>
						[...ws.boundedcontexts.values()].map((bc) =>
							this.contextNode(root, bc),
						),
					),
					group(root, "Teams", "organization", () =>
						[...ws.teams.values()].map(
							(t) =>
								new ModelNode(file, t.name, "person", undefined, {
									ref: t.ref,
									description: t.id,
								}),
						),
					),
					group(root, "Relationships", "arrow-swap", () =>
						ws.relationships.map(
							(r) =>
								new ModelNode(
									file,
									relationshipTitle(r),
									"arrow-right",
									undefined,
									// A relationship has a page of its own, so the row opens it.
									{ ref: r.ref, description: r.type },
								),
						),
					),
				].filter((n): n is ModelNode => !!n),
			{
				ref: "#",
				// A file that no longer loads keeps showing its last good load, said so
				// here, and without a health count the old model can no longer vouch for.
				description: [
					file.relativePath,
					file.stale ? "last good, current text does not load" : undefined,
					file.stale ? undefined : healthDescription(ws),
				]
					.filter(Boolean)
					.join(" · "),
				expanded: true,
			},
		);
		return root;
	}

	private domainNode(parent: ModelNode, d: Domain): ModelNode {
		const node: ModelNode = new ModelNode(
			parent.file,
			d.name,
			"symbol-namespace",
			() => [...d.subdomains.values()].map((s) => this.subdomainNode(node, s)),
			{ ref: d.ref, description: d.id, parent },
		);
		return node;
	}

	private subdomainNode(parent: ModelNode, s: Subdomain): ModelNode {
		const node: ModelNode = new ModelNode(
			parent.file,
			s.name,
			"symbol-module",
			() =>
				[...s.boundedcontexts.values()].map(
					(bc) =>
						new ModelNode(parent.file, bc.name, "link", undefined, {
							ref: bc.ref,
							linkTo: bc.ref,
							linkFile: this.ownerOf(bc),
							description: "bounded context",
							parent: node,
						}),
				),
			{ ref: s.ref, description: `${s.id} · ${s.type}`, parent },
		);
		return node;
	}

	private contextNode(parent: ModelNode, bc: BoundedContext): ModelNode {
		const file = parent.file;
		const node: ModelNode = new ModelNode(
			file,
			bc.name,
			"symbol-class",
			() =>
				[
					group(node, "Aggregates", "symbol-structure", () =>
						[...bc.aggregates.values()].map((a) => this.aggregateNode(node, a)),
					),
					group(node, "Services", "symbol-method", () =>
						[...bc.services.values()].map((s) => this.serviceNode(node, s)),
					),
					group(node, "Invariants", "shield", () =>
						this.leaves(file, bc.invariants.values(), "shield"),
					),
					group(node, "Value Objects", "symbol-constant", () =>
						this.leaves(file, bc.valueobjects.values(), "symbol-constant"),
					),
					group(node, "Policies", "law", () =>
						[...bc.policies.values()].map(
							(p) =>
								new ModelNode(file, p.name, "law", undefined, {
									ref: p.ref,
									description: p.id,
								}),
						),
					),
					group(node, "Processes", "server-process", () =>
						[...bc.processes.values()].map(
							(p) =>
								new ModelNode(file, p.name, "server-process", undefined, {
									ref: p.ref,
									description: p.id,
								}),
						),
					),
					group(node, "Schemas", "json", () =>
						this.leaves(file, bc.schemas.values(), "json"),
					),
					group(node, "Glossary", "book", () =>
						[...bc.glossary.values()].map(
							(t) =>
								new ModelNode(file, t.name, "symbol-key", undefined, {
									ref: t.ref,
									description: t.id,
								}),
						),
					),
				].filter((n): n is ModelNode => !!n),
			{
				ref: bc.ref,
				description: [
					bc.id,
					bc.bigBallOfMud ? "big ball of mud" : undefined,
					bc.external ? "external system" : undefined,
					bc.boundaryOnly ? "boundary only" : undefined,
				]
					.filter(Boolean)
					.join(" · "),
				parent,
			},
		);
		return node;
	}

	private leaves(
		file: WorkspaceFile,
		items: Iterable<{ name: string; id: string; ref: string }>,
		icon: string,
	): ModelNode[] {
		return [...items].map(
			(i) =>
				new ModelNode(file, i.name, icon, undefined, {
					ref: i.ref,
					description: i.id,
				}),
		);
	}

	/** Consumables show their kind by icon and internal ones say so. */
	private consumableLeaves(
		file: WorkspaceFile,
		items: Iterable<Consumable>,
	): ModelNode[] {
		return [...items].map(
			(c) =>
				new ModelNode(
					file,
					c.name,
					c.type === "event" ? "broadcast" : "zap",
					undefined,
					{
						ref: c.ref,
						description: [c.id, c.internal ? "internal" : undefined]
							.filter(Boolean)
							.join(" · "),
					},
				),
		);
	}

	private aggregateNode(parent: ModelNode, a: Aggregate): ModelNode {
		const file = parent.file;
		const node: ModelNode = new ModelNode(
			file,
			a.name,
			"symbol-structure",
			() =>
				[
					group(node, "Entities", "symbol-field", () =>
						this.leaves(file, a.entities.values(), "symbol-field"),
					),
					group(node, "Invariants", "shield", () =>
						this.leaves(file, a.invariants.values(), "shield"),
					),
					group(node, "Provides", "export", () =>
						this.consumableLeaves(file, a.consumables.values()),
					),
					group(node, "Consumes", "cloud-download", () =>
						a.consumptions.map(
							(c) =>
								new ModelNode(file, c.consumable.name, "link", undefined, {
									ref: c.consumable.ref,
									linkTo: c.consumable.ref,
									linkFile: this.ownerOf(c.consumable),
									description: c.consumable.provider.name,
								}),
						),
					),
				].filter((n): n is ModelNode => !!n),
			{ ref: a.ref, description: a.id, parent },
		);
		return node;
	}

	private serviceNode(parent: ModelNode, s: Service): ModelNode {
		const file = parent.file;
		const node: ModelNode = new ModelNode(
			file,
			s.name,
			"symbol-method",
			() =>
				[
					group(node, "Provides", "export", () =>
						this.consumableLeaves(file, s.consumables.values()),
					),
					group(node, "Consumes", "cloud-download", () =>
						s.consumptions.map(
							(c) =>
								new ModelNode(file, c.consumable.name, "link", undefined, {
									ref: c.consumable.ref,
									linkTo: c.consumable.ref,
									linkFile: this.ownerOf(c.consumable),
									description: c.consumable.provider.name,
								}),
						),
					),
				].filter((n): n is ModelNode => !!n),
			{ ref: s.ref, description: `${s.id} · ${s.type}`, parent },
		);
		return node;
	}
}
