import { type Workspace, WorkspaceSet } from "@open-domain-specification/core";
import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { northbankPayloads } from "../lib/fixtures";
import { modelRefToHash } from "../lib/ref-transport";
import { routeOf } from "../lib/route";
import { cxPayloads, linkedPair, side } from "../lib/set-fixture";
import type { Bootstrap, HostMessage, WorkspacePayload } from "../protocol";
import App from "./App.svelte";

const h1 = () =>
	(document.querySelector("main h1") as HTMLElement)?.textContent ?? "";
const at = (hash: string) => history.replaceState(null, "", `/${hash}`);

afterEach(() => {
	history.replaceState(null, "", "/");
	vi.unstubAllGlobals();
});

/** The files of a set as the payloads a host hands the app. */
function payloadsOf(set: WorkspaceSet, label = "s"): WorkspacePayload[] {
	return [...set.toSchemas()].map(([file, schema]) => ({
		schema: JSON.parse(JSON.stringify(schema)),
		fileLabel: file,
		path: file,
		set: label,
	}));
}

/** The links of the page whose canonical route is `route`. */
const linksTo = (route: string) =>
	[...document.querySelectorAll<HTMLAnchorElement>("a.ref")].filter(
		(a) => a.dataset.ref === route,
	);

describe("a set handed to the app", () => {
	const pair = linkedPair();

	it("opens on the set's own page, listing each file as a workspace of its own", async () => {
		render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() => expect(h1()).toContain("Workspaces"));
		expect(h1()).toContain("2 files");
		const rows = [...document.querySelectorAll("#workspaces tbody tr")];
		expect(rows).toHaveLength(2);
		expect(
			within(rows[0] as HTMLElement).getByRole("link", { name: "Team A" }),
		).toHaveAttribute("href", "#/workspaces/a.json");
		expect(
			within(rows[1] as HTMLElement).getByRole("link", { name: "Team B" }),
		).toHaveAttribute("href", "#/workspaces/b.json");
		expect(rows[0].textContent).toContain("a.json");
		// No merged workspace, no tree for a page that is no one workspace's.
		expect(document.querySelector("nav.tree")).toBeNull();
	});

	it("draws the context map across every file, the two ledgers kept apart", async () => {
		render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() =>
			expect(
				document.querySelector('[data-id="a.json#/boundedcontexts/ledger"]'),
			).toBeInTheDocument(),
		);
		const ids = [...document.querySelectorAll(".context-node")]
			.map((n) => n.closest("[data-id]")?.getAttribute("data-id"))
			.sort();
		expect(ids).toEqual([
			"a.json#/boundedcontexts/ledger",
			"a.json#/boundedcontexts/risk",
			"b.json#/boundedcontexts/ledger",
			"b.json#/boundedcontexts/risk",
		]);
	});

	it("opens the page of the exact file a map node belongs to, when the node is clicked", async () => {
		render(App, { initial: { workspaces: cxPayloads() } });
		const node = (id: string) =>
			document.querySelector(`[data-id="${id}"]`) as HTMLElement;
		await waitFor(() =>
			expect(node("b.json#/boundedcontexts/ledger")).toBeTruthy(),
		);
		await fireEvent.click(node("b.json#/boundedcontexts/ledger"));
		expect(location.hash).toBe(modelRefToHash(routeOf(pair.b.ledger)));
		await waitFor(() => expect(h1()).toContain("Ledger"));
		expect(document.querySelector(".crumbs")?.textContent).toContain("Team B");
		expect(document.querySelector(".crumbs")?.textContent).not.toContain(
			"Team A",
		);
	});

	it("reads the same local ref in the file the route names, never the other file's", async () => {
		const route = (w: "a" | "b") => routeOf(pair[w].ledger);
		at(modelRefToHash(route("a")));
		const { unmount } = render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() => expect(h1()).toContain("Ledger"));
		expect(document.querySelector(".crumbs")?.textContent).toContain("Team A");
		unmount();
		at(modelRefToHash(route("b")));
		render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() => expect(h1()).toContain("Ledger"));
		expect(document.querySelector(".crumbs")?.textContent).toContain("Team B");
	});

	it("links what a page names in another file to the file that owns it, and the same local ref in its own file to its own", async () => {
		at(modelRefToHash(routeOf(pair.a.account)));
		render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() => expect(h1()).toContain("Account"));
		// `a` consumes `b`'s Post, whose local ref is `a`'s Post's too.
		expect(pair.a.post.ref).toBe(pair.b.post.ref);
		expect(linksTo(routeOf(pair.b.post)).length).toBeGreaterThan(0);
		expect(linksTo(routeOf(pair.a.post))).toHaveLength(0);
		const link = linksTo(routeOf(pair.b.post))[0];
		await fireEvent.click(link);
		expect(location.hash).toBe(modelRefToHash(routeOf(pair.b.post)));
		await waitFor(() =>
			expect(document.querySelector(".crumbs")?.textContent).toContain(
				"Team B",
			),
		);
	});

	it("lists the consumers of what a service provides by the file each is in, though their local refs are equal", async () => {
		at(modelRefToHash(routeOf(pair.b.payments)));
		render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() => expect(h1()).toContain("Payments"));
		expect(pair.a.account.ref).toBe(pair.b.account.ref);
		const consumers = [...document.querySelectorAll("main td a.ref")].map(
			(a) => (a as HTMLElement).dataset.ref,
		);
		// `a`'s Account consumes b's Post; b's own Account does not.
		expect(consumers).toContain(routeOf(pair.a.account));
		expect(consumers).not.toContain(routeOf(pair.b.account));
	});

	it("shows the set's own page for a route that names a file the set does not have, and says so", async () => {
		at("#/workspaces/gone.json/boundedcontexts/ledger");
		render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() => expect(h1()).toContain("Workspaces"));
		expect(
			document.querySelector('[data-notice="missing"]')?.textContent,
		).toContain("gone.json");
	});

	it("shows the set's own page for a route that names no file, rather than any one file's page", async () => {
		at("#/boundedcontexts/ledger");
		render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() => expect(h1()).toContain("Workspaces"));
		expect(document.querySelector('[data-notice="missing"]')).toBeNull();
		at("#/health");
	});

	it("reads each file's own findings on its page, and the whole set's on the set's page", async () => {
		const loaded = payloadsOf(pair.set);
		const diagnostics = [
			{
				severity: "error" as const,
				rule: "demo-rule",
				message: "only in b",
				ref: "#/boundedcontexts/ledger",
			},
		];
		loaded[1].diagnostics = diagnostics;
		loaded[0].diagnostics = [];
		render(App, { initial: { workspaces: loaded } });
		await waitFor(() => expect(h1()).toContain("Workspaces"));
		const problems = document.querySelector("#problems") as HTMLElement;
		expect(problems.textContent).toContain("only in b");
		const link = within(problems).getByRole("link", { name: "go to" });
		// The finding's link goes to the file it is about.
		expect(link).toHaveAttribute(
			"data-ref",
			"#/workspaces/b.json/boundedcontexts/ledger",
		);
	});

	it("says what could not be loaded, by file, on the set's page", async () => {
		const files = payloadsOf(pair.set);
		files.push({
			schema: [],
			fileLabel: "broken.json",
			path: "broken.json",
			set: "s",
		});
		render(App, { initial: { workspaces: files } });
		await waitFor(() => expect(h1()).toContain("Workspaces"));
		expect(screen.getByRole("alert").textContent).toContain(
			"broken.json is not a workspace file",
		);
	});

	it("labels a file shown from its last good load, on its page and in the set's list", async () => {
		const files = payloadsOf(pair.set);
		files[0].stale = "Its current text does not load: unexpected token.";
		at(modelRefToHash("#/workspaces/a.json/boundedcontexts/ledger"));
		render(App, { initial: { workspaces: files } });
		await waitFor(() => expect(h1()).toContain("Ledger"));
		const notice = document.querySelector(
			'[data-notice="stale"]',
		) as HTMLElement;
		expect(notice.getAttribute("role")).toBe("status");
		expect(notice.textContent).toContain("last version of a.json that loaded");
		expect(notice.textContent).toContain("unexpected token");
		// The other file is not labelled.
		location.hash = modelRefToHash(
			"#/workspaces/b.json/boundedcontexts/ledger",
		);
		await waitFor(() =>
			expect(document.querySelector(".crumbs")?.textContent).toContain(
				"Team B",
			),
		);
		expect(document.querySelector('[data-notice="stale"]')).toBeNull();
		location.hash = "";
		await waitFor(() => expect(h1()).toContain("Workspaces"));
		expect(document.querySelector("#workspaces")?.textContent).toContain(
			"last good load",
		);
	});

	it("keeps a link up to the list of workspaces on the page of every file", async () => {
		at(modelRefToHash(routeOf(pair.a.ledger)));
		render(App, { initial: { workspaces: cxPayloads() } });
		await waitFor(() => expect(h1()).toContain("Ledger"));
		const tree = within(document.querySelector("nav.tree") as HTMLElement);
		const up = tree.getByRole("link", { name: "All workspaces" });
		expect(up).toHaveAttribute("href", "#");
		expect(tree.getByRole("link", { name: "Team A" })).toHaveAttribute(
			"href",
			"#/workspaces/a.json",
		);
		await fireEvent.click(up);
		await waitFor(() => expect(h1()).toContain("Workspaces"));
	});
});

