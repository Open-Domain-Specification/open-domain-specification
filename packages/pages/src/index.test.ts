import { describe, expect, it } from "vitest";
import * as pages from "./index";
import type {
	Bootstrap,
	HostMessage,
	WebviewMessage,
	WorkspacePayload,
} from "./protocol";

describe("package entry point", () => {
	it("re-exports the public API", () => {
		expect(pages.dotToSvg).toBeTypeOf("function");
		expect(pages.resolvePage).toBeTypeOf("function");
		expect(pages.pageRefs).toBeTypeOf("function");
		expect(pages.consumableIcon).toBeTypeOf("function");
		expect(pages.ICONS).toBeTypeOf("object");
		expect(pages.RELATIONSHIP).toBeTypeOf("object");
		expect(pages.SUBDOMAIN_TYPE).toBeTypeOf("object");
		expect(pages.SERVICE_TYPE).toBeTypeOf("object");
	});

	it("carries the host/webview protocol types (compile-time only)", () => {
		const bootstrap: Bootstrap = { workspaces: [] };
		const payload: WorkspacePayload = { schema: {}, fileLabel: "a.json" };
		const host: HostMessage = { type: "navigate", ref: "#" };
		const webview: WebviewMessage = { type: "ready" };
		expect(bootstrap.workspaces).toHaveLength(0);
		expect(payload.fileLabel).toBe("a.json");
		expect(host.type).toBe("navigate");
		expect(webview.type).toBe("ready");
	});
});
