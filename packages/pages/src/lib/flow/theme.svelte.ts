import type { ColorMode } from "@xyflow/svelte";

/**
 * Which colour mode Svelte Flow should paint its controls and minimap in.
 *
 * A VS Code webview marks the active theme with a class on `document.body`, so
 * the host theme is read from there rather than from `prefers-color-scheme`,
 * which follows the OS and not the editor. Outside a webview — the standalone
 * pages app, a static export — no class is present and Svelte Flow's own
 * `"system"` media query decides.
 *
 * A high contrast light theme carries both `vscode-high-contrast` and
 * `vscode-high-contrast-light`, so the light classes are tested first.
 */
export function resolveColorMode(host: Element): ColorMode {
	const classes = host.classList;
	if (
		classes.contains("vscode-light") ||
		classes.contains("vscode-high-contrast-light")
	)
		return "light";
	if (
		classes.contains("vscode-dark") ||
		classes.contains("vscode-high-contrast")
	)
		return "dark";
	return "system";
}

/**
 * Follows `host`'s classes so switching theme in VS Code repaints the diagrams
 * without a reload.
 */
export function createHostColorMode(host: HTMLElement) {
	let current = $state<ColorMode>(resolveColorMode(host));
	const observer = new MutationObserver(() => {
		current = resolveColorMode(host);
	});
	observer.observe(host, { attributes: true, attributeFilter: ["class"] });
	return {
		get value() {
			return current;
		},
		stop() {
			observer.disconnect();
		},
	};
}

/** Shared for the page; every diagram paints in the same mode. */
export const hostColorMode = createHostColorMode(document.body);