describe("one file in a set", () => {
	it("keeps the routes a single workspace has always had", async () => {
		const [only] = cxPayloads();
		at(modelRefToHash("#/boundedcontexts/ledger"));
		render(App, { initial: { workspaces: [only] } });
		await waitFor(() => expect(h1()).toContain("Ledger"));
		expect(document.querySelector("nav.tree")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: "All workspaces" })).toBeNull();
		const hrefs = [
			...document.querySelectorAll<HTMLAnchorElement>("a.ref"),
		].map((a) => a.getAttribute("href"));
		expect(hrefs.every((h) => !h?.startsWith("#/workspaces/"))).toBe(true);
		expect(linksTo("#/boundedcontexts/risk").length).toBeGreaterThan(0);
	});

	it("goes straight to the file when it is the only thing handed in", async () => {
		const [only] = cxPayloads();
		render(App, { initial: { workspaces: [only] } });
		await waitFor(() => expect(h1()).toContain("Team A"));
	});
});

describe("file names that need encoding", () => {
	const a = side("Team A");
	const b = side("Team B");
	const set = WorkspaceSet.fromWorkspaces([
		["a#%.json", a.ws],
		["ü/my team.json", b.ws],
	]);
	const NAMES: Array<[string, Workspace, string]> = [
		["a#%.json", a.ws, "Team A"],
		["ü/my team.json", b.ws, "Team B"],
	];

	it.each(NAMES)(
		"reaches %s from the address bar and from the link to it",
		async (file, ws, name) => {
			const route = `#/workspaces/${encodeURIComponent(
				encodeURIComponent(file).replace(/%2F/g, "~1"),
			)}/boundedcontexts/ledger`;
			const expected = modelRefToHash(
				routeOf(ws.boundedcontexts.get("ledger") as never),
			);
			expect(route.replace(/~1/g, "~1")).toBeTruthy();
			at(expected);
			render(App, { initial: { workspaces: payloadsOf(set) } });
			await waitFor(() => expect(h1()).toContain("Ledger"));
			expect(document.querySelector(".crumbs")?.textContent).toContain(name);
			// The link back to the file's own page carries the same encoding.
			const crumb = within(
				document.querySelector(".crumbs") as HTMLElement,
			).getByRole("link", { name });
			expect(crumb.getAttribute("href")).toBe(
				modelRefToHash(`#/workspaces/${crumb.dataset.ref?.split("/")[2]}`),
			);
			expect(location.hash).toBe(expected);
		},
	);

	it("writes a#%.json as one encoded segment in the address and as the same file in the model route", () => {
		expect(routeOf(a.ledger)).toBe(
			"#/workspaces/a%23%25.json/boundedcontexts/ledger",
		);
		expect(modelRefToHash(routeOf(a.ledger))).toBe(
			"#/workspaces/a%2523%2525.json/boundedcontexts/ledger",
		);
		expect(routeOf(b.ledger)).toBe(
			"#/workspaces/%C3%BC~1my%20team.json/boundedcontexts/ledger",
		);
	});
});

