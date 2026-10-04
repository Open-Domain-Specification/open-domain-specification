import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import petstore from "../../../../models/petstore/.ods/petstore.json";
import { modelRefToHash } from "../lib/ref-transport";
import type {
	Bootstrap,
	HostMessage,
	ShellMessage,
	WorkspacePayload,
} from "../protocol";
import App from "./App.svelte";

function payload(fileLabel = "petstore.json"): WorkspacePayload {
	return { schema: petstore, fileLabel };
}

function post(msg: HostMessage) {
	window.dispatchEvent(new MessageEvent("message", { data: msg }));
}

const CATALOG = "#/boundedcontexts/catalog_bc";
const CATALOG_HASH = modelRefToHash(CATALOG);
const PET = "#/boundedcontexts/catalog_bc/aggregates/pet";

const h1 = () => document.querySelector("main h1") as HTMLElement;
const heading = () => h1()?.textContent ?? "";

/** Lets jsdom raise the events for a hash change before the next step. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 30));

/** What the app tells its shell about the history, in order. */
const listeners: EventListener[] = [];
function shellMessages() {
	const told: ShellMessage[] = [];
	const onMessage = ((e: MessageEvent) => {
		if (e.data?.type === "history") told.push(e.data);
	}) as EventListener;
	listeners.push(onMessage);
	window.addEventListener("message", onMessage);
	return told;
}

function resetLocation() {
	history.replaceState(null, "", "/");
}

// An app mounted through `embeddedApp` is not cleaned up by the testing
// library the test file imported, so each is unmounted here. One left
// listening would answer the next test's messages as well as its own.
const mounted: (() => void)[] = [];

afterEach(() => {
	for (const unmount of mounted.splice(0)) unmount();
	for (const l of listeners.splice(0)) window.removeEventListener("message", l);
	resetLocation();
	vi.unstubAllGlobals();
});

/**
 * A fresh, VS Code-embedded App, isolated via `resetModules` so `./host`
 * re-reads the (stubbed) global. `@testing-library/svelte` is re-imported
 * from the same fresh registry too, so it shares the same `svelte` runtime
 * instance as the freshly loaded component (otherwise mounting throws
 * `effect_orphan` from the mismatched component-context internals).
 */
async function embeddedApp() {
	const api = { postMessage: vi.fn() };
	vi.stubGlobal("acquireVsCodeApi", () => api);
	vi.resetModules();
	const [mod, testingLibrary] = await Promise.all([
		import("./App.svelte"),
		import("@testing-library/svelte"),
	]);
	const renderTracked: typeof testingLibrary.render = ((...args: unknown[]) => {
		const rendered = (
			testingLibrary.render as (...a: unknown[]) => { unmount(): void }
		)(...args);
		// Idempotent, so a test may unmount its own app before this does.
		const unmount = rendered.unmount;
		let done = false;
		rendered.unmount = () => {
			if (done) return;
			done = true;
			unmount();
		};
		mounted.push(rendered.unmount);
		return rendered;
	}) as typeof testingLibrary.render;
	return { App: mod.default, api, render: renderTracked };
}

