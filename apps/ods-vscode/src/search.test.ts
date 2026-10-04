import { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import { describe, expect, it, vi } from "vitest";

const fake = vi.hoisted(() => ({
	pick: undefined as
		| undefined
		| {
				items: unknown[];
				selectedItems: unknown[];
				accept?: () => void;
				hidden: boolean;
		  },
	executed: [] as unknown[][],
}));

vi.mock("vscode", () => ({
	window: {
		createQuickPick: () => {
			const pick = {
				title: "",
				placeholder: "",
				matchOnDescription: false,
				matchOnDetail: false,
				items: [] as unknown[],
				selectedItems: [] as unknown[],
				hidden: false,
				accept: undefined as undefined | (() => void),
				onDidAccept(l: () => void) {
					pick.accept = l;
				},
				onDidHide() {},
				hide() {
					pick.hidden = true;
				},
				show() {},
			};
			fake.pick = pick;
			return pick;
		},
	},
	commands: {
		executeCommand: (...args: unknown[]) => {
			fake.executed.push(args);
			return Promise.resolve();
		},
	},
}));

import { searchIndex, showSearch } from "./search";

/** Two team files that both have a `ledger` with a `post`. */
function twoFiles() {
	const make = (name: string) => {
		const ws = new Workspace(name, {
			description: `${name} desc`,
			version: "1",
		});
		const sub = ws
			.addDomain("Bank", { description: "" })
			.addSubdomain("Core", { type: "core", description: "" });
		const ledger = sub.addBoundedcontext("Ledger", { description: "" });
		ledger
			.addService("Payments", { description: "", type: "application" })
			.provides("Post", { description: "", type: "operation" });
		return ws;
	};
	const [a, b] = [make("Team A"), make("Team B")];
	WorkspaceSet.fromWorkspaces([
		["a.json", a],
		["nested/b#%.json", b],
	]);
	return [a, b].map((workspace, i) => ({
		uri: { toString: () => `file:///ws/.ods/${i}` },
		relativePath: i ? "nested/b#%.json" : "a.json",
		text: "{}",
		workspace,
	}));
}

describe("search over the files of a set", () => {
	const [fa, fb] = twoFiles();

	it("finds the same name in each file as two hits, told apart by the file in the detail", () => {
		const hitsA = [...searchIndex(fa as never)].filter((h) =>
			h.label.endsWith("Ledger"),
		);
		const hitsB = [...searchIndex(fb as never)].filter((h) =>
			h.label.endsWith("Ledger"),
		);
		expect(hitsA).toHaveLength(1);
		expect(hitsA[0].ref).toBe(hitsB[0].ref);
		expect(hitsA[0].file).toBe(fa);
		expect(hitsB[0].file).toBe(fb);
		expect(hitsA[0].detail).toBe("Team A (a.json)");
		expect(hitsB[0].detail).toBe("Team B (nested/b#%.json)");
	});

	it("names the file on the workspace hit and keeps the trail after it", () => {
		const hits = [...searchIndex(fb as never)];
		const post = hits.find((h) => h.label.endsWith("Post"));
		expect(post?.detail).toBe("Team B (nested/b#%.json) › Ledger › Payments");
		expect(hits[0].description).toBe("Workspace · nested/b#%.json");
	});

	it("opens the page in the file that owns the hit that was picked, not the first file with that name", async () => {
		fake.executed.length = 0;
		await showSearch({ workspaces: [fa, fb] } as never);
		const pick = fake.pick as NonNullable<typeof fake.pick>;
		const ledgers = pick.items.filter((i) =>
			(i as { label: string }).label.endsWith("Ledger"),
		) as Array<{ file: unknown; ref: string }>;
		expect(ledgers.map((l) => l.file)).toEqual([fa, fb]);
		pick.selectedItems = [ledgers[1]];
		pick.accept?.();
		expect(pick.hidden).toBe(true);
		expect(fake.executed).toEqual([
			["ods.openPage", { file: fb, ref: "#/boundedcontexts/ledger" }],
		]);
		// Nothing picked, nothing opened.
		pick.selectedItems = [];
		pick.accept?.();
		expect(fake.executed).toHaveLength(1);
	});
});
