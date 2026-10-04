import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { HostMessage } from "@open-domain-specification/pages";
import { JSDOM } from "jsdom";
import {
	afterAll,
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

/** The slice of the `vscode` API the panel uses, with the webview it creates left in `fake`. */
const fake = vi.hoisted(() => {
	type Listener = (value: never) => void;
	class EventEmitter<T> {
		private listeners: Listener[] = [];
		event = (listener: (value: T) => void) => {
			this.listeners.push(listener as Listener);
			return { dispose: () => undefined };
		};
		fire(value: T) {
			for (const listener of this.listeners) listener(value as never);
		}
		dispose() {
			this.listeners = [];
		}
	}
	const state = {
		posted: [] as unknown[],
		html: "",
		title: "",
		disposed: undefined as (() => void) | undefined,
		received: undefined as ((msg: unknown) => void) | undefined,
		created: 0,
		revealed: 0,
		executed: [] as unknown[][],
	};
	return { EventEmitter, state };
});

vi.mock("vscode", () => {
	const uri = (fsPath: string) => ({
		fsPath,
		toString: () => `file://${fsPath}`,
	});
	return {
		EventEmitter: fake.EventEmitter,
		ViewColumn: { One: 1 },
		Uri: {
			joinPath: (base: { fsPath: string }, ...parts: string[]) =>
				uri(join(base.fsPath, ...parts)),
		},
		commands: {
			executeCommand: (...args: unknown[]) => {
				fake.state.executed.push(args);
				return Promise.resolve();
			},
		},
		window: {
			createWebviewPanel: () => {
				fake.state.created += 1;
				return {
					set title(value: string) {
						fake.state.title = value;
					},
					iconPath: undefined,
					reveal: () => {
						fake.state.revealed += 1;
					},
					onDidDispose: (listener: () => void) => {
						fake.state.disposed = listener;
					},
					dispose: () => fake.state.disposed?.(),
					webview: {
						cspSource: "vscode-resource:",
						asWebviewUri: (u: { fsPath: string }) => `webview:${u.fsPath}`,
						postMessage: (msg: unknown) => {
							fake.state.posted.push(msg);
							return Promise.resolve(true);
						},
						onDidReceiveMessage: (listener: (msg: unknown) => void) => {
							fake.state.received = listener;
						},
						set html(value: string) {
							fake.state.html = value;
						},
					},
				};
			},
		},
	};
});

import { DetailPanel } from "./panel";

const media = mkdtempSync(join(tmpdir(), "ods-panel-"));
mkdirSync(join(media, "media", "app"), { recursive: true });
writeFileSync(
	join(media, "media", "app", "index.html"),
	'<script type="module" src="./assets/index-abc.js"></script><link href="./assets/index-abc.css">',
);

/** A file of the `.ods` folder `folder`, at the set path `path` (the file's name by default). */
const file = (name: string, folder = "ws", path = `${name}.json`) => ({
	uri: {
		toString: () => `file:///${folder}/${path}`,
		fsPath: `/${folder}/${path}`,
	},
	folder,
	relativePath: path,
	text: "{}",
	workspace: { name, toSchema: () => ({ name }) } as
		| { name: string; toSchema: () => unknown }
		| undefined,
	stale: undefined as boolean | undefined,
	error: undefined as string | undefined,
});

type Fake = ReturnType<typeof file>;

function setup(...files: Fake[]) {
	const changed = new fake.EventEmitter<void>();
	const project = {
		files: new Map(files.map((f) => [f.uri.toString(), f])),
		onDidChange: changed.event,
		folderKey: (f: Fake) => f.folder,
		folderFiles: (f: Fake) => files.filter((x) => x.folder === f.folder),
	};
	const diagnostics = { byFile: new Map() };
	const panel = new DetailPanel(
		{ fsPath: media } as never,
		project as never,
		diagnostics as never,
	);
	const models = () =>
		fake.state.posted.filter(
			(m): m is Extract<HostMessage, { type: "model" }> =>
				(m as HostMessage).type === "model",
		);
	const send = (msg: unknown) => fake.state.received?.(msg);
	return { panel, project, changed, models, send, diagnostics };
}

const open = (panel: DetailPanel, f: Fake, ref: string) =>
	panel.open({ file: f as never, ref });

beforeEach(() => {
	Object.assign(fake.state, {
		posted: [],
		html: "",
		title: "",
		disposed: undefined,
		received: undefined,
		created: 0,
		revealed: 0,
		executed: [],
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

afterAll(() => {
	rmSync(media, { recursive: true, force: true });
});

describe("DetailPanel history boundaries", () => {
	const orders = file("orders");
	// Another `.ods` folder: a different set to the webview.
	const billing = file("billing", "other");

	it("starts the history of a workspace the webview has not shown", async () => {
		const { panel, models } = setup(orders);
		await open(panel, orders, "#/boundedcontexts/orders");
		expect(models()).toEqual([
			expect.objectContaining({ ref: "#/boundedcontexts/orders", reset: true }),
		]);
	});

	it("starts over again when the webview says ready, since it is a fresh page", async () => {
		const { panel, models, send } = setup(orders);
		await open(panel, orders, "#");
		send({ type: "ready" });
		expect(models().map((m) => m.reset)).toEqual([true, true]);
	});

	it("keeps the history across a refresh of the file it is showing", async () => {
		const { panel, models, send, changed } = setup(orders);
		await open(panel, orders, "#");
		send({ type: "ready" });
		changed.fire();
		expect(models().map((m) => m.reset)).toEqual([true, true, undefined]);
		expect("reset" in models()[2]).toBe(false);
	});

	it("navigates in place within the same folder, and restarts history for a different one", async () => {
		const { panel, models, send } = setup(orders, billing);
		await open(panel, orders, "#");
		send({ type: "ready" });
		await open(panel, orders, "#/boundedcontexts/orders");
		expect(fake.state.posted.at(-1)).toEqual({
			type: "navigate",
			ref: "#/boundedcontexts/orders",
		});
		await open(panel, billing, "#");
		expect(models().at(-1)).toEqual(
			expect.objectContaining({ reset: true, ref: "#" }),
		);
		// Going back to the first folder is also a different set to the webview.
		await open(panel, orders, "#");
		expect(models().at(-1)?.reset).toBe(true);
	});

	it("starts the history again for a webview opened after the panel was closed", async () => {
		const { panel, models, send } = setup(orders);
		await open(panel, orders, "#");
		send({ type: "ready" });
		panel.dispose();
		await open(panel, orders, "#");
		expect(fake.state.created).toBe(2);
		expect(models().at(-1)?.reset).toBe(true);
	});

	it("marks the start of history for a file that cannot be shown, and not the refresh", async () => {
		const missing = file("missing");
		const { panel, models, changed } = setup();
		await open(panel, missing, "#");
		expect(models().at(-1)).toEqual({
			type: "model",
			workspaces: [],
			ref: "#",
			reset: true,
		});
		expect(fake.state.title).toBe("Unavailable");
		changed.fire();
		expect(models().at(-1)).toEqual({
			type: "model",
			workspaces: [],
			ref: "#",
		});
	});

	it("tells the tree where the reader went, and passes Reveal on, after a traversal", async () => {
		const { panel, send } = setup(orders);
		const opened: string[] = [];
		panel.onDidOpen((l) => opened.push(l.ref));
		await open(panel, orders, "#");
		send({ type: "navigated", ref: "#/boundedcontexts/orders" });
		send({ type: "navigated", ref: "#/boundedcontexts/orders" });
		send({ type: "navigated", ref: "#" });
		expect(opened).toEqual(["#", "#/boundedcontexts/orders", "#"]);
		send({ type: "reveal", ref: "#" });
		expect(fake.state.executed).toEqual([
			["ods.revealInJson", { file: orders, ref: "#" }],
		]);
	});
});

describe("DetailPanel hands the app the whole folder", () => {
	const a = file("a", "set");
	const b = file("b", "set");
	const nested = file("c", "set", "nested/c#%.json");

	it("posts every file of the folder as one set, each at its own path, in the order the project listed them", async () => {
		const { panel, models, diagnostics } = setup(a, b, nested);
		diagnostics.byFile.set(b.uri.toString(), [
			{ severity: "error", rule: "r", message: "m", ref: "#" },
		]);
		await open(panel, b, "#/boundedcontexts/ledger");
		const [model] = models();
		expect(model.workspaces.map((w) => [w.path, w.fileLabel, w.set])).toEqual([
			["a.json", "a.json", "set"],
			["b.json", "b.json", "set"],
			["nested/c#%.json", "nested/c#%.json", "set"],
		]);
		expect(model.workspaces[1].diagnostics).toEqual([
			{ severity: "error", rule: "r", message: "m", ref: "#" },
		]);
		expect(model.workspaces.map((w) => w.schema)).toEqual([
			{ name: "a" },
			{ name: "b" },
			{ name: "c" },
		]);
	});

	it("names the page by the file that owns it when the app holds more than one file", async () => {
		const { panel, models } = setup(a, b, nested);
		await open(panel, nested, "#/boundedcontexts/ledger");
		// The nested path is one pointer segment (`/` is `~1`), its `#` and `%` encoded once as a wire path.
		expect(models()[0].ref).toBe(
			"#/workspaces/nested~1c%23%25.json/boundedcontexts/ledger",
		);
	});

	it("keeps the unqualified route when the folder holds one file", async () => {
		const only = file("only", "alone");
		const { panel, models } = setup(only);
		await open(panel, only, "#/boundedcontexts/ledger");
		expect(models()[0].ref).toBe("#/boundedcontexts/ledger");
	});

	it("opens another file of the same folder by navigating the webview it has, not by reloading it", async () => {
		const { panel, send } = setup(a, b);
		await open(panel, a, "#");
		send({ type: "ready" });
		await open(panel, b, "#/boundedcontexts/ledger");
		expect(fake.state.posted.at(-1)).toEqual({
			type: "navigate",
			ref: "#/workspaces/b.json/boundedcontexts/ledger",
		});
	});

	it("follows the reader into another file: the tree is told the file and the local ref", async () => {
		const { panel, send } = setup(a, b);
		const opened: Array<[string, string]> = [];
		panel.onDidOpen((l) => opened.push([l.file.relativePath, l.ref]));
		await open(panel, a, "#");
		send({
			type: "navigated",
			ref: "#/workspaces/b.json/boundedcontexts/ledger",
		});
		expect(opened.at(-1)).toEqual(["b.json", "#/boundedcontexts/ledger"]);
		// The same ref in the other file is a different page.
		send({
			type: "navigated",
			ref: "#/workspaces/a.json/boundedcontexts/ledger",
		});
		expect(opened.at(-1)).toEqual(["a.json", "#/boundedcontexts/ledger"]);
	});

	it("ignores a route that names no file of the folder, such as the set's own page", async () => {
		const { panel, send } = setup(a, b);
		const opened: unknown[] = [];
		panel.onDidOpen((l) => opened.push(l));
		await open(panel, a, "#");
		const before = opened.length;
		send({ type: "navigated", ref: "#" });
		send({
			type: "navigated",
			ref: "#/workspaces/gone.json/boundedcontexts/x",
		});
		expect(opened.length).toBe(before);
	});

	it("reveals in the file the page belongs to, never in the file the webview was opened from", async () => {
		const { panel, send } = setup(a, b);
		await open(panel, a, "#");
		send({
			type: "reveal",
			ref: "#/workspaces/b.json/boundedcontexts/ledger",
		});
		expect(fake.state.executed.at(-1)).toEqual([
			"ods.revealInJson",
			{ file: b, ref: "#/boundedcontexts/ledger" },
		]);
		// The set's own page belongs to no file: the reader's last file is revealed.
		send({ type: "reveal", ref: "#" });
		expect(fake.state.executed.at(-1)).toEqual([
			"ods.revealInJson",
			{ file: a, ref: "#" },
		]);
	});

	it("gives a file that does not load as its last good load, labelled with why", async () => {
		const broken = file("broken", "stale");
		const fine = file("fine", "stale");
		broken.stale = true;
		broken.error = "x is not valid JSON";
		const { panel, models } = setup(broken, fine);
		await open(panel, fine, "#");
		const [first, second] = models()[0].workspaces;
		expect(first.stale).toContain("x is not valid JSON");
		expect(second.stale).toBeUndefined();
	});

	it("leaves a file with no workspace to show out of the set", async () => {
		const empty = file("empty", "gone");
		empty.workspace = undefined;
		const fine = file("fine", "gone");
		const { panel, models } = setup(empty, fine);
		await open(panel, fine, "#");
		expect(models()[0].workspaces.map((w) => w.path)).toEqual(["fine.json"]);
		// With one file left the route is unqualified again.
		expect(models()[0].ref).toBe("#");
	});
});

describe("DetailPanel toolbar shell", () => {
	let dom: JSDOM;
	let sent: unknown[];

	/** The shell the panel writes, with its own inline script run in a window of its own. */
	const mount = async () => {
		const orders = file("orders");
		const { panel } = setup(orders);
		await open(panel, orders, "#");
		dom = new JSDOM(fake.state.html, { runScripts: "outside-only" });
		const { window } = dom;
		sent = [];
		// The app is not here; what the shell posts to it is what is observed.
		window.postMessage = ((data: unknown) => {
			sent.push(data);
		}) as typeof window.postMessage;
		const script = fake.state.html.match(
			/<script nonce="[^"]+">([\s\S]*?)<\/script>/,
		)?.[1] as string;
		window.eval(script);
		const button = (action: string) =>
			window.document.querySelector(
				`[data-action="${action}"]`,
			) as HTMLButtonElement;
		return {
			back: button("back"),
			forward: button("forward"),
			reveal: button("reveal"),
		};
	};
	const post = (data: unknown, own = true) =>
		dom.window.dispatchEvent(
			new dom.window.MessageEvent("message", {
				data,
				source: own ? dom.window : null,
			}),
		);
	const history = (canGoBack: boolean, canGoForward: boolean, own = true) =>
		post({ type: "history", canGoBack, canGoForward }, own);

	it("puts Back and Forward before Reveal in JSON, as labelled native buttons that start disabled", async () => {
		const { back, forward, reveal } = await mount();
		const order = [...dom.window.document.querySelectorAll(".toolbar button")];
		expect(order).toEqual([back, forward, reveal]);
		expect(back.tagName).toBe("BUTTON");
		expect(back.getAttribute("aria-label")).toBe("Back");
		expect(back.querySelector(".codicon-arrow-left")).not.toBeNull();
		expect(back.disabled).toBe(true);
		expect(forward.tagName).toBe("BUTTON");
		expect(forward.getAttribute("aria-label")).toBe("Forward");
		expect(forward.querySelector(".codicon-arrow-right")).not.toBeNull();
		expect(forward.disabled).toBe(true);
		expect(reveal.disabled).toBe(false);
	});

	it("enables each button from the position the app reports, and only from the app's own window", async () => {
		const { back, forward } = await mount();
		history(true, false);
		expect([back.disabled, forward.disabled]).toEqual([false, true]);
		history(true, true);
		expect([back.disabled, forward.disabled]).toEqual([false, false]);
		history(false, true);
		expect([back.disabled, forward.disabled]).toEqual([true, false]);
		history(true, false, false);
		expect([back.disabled, forward.disabled]).toEqual([true, false]);
		post(null);
		post({ type: "model" });
		expect([back.disabled, forward.disabled]).toEqual([true, false]);
	});

	it("relays a click on each enabled button to the app as a toolbar action", async () => {
		const { back, forward, reveal } = await mount();
		history(true, true);
		back.click();
		forward.click();
		reveal.click();
		expect(sent).toEqual([
			{ type: "toolbar", action: "back" },
			{ type: "toolbar", action: "forward" },
			{ type: "toolbar", action: "reveal" },
		]);
	});

	it("does not relay a click on a button that is disabled", async () => {
		const { back, forward } = await mount();
		back.click();
		forward.click();
		expect(sent).toEqual([]);
	});
});