describe("App (standalone host)", () => {
	it("moves focus to the workspace heading after an import the reader asked for, and not for a deep link", async () => {
		const file = new File([JSON.stringify(petstore)], "petstore.json", {
			type: "application/json",
		});
		const { unmount } = render(App, {});
		await fireEvent.change(document.getElementById("file") as HTMLElement, {
			target: { files: [file] },
		});
		await waitFor(() =>
			expect(document.activeElement).toBe(document.querySelector("main h1")),
		);
		unmount();
		document.body.focus();

		history.replaceState(null, "", "/?url=https://example.com/petstore.json");
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => petstore }),
		);
		render(App, {});
		await waitFor(() =>
			expect(document.querySelector("main h1")).toBeInTheDocument(),
		);
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(document.activeElement).toBe(document.body);
	});

	it("renders the workspace page with a sidebar for a single workspace", async () => {
		const initial: Bootstrap = { workspaces: [payload()] };
		render(App, { initial });
		await waitFor(() =>
			expect(document.querySelector("nav.tree")).toBeInTheDocument(),
		);
		expect(document.querySelector(".site")).not.toHaveClass("embedded");
		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
	});

	it("puts a skip link first in the Tab order, to the route being read, and leaves the route alone when used", async () => {
		history.replaceState(null, "", "/#/boundedcontexts/sales_bc");
		const initial: Bootstrap = { workspaces: [payload()] };
		render(App, { initial });
		await waitFor(() =>
			expect(document.querySelector("nav.tree")).toBeInTheDocument(),
		);
		const skip = screen.getByRole("link", { name: "Skip to content" });
		const stops = document.querySelectorAll<HTMLElement>("a[href], button");
		expect(stops[0]).toBe(skip);
		expect(skip).toHaveAttribute("href", "#/boundedcontexts/sales_bc");
		skip.focus();
		await fireEvent.click(skip);
		expect(document.activeElement).toBe(document.querySelector("main h1"));
		expect(location.hash).toBe("#/boundedcontexts/sales_bc");
	});

	it("tells no shell about its history, since only the extension has one", async () => {
		const told = shellMessages();
		render(App, { initial: { workspaces: [payload()] } });
		await waitFor(() =>
			expect(document.querySelector("nav.tree")).toBeInTheDocument(),
		);
		await settle();
		expect(told).toEqual([]);
	});

	it("shows a workspace picker for more than one workspace, and switches to it on pick", async () => {
		const initial: Bootstrap = {
			workspaces: [payload("a.json"), payload("b.json")],
		};
		render(App, { initial });
		expect(screen.getByText("Domain Model")).toBeInTheDocument();
		expect(document.querySelector("nav.tree")).not.toBeInTheDocument();

		const link = screen.getAllByRole("link")[0];
		await fireEvent.click(link);
		await waitFor(() =>
			expect(document.querySelector("nav.tree")).toBeInTheDocument(),
		);
	});

	it("shows the import screen when there is no workspace and it isn't embedded", () => {
		render(App, {});
		expect(
			screen.getByRole("heading", { name: /open a workspace/i }),
		).toBeInTheDocument();
	});

	it("passes the host's examples to the import screen", () => {
		render(App, {
			initial: {
				examples: [{ name: "Petstore", url: "https://example.com/p.json" }],
			},
		});
		expect(
			screen.getByRole("button", { name: /Petstore/ }),
		).toBeInTheDocument();
	});

	it("switches to the workspace page once the import screen loads a schema", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => petstore }),
		);
		render(App, {});
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/petstore.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(document.querySelector("nav.tree")).toBeInTheDocument(),
		);
	});

	it("navigates to initial.ref on mount", async () => {
		const initial: Bootstrap = { workspaces: [payload()], ref: "#/x" };
		render(App, { initial });
		await waitFor(() => expect(location.hash).toBe(modelRefToHash("#/x")));
	});

	it("does not touch the hash when initial.ref is absent", async () => {
		resetLocation();
		const initial: Bootstrap = { workspaces: [payload()] };
		render(App, { initial });
		await waitFor(() =>
			expect(document.querySelector("nav.tree")).toBeInTheDocument(),
		);
		expect(location.hash).toBe("");
	});
});

/**
 * A phone-width window: `(max-width: 900px)` reads `narrow` until the spy is
 * restored, and `cross` flips it and tells every listener, as the browser does
 * when the window is resized across the breakpoint. Every other query matches
 * nothing and has nobody to tell.
 */
function viewport(narrow: boolean) {
	const listeners = new Set<(event: MediaQueryListEvent) => void>();
	let matches = narrow;
	vi.spyOn(window, "matchMedia").mockImplementation((media) => {
		const ours = media === "(max-width: 900px)";
		return {
			get matches() {
				return ours && matches;
			},
			media,
			addEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => {
				if (ours) listeners.add(l);
			},
			removeEventListener: (_: string, l: (e: MediaQueryListEvent) => void) => {
				if (ours) listeners.delete(l);
			},
			// biome-ignore lint/suspicious/noExplicitAny: minimal test stand-in
		} as any;
	});
	return {
		listeners,
		async cross(next: boolean) {
			matches = next;
			for (const l of listeners) l({ matches: next } as MediaQueryListEvent);
			await settle();
		},
	};
}

