import { describe, expect, it } from "vitest";
import {
	createHostColorMode,
	hostColorMode,
	resolveColorMode,
} from "./theme.svelte";

/** The observer fires on a microtask, so give it one before reading back. */
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));

const host = (...classes: string[]) => {
	const el = document.createElement("div");
	el.classList.add(...classes);
	return el;
};

describe("resolveColorMode", () => {
	it("reads the VS Code theme class off the host", () => {
		expect(resolveColorMode(host("vscode-light"))).toBe("light");
		expect(resolveColorMode(host("vscode-dark"))).toBe("dark");
		expect(resolveColorMode(host("vscode-high-contrast"))).toBe("dark");
	});
	it("treats a high contrast light theme as light, not as high contrast", () => {
		expect(
			resolveColorMode(
				host("vscode-high-contrast", "vscode-high-contrast-light"),
			),
		).toBe("light");
	});
	it("leaves the mode to the media query outside a webview", () => {
		expect(resolveColorMode(host())).toBe("system");
	});
});

describe("createHostColorMode", () => {
	it("starts from the host's current classes", () => {
		const mode = createHostColorMode(host("vscode-dark"));
		expect(mode.value).toBe("dark");
		mode.stop();
	});
	it("follows a theme switch on the host", async () => {
		const el = host("vscode-light");
		const mode = createHostColorMode(el);
		expect(mode.value).toBe("light");
		el.classList.replace("vscode-light", "vscode-dark");
		await settled();
		expect(mode.value).toBe("dark");
		mode.stop();
	});
	it("stops following once disconnected", async () => {
		const el = host("vscode-light");
		const mode = createHostColorMode(el);
		mode.stop();
		el.classList.replace("vscode-light", "vscode-dark");
		await settled();
		expect(mode.value).toBe("light");
	});
});

describe("hostColorMode", () => {
	it("follows the document body, which is what a webview themes", async () => {
		expect(hostColorMode.value).toBe("system");
		document.body.classList.add("vscode-dark");
		await settled();
		expect(hostColorMode.value).toBe("dark");
		document.body.classList.remove("vscode-dark");
		await settled();
		expect(hostColorMode.value).toBe("system");
	});
});