describe("a set handed over by the extension", () => {
	/** A fresh embedded app, as App.test does it, so `./host` reads the stubbed bridge. */
	async function embedded() {
		const api = { postMessage: vi.fn() };
		vi.stubGlobal("acquireVsCodeApi", () => api);
		vi.resetModules();
		const [mod, testing] = await Promise.all([
			import("./App.svelte"),
			import("@testing-library/svelte"),
		]);
		return {
			App: mod.default,
			render: testing.render,
			api,
			waitFor: testing.waitFor,
		};
	}
	const post = (msg: HostMessage) =>
		window.dispatchEvent(new MessageEvent("message", { data: msg }));
	const pair = linkedPair();

	it("shows the page of the file the route names and reports every navigation as a route that names its file", async () => {
		const { App, render: mount, api, waitFor: wait } = await embedded();
		const view = mount(App, {
			initial: { workspaces: [] } satisfies Bootstrap,
		});
		post({
			type: "model",
			workspaces: cxPayloads(),
			ref: routeOf(pair.b.ledger),
			reset: true,
		});
		await wait(() =>
			expect(document.querySelector(".crumbs")?.textContent).toContain(
				"Team B",
			),
		);
		expect(api.postMessage).toHaveBeenCalledWith({
			type: "navigated",
			ref: routeOf(pair.b.ledger),
		});
		post({ type: "navigate", ref: routeOf(pair.a.ledger) });
		await wait(() =>
			expect(document.querySelector(".crumbs")?.textContent).toContain(
				"Team A",
			),
		);
		expect(api.postMessage).toHaveBeenCalledWith({
			type: "navigated",
			ref: routeOf(pair.a.ledger),
		});
		post({ type: "toolbar", action: "reveal" });
		expect(api.postMessage).toHaveBeenCalledWith({
			type: "reveal",
			ref: routeOf(pair.a.ledger),
		});
		view.unmount();
	});

	it("draws no sidebar of its own: the extension's tree is the navigation", async () => {
		const { App, render: mount, waitFor: wait } = await embedded();
		const view = mount(App, { initial: { workspaces: [] } });
		post({
			type: "model",
			workspaces: cxPayloads(),
			ref: routeOf(pair.a.ledger),
			reset: true,
		});
		await wait(() =>
			expect(document.querySelector("main h1")).toBeInTheDocument(),
		);
		expect(document.querySelector("nav.tree")).toBeNull();
		view.unmount();
	});
});