describe("App (embedded in VS Code)", () => {
	it('shows "Workspace not loaded" and announces readiness', async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		expect(screen.getByText("Workspace not loaded.")).toBeInTheDocument();
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
	});

	it("renders the page without a sidebar and posts navigated on hash change", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		const initial: Bootstrap = { workspaces: [payload()] };
		renderEmbedded(EmbeddedApp, { initial });
		await waitFor(() =>
			expect(document.querySelector(".site")).toHaveClass("embedded"),
		);
		expect(document.querySelector("nav.tree")).not.toBeInTheDocument();
		// The webview has no tree to skip, so its first stop stays the host's toolbar.
		expect(
			screen.queryByRole("link", { name: "Skip to content" }),
		).not.toBeInTheDocument();
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({
				type: "navigated",
				ref: "#",
			}),
		);
	});

	it("handles a toolbar message by posting the action back with the current ref", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		const initial: Bootstrap = { workspaces: [payload()] };
		renderEmbedded(EmbeddedApp, { initial });
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "toolbar", action: "reveal" });
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({
				type: "reveal",
				ref: "#",
			}),
		);
	});

	it("handles a navigate message by moving the router", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "navigate", ref: "#/y" });
		await waitFor(() => expect(location.hash).toBe(modelRefToHash("#/y")));
	});

	it("answers a probe with the links and images inside rendered descriptions only", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		const schema = {
			...petstore,
			description:
				"[safe](https://example.com/a) [unsafe](javascript:alert(1)) ![pic](https://example.com/p.png) ![gone](data:image/png;base64,AAAA)",
		};
		renderEmbedded(EmbeddedApp, {
			initial: { workspaces: [{ schema, fileLabel: "x.json" }] },
		});
		const outside = document.createElement("a");
		outside.setAttribute("href", "#/outside");
		document.body.append(outside);
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		await waitFor(() =>
			expect(document.querySelector(".md a[href]")).toBeInTheDocument(),
		);
		post({ type: "probe" });
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({
				type: "rendered",
				hrefs: ["https://example.com/a"],
				images: ["https://example.com/p.png"],
			}),
		);
		outside.remove();
	});

	it("answers a probe that carries selectors with each match's text, class, title and href", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {
			initial: { workspaces: [payload()] },
		});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		await waitFor(() =>
			expect(document.querySelector(".site")).toBeInTheDocument(),
		);
		const marked = document.createElement("a");
		marked.className = "probe-target one";
		marked.setAttribute("title", "a title");
		marked.setAttribute("href", "#/somewhere");
		marked.textContent = "first";
		const bare = document.createElement("span");
		bare.className = "probe-target";
		document.body.append(marked, bare);
		post({ type: "probe", selectors: [".probe-target", ".nothing-here"] });
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({
				type: "rendered",
				hrefs: expect.any(Array),
				images: expect.any(Array),
				probed: {
					".probe-target": [
						{
							text: "first",
							class: "probe-target one",
							title: "a title",
							href: "#/somewhere",
						},
						{ text: "", class: "probe-target", title: null, href: null },
					],
					".nothing-here": [],
				},
			}),
		);
		marked.remove();
		bare.remove();
	});

	it("handles a model message, loading workspaces and navigating to its ref", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "model", workspaces: [payload()], ref: "#/z" });
		await waitFor(() =>
			expect(document.querySelector(".site")).toBeInTheDocument(),
		);
		await waitFor(() => expect(location.hash).toBe(modelRefToHash("#/z")));
	});

	it("handles a model message without a ref, leaving the route untouched", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "model", workspaces: [payload()] });
		await waitFor(() =>
			expect(document.querySelector(".site")).toBeInTheDocument(),
		);
		expect(location.hash).toBe("");
	});

	it("stops listening for messages once unmounted", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		const { unmount } = renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		const callsBefore = api.postMessage.mock.calls.length;
		unmount();
		post({ type: "navigate", ref: "#/after-unmount" });
		expect(api.postMessage.mock.calls.length).toBe(callsBefore);
	});

	it("has Back and Forward step the pages the host opened, to the exact page and its heading", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "model", workspaces: [payload()], ref: "#", reset: true });
		await waitFor(() => expect(heading()).toContain("Swagger Petstore"));
		post({ type: "navigate", ref: CATALOG });
		post({ type: "navigate", ref: PET });
		await waitFor(() => expect(heading()).toContain("Pet"));
		await settle();
		post({ type: "toolbar", action: "back" });
		await waitFor(() => expect(heading()).toContain("Catalog BC"));
		await waitFor(() => expect(document.activeElement).toBe(h1()));
		post({ type: "toolbar", action: "back" });
		await waitFor(() => expect(heading()).toContain("Swagger Petstore"));
		await waitFor(() => expect(document.activeElement).toBe(h1()));
		expect(location.hash).toBe("");
		post({ type: "toolbar", action: "forward" });
		await waitFor(() => expect(heading()).toContain("Catalog BC"));
		post({ type: "toolbar", action: "forward" });
		await waitFor(() => expect(heading()).toContain("Pet"));
		await waitFor(() => expect(document.activeElement).toBe(h1()));
		// Back and Forward are the router's, not the extension's.
		expect(api.postMessage).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "back" }),
		);
		expect(api.postMessage).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "forward" }),
		);
	});

	it("tells the shell where the history stands, so its buttons are disabled at the ends", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		const told = shellMessages();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "model", workspaces: [payload()], ref: CATALOG, reset: true });
		await waitFor(() => expect(heading().trim()).toMatch(/^Catalog BC\b/));
		await waitFor(() =>
			expect(told.at(-1)).toEqual({
				type: "history",
				canGoBack: false,
				canGoForward: false,
			}),
		);
		post({ type: "navigate", ref: PET });
		// The page is committed first and the shell told in a later task (the
		// effect posts through `window.postMessage`), so each gets its own wait:
		// one wait spanning both can expire between the two on a slow runner.
		await waitFor(() => expect(heading().trim()).toMatch(/^Pet\b/));
		await waitFor(() =>
			expect(told.at(-1)).toEqual({
				type: "history",
				canGoBack: true,
				canGoForward: false,
			}),
		);
		await settle();
		post({ type: "toolbar", action: "back" });
		await waitFor(() => expect(heading().trim()).toMatch(/^Catalog BC\b/));
		await waitFor(() =>
			expect(told.at(-1)).toEqual({
				type: "history",
				canGoBack: false,
				canGoForward: true,
			}),
		);
		// Exactly what the shell was told, with no message dropped, repeated or
		// out of order.
		expect(told).toEqual([
			{ type: "history", canGoBack: false, canGoForward: false },
			{ type: "history", canGoBack: true, canGoForward: false },
			{ type: "history", canGoBack: false, canGoForward: true },
		]);
	});

	it("starts the first page the host shows as the boundary Back cannot pass, even when it is not the workspace", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "model", workspaces: [payload()], ref: CATALOG, reset: true });
		await waitFor(() => expect(heading()).toContain("Catalog BC"));
		post({ type: "toolbar", action: "back" });
		await settle();
		expect(heading()).toContain("Catalog BC");
		expect(location.hash).toBe(modelRefToHash(CATALOG));
	});

	it("does not let Back reach the pages of the workspace it replaced", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({
			type: "model",
			workspaces: [payload("a.json")],
			ref: CATALOG,
			reset: true,
		});
		await waitFor(() => expect(heading()).toContain("Catalog BC"));
		post({ type: "navigate", ref: PET });
		await waitFor(() => expect(heading()).toContain("Pet"));
		await settle();
		post({
			type: "model",
			workspaces: [payload("b.json")],
			ref: "#/teams/orders_team",
			reset: true,
		});
		await waitFor(() => expect(heading()).toContain("Orders Team"));
		post({ type: "toolbar", action: "back" });
		await settle();
		expect(heading()).toContain("Orders Team");
		expect(location.hash).toBe(modelRefToHash("#/teams/orders_team"));
	});

	it("does not let a Back already on its way carry a new workspace to a page of the old one", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		const told = shellMessages();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({
			type: "model",
			workspaces: [payload("a.json")],
			ref: "#",
			reset: true,
		});
		await waitFor(() => expect(heading()).toContain("Swagger Petstore"));
		post({ type: "navigate", ref: CATALOG });
		post({ type: "navigate", ref: PET });
		await waitFor(() => expect(heading()).toContain("Pet"));
		await settle();
		post({ type: "toolbar", action: "back" });
		post({
			type: "model",
			workspaces: [payload("b.json")],
			ref: "#/teams/orders_team",
			reset: true,
		});
		await settle();
		await settle();
		expect(heading()).toContain("Orders Team");
		expect(location.hash).toBe(modelRefToHash("#/teams/orders_team"));
		expect(told.at(-1)).toEqual({
			type: "history",
			canGoBack: false,
			canGoForward: false,
		});
	});

	it("starts a new workspace at its root when the host names no page", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "model", workspaces: [payload()], ref: CATALOG, reset: true });
		await waitFor(() => expect(heading()).toContain("Catalog BC"));
		post({ type: "model", workspaces: [payload()], reset: true });
		await waitFor(() => expect(heading()).toContain("Swagger Petstore"));
		expect(location.hash).toBe("");
	});

	it("keeps the history across a refresh of the same workspace", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		post({ type: "model", workspaces: [payload()], ref: CATALOG, reset: true });
		await waitFor(() => expect(heading()).toContain("Catalog BC"));
		post({ type: "navigate", ref: PET });
		await waitFor(() => expect(heading()).toContain("Pet"));
		post({ type: "model", workspaces: [payload()], ref: PET });
		await settle();
		post({ type: "toolbar", action: "back" });
		await waitFor(() => expect(heading()).toContain("Catalog BC"));
	});

	it("leaves the document alone once unmounted", async () => {
		const {
			App: EmbeddedApp,
			api,
			render: renderEmbedded,
		} = await embeddedApp();
		const { unmount } = renderEmbedded(EmbeddedApp, {});
		await waitFor(() =>
			expect(api.postMessage).toHaveBeenCalledWith({ type: "ready" }),
		);
		unmount();
		const link = document.createElement("a");
		link.setAttribute("href", CATALOG_HASH);
		document.body.append(link);
		// jsdom performs an anchor's default action as a navigation it delivers
		// some tasks later, after this test's cleanup has reset the location, and
		// so into whichever test is running by then. The last listener to see the
		// click reads whether the app claimed it, then claims it itself so that
		// no navigation is ever queued.
		let claimedByApp: boolean | undefined;
		window.addEventListener(
			"click",
			(e) => {
				claimedByApp = e.defaultPrevented;
				e.preventDefault();
			},
			{ once: true },
		);
		const click = new MouseEvent("click", { bubbles: true, cancelable: true });
		link.dispatchEvent(click);
		expect(claimedByApp).toBe(false);
		link.remove();
		await settle();
		expect(location.hash).toBe("");
	});
});

