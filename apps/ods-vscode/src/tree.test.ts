import { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import { describe, expect, it, vi } from "vitest";

/** The slice of the `vscode` API the tree uses. */
vi.mock("vscode", () => {
	class EventEmitter<T> {
		private listeners: Array<(v: T) => void> = [];
		event = (l: (v: T) => void) => {
			this.listeners.push(l);
			return { dispose: () => undefined };
		};
		fire(v: T) {
			for (const l of this.listeners) l(v);
		}
		dispose() {
			this.listeners = [];
		}
	}
	class TreeItem {
		id?: string;
		description?: string;
		contextValue?: string;
		iconPath?: unknown;
		tooltip?: unknown;
		command?: { command: string; arguments?: unknown[] };
		constructor(
			public label: string,
			public collapsibleState: number,
		) {}
	}
	class ThemeIcon {
		constructor(
			public id: string,
			public color?: unknown,
		) {}
	}
	class ThemeColor {
		constructor(public id: string) {}
	}
	class MarkdownString {
		constructor(
			public value: string,
			public supportThemeIcons?: boolean,
		) {}
	}
	return {
		EventEmitter,
		TreeItem,
		ThemeIcon,
		ThemeColor,
		MarkdownString,
		TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
	};
});

import { type ModelNode, ModelTree } from "./tree";

/** Two team files that both have a `ledger` providing `post`, and a consumer in b that takes a's. */
function teams() {
	const make = (name: string, consumeForeign?: ReturnType<typeof make>) => {
		const ws = new Workspace(name, { description: "", version: "1" });
		const domain = ws.addDomain("Bank", { description: "" });
		const sub = domain.addSubdomain("Core", { type: "core", description: "" });
		const ledger = sub.addBoundedcontext("Ledger", { description: "" });
		const payments = ledger.addService("Payments", {
			description: "",
			type: "application",
		});
		const post = payments.provides("Post", {
			description: "",
			type: "operation",
		});
		const account = ledger.addAggregate("Account", { description: "" });
		account.addEntity("Account", { description: "", root: true });
		if (consumeForeign) {
			account.consumes(consumeForeign.post, {});
			account.consumes(post, {});
			ledger.serves(consumeForeign.sub);
		}
		return { ws, ledger, post, account, sub };
	};
	const a = make("Team A");
	const b = make("Team B", a);
	const set = WorkspaceSet.fromWorkspaces([
		["a.json", a.ws],
		["b.json", b.ws],
	]);
	return { a, b, set };
}

const uri = (path: string) => ({
	toString: () => `file:///ws/.ods/${path}`,
	fsPath: `/ws/.ods/${path}`,
});

function treeOf() {
	const { a, b } = teams();
	const files = [a, b].map((t, i) => ({
		uri: uri(`${i ? "b" : "a"}.json`),
		relativePath: `${i ? "b" : "a"}.json`,
		text: "{}",
		workspace: t.ws,
	}));
	const project = {
		workspaces: files,
		onDidChange: () => ({ dispose: () => undefined }),
		fileOf: (w: unknown) => files.find((f) => f.workspace === w),
	};
	const findings = new Map<string, unknown[]>();
	const diagnostics = {
		forRef: (file: { uri: { toString(): string } }, ref: string) =>
			(findings.get(`${file.uri.toString()}${ref}`) ?? []) as never,
	};
	const tree = new ModelTree(project as never, diagnostics as never);
	tree.refresh();
	return { tree, files, a, b, findings };
}

const child = (tree: ModelTree, node: ModelNode | undefined, label: string) =>
	tree.getChildren(node).find((n) => n.label === label) as ModelNode;

/** The Consumes links of b's Account aggregate. */
function consumesOfB() {
	const t = treeOf();
	const root = t.tree.getChildren()[1];
	const contexts = child(t.tree, root, "Bounded Contexts");
	const ledger = child(t.tree, contexts, "Ledger");
	const aggregates = child(t.tree, ledger, "Aggregates");
	const account = child(t.tree, aggregates, "Account");
	const consumes = child(t.tree, account, "Consumes");
	return { ...t, links: t.tree.getChildren(consumes) };
}

describe("the model tree over a set of files", () => {
	it("has one root per file, each labelled with its file, in the order the project listed them", () => {
		const { tree } = treeOf();
		const roots = tree.getChildren();
		expect(roots.map((r) => r.label)).toEqual(["Team A", "Team B"]);
		expect(roots.map((r) => tree.getTreeItem(r).description)).toEqual([
			"a.json",
			"b.json",
		]);
	});

	it("keys an element by its file and its local ref, so the two ledgers are two rows", () => {
		const { tree, files } = treeOf();
		const [a, b] = tree.getChildren();
		const ledgerA = child(tree, child(tree, a, "Bounded Contexts"), "Ledger");
		const ledgerB = child(tree, child(tree, b, "Bounded Contexts"), "Ledger");
		expect(ledgerA.ref).toBe(ledgerB.ref);
		expect(ledgerA.key).toBe(
			`${files[0].uri.toString()}#/boundedcontexts/ledger`,
		);
		expect(ledgerB.key).toBe(
			`${files[1].uri.toString()}#/boundedcontexts/ledger`,
		);
		expect(tree.find(files[1] as never, "#/boundedcontexts/ledger")).toBe(
			ledgerB,
		);
		expect(tree.find(files[0] as never, "#/boundedcontexts/ledger")).toBe(
			ledgerA,
		);
	});

	it("reveals what a consumption names in the file that owns it, though the consumer's file has the same ref", () => {
		const { tree, links, files } = consumesOfB();
		expect(links).toHaveLength(2);
		const [foreign, own] = links;
		expect(foreign.ref).toBe(own.ref);
		const foreignItem = tree.getTreeItem(foreign);
		const ownItem = tree.getTreeItem(own);
		expect(foreignItem.command?.command).toBe("ods.revealRef");
		expect(foreignItem.command?.arguments).toEqual([files[0], foreign.ref]);
		expect(ownItem.command?.arguments).toEqual([files[1], own.ref]);
	});

	it("gives two links of one parent that carry one name different identities", () => {
		const { links } = consumesOfB();
		expect(links[0].label).toBe(links[1].label);
		expect(links[0].key).not.toBe(links[1].key);
		expect(new Set(links.map((l) => l.key)).size).toBe(2);
	});

	it("opens the link of a subdomain to its context in the file that owns it", () => {
		const { tree, files } = treeOf();
		const [a] = tree.getChildren();
		const domains = child(tree, a, "Domains");
		const bank = child(tree, domains, "Bank");
		const core = child(tree, bank, "Core");
		const served = tree.getChildren(core);
		expect(
			served.map((n) => tree.getTreeItem(n).command?.arguments?.[0]),
		).toEqual([files[0], files[1]]);
	});

	it("badges a link by the findings of the file that owns what it names", () => {
		const { tree, links, files, findings } = consumesOfB();
		const [foreign, own] = links;
		findings.set(`${files[0].uri.toString()}${foreign.ref}`, [
			{ severity: "error", rule: "demo", message: "in a", ref: foreign.ref },
		]);
		const icon = (n: ModelNode) =>
			(tree.getTreeItem(n).iconPath as { color?: { id: string } }).color?.id;
		expect(icon(foreign)).toBe("problemsErrorIcon.foreground");
		// The same local ref in b is judged by b's findings, which are none.
		expect(icon(own)).toBeUndefined();
	});

	it("keeps a link whose owner is not loaded pointing at the file it was in", () => {
		const { tree, files } = treeOf();
		const project = (
			tree as unknown as { project: { fileOf: (w: unknown) => unknown } }
		).project;
		project.fileOf = () => undefined;
		tree.refresh();
		const root = tree.getChildren()[1];
		const ledger = child(tree, child(tree, root, "Bounded Contexts"), "Ledger");
		const account = child(tree, child(tree, ledger, "Aggregates"), "Account");
		const [link] = tree.getChildren(child(tree, account, "Consumes"));
		expect(tree.getTreeItem(link).command?.arguments?.[0]).toBe(files[1]);
	});

	it("shows a file that does not load as its last good load, labelled, with no health count", () => {
		const { tree, files } = treeOf();
		(files[0] as { stale?: boolean }).stale = true;
		tree.refresh();
		const root = tree.getChildren()[0];
		expect(tree.getTreeItem(root).description).toContain(
			"last good, current text does not load",
		);
	});
});
