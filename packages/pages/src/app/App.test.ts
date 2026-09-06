import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import petstore from "../../../../models/petstore/.ods/petstore.json";
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
	it("renders the workspace page with a sidebar for a single workspace", async () => {
		const initial: Bootstrap = { workspaces: [payload()] };
		render(App, { initial });
		await waitFor(() =>
			expect(document.querySelector("nav.tree")).toBeInTheDocument(),
		);
		expect(document.querySelector(".site")).not.toHaveClass("embedded");
		expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
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
		await waitFor(() => expect(location.hash).toBe("#/x"));
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
		await waitFor(() => expect(location.hash).toBe("#/y"));
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
		await waitFor(() => expect(location.hash).toBe("#/z"));
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