describe("App at phone width", () => {
	afterEach(() => {
		Reflect.deleteProperty(Element.prototype, "scrollIntoView");
	});
	const toggle = () =>
		screen.getByRole("button", { name: "Workspace tree" }) as HTMLButtonElement;
	const treeBox = () => document.getElementById("site-tree") as HTMLElement;
	const link = (ref: string) =>
		document.querySelector(`.site-tree a[data-ref="${ref}"]`) as HTMLElement;

	async function phone(ref = "#", narrow = true) {
		history.replaceState(
			null,
			"",
			ref === "#" ? "/" : `/${modelRefToHash(ref)}`,
		);
		const screen = viewport(narrow);
		render(App, { initial: { workspaces: [payload()] } });
		await waitFor(() =>
			expect(document.querySelector("main h1")).toBeInTheDocument(),
		);
		return screen;
	}

	it("starts with the one tree collapsed behind a disclosure button that comes before the page", async () => {
		await phone();
		const button = toggle();
		// The chevron is decoration: a string name matches the whole of it.
		expect(screen.getByRole("button", { name: "Workspace tree" })).toBe(button);
		expect(
			button.querySelector(".codicon")?.closest("[aria-hidden]"),
		).not.toBeNull();
		expect(button.tagName).toBe("BUTTON");
		expect(button).toHaveAttribute("type", "button");
		expect(button).toHaveAttribute("aria-expanded", "false");
		expect(button).toHaveAttribute("aria-controls", "site-tree");
		expect(treeBox()).toBeInTheDocument();
		expect(treeBox()).toHaveAttribute("hidden");
		expect(treeBox()).not.toBeVisible();
		expect(document.querySelectorAll("nav.tree")).toHaveLength(1);
		// Reading order and visual order agree: nav, button, then the page.
		const main = document.querySelector("main") as HTMLElement;
		expect(
			button.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();
		expect(
			(document.querySelector(".site-nav") as HTMLElement).nextElementSibling,
		).toBe(document.querySelector(".site-page"));
	});

	it("opens and closes the same tree when the button is pressed, never adding a second", async () => {
		await phone();
		fireEvent.click(toggle());
		await waitFor(() =>
			expect(toggle()).toHaveAttribute("aria-expanded", "true"),
		);
		expect(treeBox()).toBeVisible();
		expect(treeBox()).toContainElement(document.querySelector("nav.tree"));
		expect(document.querySelectorAll("nav.tree")).toHaveLength(1);
		fireEvent.click(toggle());
		await waitFor(() =>
			expect(toggle()).toHaveAttribute("aria-expanded", "false"),
		);
		expect(treeBox()).not.toBeVisible();
		expect(document.querySelectorAll("nav.tree")).toHaveLength(1);
	});

	it("closes on Escape from the button and from inside the tree, and puts focus on the button", async () => {
		await phone();
		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		toggle().focus();
		await fireEvent.keyDown(toggle(), { key: "Escape" });
		expect(toggle()).toHaveAttribute("aria-expanded", "false");
		expect(treeBox()).not.toBeVisible();
		expect(document.activeElement).toBe(toggle());

		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		const row = link("#/boundedcontexts/catalog_bc");
		row.focus();
		const esc = new KeyboardEvent("keydown", {
			key: "Escape",
			bubbles: true,
			cancelable: true,
		});
		row.dispatchEvent(esc);
		await settle();
		expect(esc.defaultPrevented).toBe(true);
		expect(treeBox()).not.toBeVisible();
		expect(document.activeElement).toBe(toggle());
	});

	it("leaves Escape and every other key alone while the tree is closed or the key is not Escape", async () => {
		await phone();
		toggle().focus();
		const esc = new KeyboardEvent("keydown", {
			key: "Escape",
			bubbles: true,
			cancelable: true,
		});
		toggle().dispatchEvent(esc);
		expect(esc.defaultPrevented).toBe(false);
		expect(document.activeElement).toBe(toggle());

		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		await fireEvent.keyDown(toggle(), { key: "a" });
		expect(toggle()).toHaveAttribute("aria-expanded", "true");
		expect(treeBox()).toBeVisible();
	});

	it("closes on choosing a row, goes to that page, and leaves focus to the page heading", async () => {
		await phone();
		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		link("#/boundedcontexts/catalog_bc").focus();
		fireEvent.click(link("#/boundedcontexts/catalog_bc"));
		await waitFor(() => expect(heading()).toContain("Catalog BC"));
		expect(location.hash).toBe(CATALOG_HASH);
		expect(toggle()).toHaveAttribute("aria-expanded", "false");
		expect(treeBox()).not.toBeVisible();
		await waitFor(() => expect(document.activeElement).toBe(h1()));
		// The route went into history: Back returns to the page before, which is current.
		history.back();
		await waitFor(() => expect(location.hash).not.toBe(CATALOG_HASH));
	});

	/**
	 * Clicks a row as a reader's pointer would and reports whether the app had
	 * claimed the click by the time it finished bubbling. The last listener then
	 * claims it too, so that jsdom never queues the anchor's own navigation, which
	 * it would deliver into a later test.
	 */
	function press(ref: string, init: MouseEventInit = {}) {
		let claimedByApp: boolean | undefined;
		const last = (e: Event) => {
			claimedByApp = e.defaultPrevented;
			e.preventDefault();
		};
		window.addEventListener("click", last, { once: true });
		fireEvent.click(link(ref), init);
		window.removeEventListener("click", last);
		return claimedByApp;
	}

	it.each([
		["Control", { ctrlKey: true }],
		["Meta", { metaKey: true }],
		["Shift", { shiftKey: true }],
		["Alt", { altKey: true }],
		["a middle-button press", { button: 1 }],
	] as [string, MouseEventInit][])(
		"keeps the tree open, the page and the focused row where they were, for %s on a row the router does not take",
		async (_name, init) => {
			await phone();
			fireEvent.click(toggle());
			await waitFor(() => expect(treeBox()).toBeVisible());
			const row = link("#/boundedcontexts/catalog_bc");
			row.focus();
			const before = heading();
			expect(press("#/boundedcontexts/catalog_bc", init)).toBe(false);
			await settle();
			expect(toggle()).toHaveAttribute("aria-expanded", "true");
			expect(treeBox()).toBeVisible();
			expect(location.hash).toBe("");
			expect(heading()).toBe(before);
			expect(document.activeElement).toBe(row);
			expect(row).toBeVisible();
		},
	);

	it("closes the tree and lands focus on the heading when the row chosen is the page already open", async () => {
		await phone(CATALOG);
		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		const row = link(CATALOG);
		row.focus();
		expect(press(CATALOG)).toBe(true);
		await waitFor(() =>
			expect(toggle()).toHaveAttribute("aria-expanded", "false"),
		);
		expect(treeBox()).not.toBeVisible();
		expect(location.hash).toBe(CATALOG_HASH);
		await waitFor(() => expect(document.activeElement).toBe(h1()));
	});

	it("closes the tree for a plain press on another page's row, which the router takes", async () => {
		await phone(CATALOG);
		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		link(PET).focus();
		expect(press(PET)).toBe(true);
		await waitFor(() => expect(heading()).toContain("Pet"));
		expect(toggle()).toHaveAttribute("aria-expanded", "false");
		expect(treeBox()).not.toBeVisible();
		expect(location.hash).toBe(modelRefToHash(PET));
		await waitFor(() => expect(document.activeElement).toBe(h1()));
	});

	it("stays open when the reader presses in the tree's own space rather than on a row", async () => {
		await phone();
		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		fireEvent.click(treeBox());
		expect(toggle()).toHaveAttribute("aria-expanded", "true");
		expect(treeBox()).toBeVisible();
	});

	/** Gives the tree a 66px scroller of its own over 22px rows, and records what moves it. */
	function scrollableTree() {
		const box = treeBox();
		box.style.overflowY = "auto";
		Object.defineProperty(box, "clientHeight", { value: 66 });
		const rect = (top: number, bottom: number) =>
			({ top, bottom, height: bottom - top }) as DOMRect;
		box.getBoundingClientRect = () => rect(0, 66);
		const rows = () => [...box.querySelectorAll(".item")];
		const native = Element.prototype.getBoundingClientRect;
		vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
			function (this: Element) {
				if (!this.matches(".item")) return native.call(this);
				const i = rows().indexOf(this);
				return rect(i * 22 - box.scrollTop, (i + 1) * 22 - box.scrollTop);
			},
		);
		const scrolls: ScrollToOptions[] = [];
		box.scrollTo = ((o: ScrollToOptions) => {
			scrolls.push(o);
			box.scrollTop = o.top ?? 0;
		}) as typeof box.scrollTo;
		const intoView = vi.fn();
		Element.prototype.scrollIntoView = intoView;
		const documentScroll = vi.spyOn(window, "scrollTo");
		return { box, scrolls, intoView, documentScroll };
	}

	it("brings the current row into the tree's own scroller when it opens, and scrolls nothing else", async () => {
		await phone(PET);
		const { box, scrolls, intoView, documentScroll } = scrollableTree();

		fireEvent.click(toggle());
		await waitFor(() => expect(scrolls).toHaveLength(1));
		const row = link(PET).closest(".item") as HTMLElement;
		expect(row.getBoundingClientRect().bottom).toBe(66);
		expect(scrolls[0].behavior).toBe("auto");
		expect(box.scrollTop).toBeGreaterThan(0);
		expect(intoView).not.toHaveBeenCalled();
		expect(documentScroll).not.toHaveBeenCalled();
	});

	it("shows the current row in the sidebar's scroller when the window widens, and puts a focus that lost its button on that row", async () => {
		const view = await phone(PET);
		const { box, scrolls, intoView, documentScroll } = scrollableTree();
		toggle().focus();
		// The disclosure was never opened, so the tree has not been scrolled to the row.
		expect(scrolls).toHaveLength(0);
		await view.cross(false);
		const row = link(PET).closest(".item") as HTMLElement;
		expect(scrolls).toHaveLength(1);
		expect(row.getBoundingClientRect().bottom).toBe(66);
		expect(box.scrollTop).toBeGreaterThan(0);
		expect(document.activeElement).toBe(link(PET));
		expect(intoView).not.toHaveBeenCalled();
		expect(documentScroll).not.toHaveBeenCalled();
	});

	it("shows the current row on widening without moving a focus that was elsewhere", async () => {
		const view = await phone(PET);
		const { scrolls } = scrollableTree();
		h1().tabIndex = -1;
		h1().focus();
		await view.cross(false);
		expect(scrolls).toHaveLength(1);
		expect(document.activeElement).toBe(h1());
	});

	/**
	 * The layout's own transitions as the browser reports them: with less motion
	 * asked for, crossing the breakpoint starts hundredth-of-a-millisecond
	 * transitions on the sidebar, which finish a frame after the change event.
	 * `finish` ends them.
	 */
	function layoutTransitions() {
		let finish: () => void = () => {};
		const finished = new Promise<Animation>((resolve) => {
			finish = () => resolve({} as Animation);
		});
		const getAnimations = vi.fn(() => [{ finished } as Animation]);
		(document.querySelector(".site-nav") as HTMLElement).getAnimations =
			getAnimations;
		return { finish, getAnimations };
	}

	it("waits for the layout's own transitions to land before it shows the current row in the sidebar", async () => {
		const view = await phone(PET);
		const { scrolls } = scrollableTree();
		const { finish, getAnimations } = layoutTransitions();
		await view.cross(false);
		expect(getAnimations).toHaveBeenCalledWith({ subtree: true });
		// The sidebar is still being restyled: nothing has been placed against it yet.
		expect(scrolls).toHaveLength(0);
		finish();
		await settle();
		expect(scrolls).toHaveLength(1);
		expect(
			(link(PET).closest(".item") as HTMLElement).getBoundingClientRect()
				.bottom,
		).toBe(66);
	});

	it("does not show the row in the sidebar if the window narrowed again while it waited", async () => {
		const view = await phone(PET);
		const { scrolls } = scrollableTree();
		const { finish } = layoutTransitions();
		await view.cross(false);
		await view.cross(true);
		finish();
		await settle();
		expect(scrolls).toHaveLength(0);
		expect(toggle()).toHaveAttribute("aria-expanded", "false");
	});

	it("keeps a reader's focus on their own row without scrolling while the layout settles", async () => {
		const view = await phone(PET);
		scrollableTree();
		const { finish } = layoutTransitions();
		toggle().focus();
		const focus = vi.spyOn(HTMLElement.prototype, "focus");
		await view.cross(false);
		expect(document.activeElement).toBe(link(PET));
		expect(focus).toHaveBeenCalledWith({ preventScroll: true });
		finish();
		await settle();
		expect(document.activeElement).toBe(link(PET));
	});

	it("has nothing to bring into view for a page with no row on its path, such as the workspace", async () => {
		await phone("#");
		const box = treeBox();
		box.style.overflowY = "auto";
		box.scrollTo = vi.fn() as typeof box.scrollTo;
		fireEvent.click(toggle());
		await waitFor(() =>
			expect(toggle()).toHaveAttribute("aria-expanded", "true"),
		);
		expect(box.scrollTo).not.toHaveBeenCalled();
	});

	it("opens without scrolling anything when the tree has no scroller of its own to move", async () => {
		await phone(PET);
		const intoView = vi.fn();
		Element.prototype.scrollIntoView = intoView;
		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		expect(intoView).not.toHaveBeenCalled();
	});

	it("shows the persistent tree and no button above the breakpoint, and leaves the page's focus alone", async () => {
		await phone("#", false);
		expect(
			screen.queryByRole("button", { name: "Workspace tree" }),
		).not.toBeInTheDocument();
		expect(treeBox()).toBeVisible();
		expect(treeBox()).not.toHaveAttribute("hidden");
		expect(document.querySelectorAll("nav.tree")).toHaveLength(1);
		expect(document.activeElement).toBe(document.body);
	});

	it("crossing the breakpoint changes the layout without stealing a focus that is not in the hidden tree", async () => {
		const view = await phone();
		h1().tabIndex = -1;
		h1().focus();
		await view.cross(false);
		expect(
			screen.queryByRole("button", { name: "Workspace tree" }),
		).not.toBeInTheDocument();
		expect(treeBox()).toBeVisible();
		expect(document.activeElement).toBe(h1());
		await view.cross(true);
		expect(toggle()).toHaveAttribute("aria-expanded", "false");
		expect(treeBox()).not.toBeVisible();
		expect(document.activeElement).toBe(h1());
	});

	it("crossing to a wide window leaves a focused row where it is, and the tree visible whatever the disclosure said", async () => {
		const view = await phone();
		fireEvent.click(toggle());
		await waitFor(() => expect(treeBox()).toBeVisible());
		const row = link("#/boundedcontexts/catalog_bc");
		row.focus();
		await view.cross(false);
		expect(treeBox()).toBeVisible();
		expect(document.activeElement).toBe(row);
		// Narrow again: collapsed as at load, not left open from before.
		await view.cross(true);
		expect(toggle()).toHaveAttribute("aria-expanded", "false");
	});

	it("moves focus from the vanished button to the tree when the window widens, so it is not lost", async () => {
		const view = await phone();
		toggle().focus();
		await view.cross(false);
		const first = document.querySelector(".site-tree a") as HTMLElement;
		expect(document.activeElement).toBe(first);
		expect(treeBox()).toContainElement(document.activeElement as HTMLElement);
	});

	it("never leaves focus on the hidden tree when the window narrows under a reader in it", async () => {
		const view = await phone("#", false);
		const row = link("#/boundedcontexts/catalog_bc");
		row.focus();
		expect(document.activeElement).toBe(row);
		await view.cross(true);
		expect(treeBox()).not.toBeVisible();
		expect(document.activeElement).toBe(toggle());
	});

	it("stops listening for the breakpoint when it is unmounted", async () => {
		const view = viewport(true);
		history.replaceState(null, "", "/");
		const { unmount } = render(App, { initial: { workspaces: [payload()] } });
		await waitFor(() =>
			expect(document.querySelector("main h1")).toBeInTheDocument(),
		);
		expect(view.listeners.size).toBe(1);
		unmount();
		expect(view.listeners.size).toBe(0);
	});

	it("draws neither the button nor the tree inside the extension's webview", async () => {
		viewport(true);
		const { App: EmbeddedApp, render: renderEmbedded } = await embeddedApp();
		renderEmbedded(EmbeddedApp, { initial: { workspaces: [payload()] } });
		await waitFor(() =>
			expect(document.querySelector(".site")).toHaveClass("embedded"),
		);
		expect(
			screen.queryByRole("button", { name: "Workspace tree" }),
		).not.toBeInTheDocument();
		expect(document.getElementById("site-tree")).toBeNull();
		expect(document.querySelector("nav.tree")).toBeNull();
	});
});