describe("NorthBank as the twelve files it is", () => {
	it("opens on the set's page with all twelve files and nineteen contexts on the map", async () => {
		render(App, { initial: { workspaces: northbankPayloads() } });
		await waitFor(() => expect(h1()).toContain("12 files"));
		expect(document.querySelectorAll("#workspaces tbody tr")).toHaveLength(12);
		await waitFor(() =>
			expect(document.querySelectorAll(".context-node").length).toBe(19),
		);
	});
});

describe("a file left out of a set", () => {
	it("is named on the page of every file that is in it, with what to do, not only on the set's own page", async () => {
		const [a, b] = cxPayloads();
		const loaded = [
			a,
			{
				schema: [1, 2],
				fileLabel: "broken.json",
				path: "broken.json",
				set: "cx",
			},
		];
		expect(b.path).toBe("b.json");
		at(modelRefToHash("#/boundedcontexts/ledger"));
		render(App, { initial: { workspaces: loaded } });
		await waitFor(() => expect(h1()).toContain("Ledger"));
		const notice = document.querySelector(
			'[data-notice="excluded"]',
		) as HTMLElement;
		expect(notice.textContent).toContain("broken.json is not a workspace file");
		expect(notice.textContent).toContain(
			"Fix it, or leave the file out of the folder.",
		);
	});
});

