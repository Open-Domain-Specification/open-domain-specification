import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import petstore from "../../../../models/petstore/.ods/petstore.json";
import { modelRefToHash } from "../lib/ref-transport";
import type { Bootstrap, HostMessage, WorkspacePayload } from "../protocol";
import App from "./App.svelte";

function payload(fileLabel = "petstore.json"): WorkspacePayload {
	return { schema: petstore, fileLabel };
}

function post(msg: HostMessage) {
	window.dispatchEvent(new MessageEvent("message", { data: msg }));
}

function resetLocation() {
	history.replaceState(null, "", "/");
}

afterEach(() => {
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
	return { App: mod.default, api, render: testingLibrary.render };
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
});