describe("a set with nothing in it", () => {
	it("opens on the set's page and says why each file was left out", async () => {
		render(App, {
			initial: {
				workspaces: [
					{ schema: [], fileLabel: "x.json", path: "x.json", set: "s" },
					{ schema: 5, fileLabel: "y.json", path: "y.json", set: "s" },
				],
			},
		});
		await waitFor(() => expect(h1()).toContain("Workspaces"));
		expect(h1()).toContain("0 files");
		expect(screen.getAllByRole("alert")).toHaveLength(2);
		expect(screen.getByText("No workspace file loaded.")).toBeInTheDocument();
	});
});

describe("a set and a workspace alone in one bootstrap", () => {
	it("shows the picker, which lists the set as one entry and opens it on the set's page", async () => {
		const [solo] = cxPayloads();
		render(App, {
			initial: {
				workspaces: [
					{ schema: solo.schema, fileLabel: "solo.json" },
					...cxPayloads(),
				],
			},
		});
		const picks = screen.getAllByRole("link");
		expect(picks.map((l) => l.textContent?.trim())).toEqual([
			"Team A",
			"2 workspaces",
		]);
		await fireEvent.click(picks[1]);
		await waitFor(() => expect(h1()).toContain("2 files"));
	});
});

describe("a set imported in the viewer", () => {
	it("opens several files picked together as the set, complete: no notice that others may be out of view", async () => {
		render(App, {});
		const files = ["b.json", "a.json"].map(
			(name) =>
				new File([JSON.stringify({ name })], name, {
					type: "application/json",
				}),
		);
		await fireEvent.change(document.getElementById("files") as HTMLElement, {
			target: { files },
		});
		await waitFor(() => expect(h1()).toContain("2 files"));
		expect(
			[...document.querySelectorAll("#workspaces tbody tr")].map(
				(r) => r.querySelector("code")?.textContent,
			),
		).toEqual(["a.json", "b.json"]);
		expect(document.querySelector('[data-notice="incomplete"]')).toBeNull();
		// An import the reader asked for puts focus on the heading.
		await waitFor(() =>
			expect(document.activeElement).toBe(document.querySelector("main h1")),
		);
	});

	it("opens files read by URL with the notice that others may be out of view, on the set's page and on each file's", async () => {
		const root = "https://h.test/p/.ods/";
		const a = {
			name: "A",
			boundedcontexts: {
				x: {
					consumes: [
						{
							consumable: {
								$ref: "b.json#/boundedcontexts/y/services/s/provides/p",
							},
						},
					],
				},
			},
		};
		const files: Record<string, unknown> = {
			[`${root}a.json`]: a,
			[`${root}b.json`]: { name: "B" },
		};
		vi.stubGlobal(
			"fetch",
			vi.fn(async (url: string) =>
				url in files
					? { ok: true, json: async () => files[url] }
					: { ok: false, status: 404 },
			),
		);
		history.replaceState(
			null,
			"",
			`/?url=${encodeURIComponent(`${root}a.json`)}`,
		);
		render(App, {});
		await waitFor(() => expect(h1()).toContain("2 files"));
		const notice = document.querySelector(
			'[data-notice="incomplete"]',
		) as HTMLElement;
		expect(notice.getAttribute("role")).toBe("status");
		expect(notice.textContent).toContain(
			"2 workspaces reached from the addresses given",
		);
		location.hash = "#/workspaces/a.json";
		await waitFor(() => expect(h1()).toContain("A"));
		expect(
			document.querySelector('[data-notice="incomplete"]')?.textContent,
		).toContain("are not discoverable by URL");
	});
});
