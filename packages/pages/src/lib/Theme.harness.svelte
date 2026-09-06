<script lang="ts">
import type { Snippet } from "svelte";

/**
 * Renders a story in one explicit VS Code theme.
 *
 * Every colour resolves through a `--vscode-*` variable, and a single
 * Storybook session shows only one `prefers-color-scheme`, so the tokens are
 * pinned on a wrapper here instead. The three sets are the defaults of Dark
 * Modern, Light Modern and Default High Contrast (dark), copied from the
 * theme registry rather than derived, because the stories exist to show what
 * the real editor shows. The wrapper also carries the body class VS Code
 * gives a webview (`vscode-light`, `vscode-dark`, `vscode-high-contrast`) so
 * a component may style the high contrast case the way the platform does.
 */
const { mode, children }: { mode: "light" | "dark" | "hc"; children: Snippet } =
	$props();
const bodyClass = $derived(
	{ light: "vscode-light", dark: "vscode-dark", hc: "vscode-high-contrast" }[
		mode
	],
);
</script>

<div class="theme {mode} {bodyClass}">{@render children()}</div>

<style>
	.theme {
		padding: 16px;
		font-family: var(--vscode-font-family);
		font-size: var(--vscode-font-size);
		background: var(--vscode-editor-background);
		color: var(--vscode-foreground);
	}
	.theme.light {
		--vscode-foreground: #3b3b3b;
		--vscode-descriptionForeground: #717171;
		--vscode-icon-foreground: #3b3b3b;
		--vscode-editor-background: #ffffff;
		--vscode-sideBar-background: #f8f8f8;
		--vscode-editorWidget-background: #f8f8f8;
		--vscode-panel-border: #e5e5e5;
		--vscode-widget-border: #e5e5e5;
		--vscode-widget-shadow: rgba(0, 0, 0, 0.16);
		--vscode-textLink-foreground: #005fb8;
		--vscode-textLink-activeForeground: #005fb8;
		--vscode-focusBorder: #005fb8;
		--vscode-contrastActiveBorder: transparent;
		--vscode-list-hoverBackground: #f2f2f2;
		--vscode-list-activeSelectionBackground: #0060c0;
		--vscode-list-activeSelectionForeground: #ffffff;
		--vscode-badge-background: #cccccc;
		--vscode-badge-foreground: #3b3b3b;
		--vscode-editorWarning-foreground: #bf8803;
		--vscode-editorError-foreground: #e51400;
		--vscode-editorInfo-foreground: #1a85ff;
		--vscode-editorHoverWidget-background: #f8f8f8;
		--vscode-editorHoverWidget-border: #c8c8c8;
		--vscode-editorHoverWidget-foreground: #3b3b3b;
		--vscode-textCodeBlock-background: #f8f8f8;
		--vscode-symbolIcon-classForeground: #d67e00;
		--vscode-symbolIcon-methodForeground: #652d90;
		--vscode-symbolIcon-functionForeground: #652d90;
		--vscode-symbolIcon-fieldForeground: #007acc;
		--vscode-symbolIcon-eventForeground: #007acc;
	}
	.theme.dark {
		--vscode-foreground: #cccccc;
		--vscode-descriptionForeground: #9d9d9d;
		--vscode-icon-foreground: #cccccc;
		--vscode-editor-background: #1f1f1f;
		--vscode-sideBar-background: #181818;
		--vscode-editorWidget-background: #202020;
		--vscode-panel-border: #2b2b2b;
		--vscode-widget-border: #313131;
		--vscode-widget-shadow: rgba(0, 0, 0, 0.36);
		--vscode-textLink-foreground: #4daafc;
		--vscode-textLink-activeForeground: #4daafc;
		--vscode-focusBorder: #0078d4;
		--vscode-contrastActiveBorder: transparent;
		--vscode-list-hoverBackground: #2a2d2e;
		--vscode-list-activeSelectionBackground: #04395e;
		--vscode-list-activeSelectionForeground: #ffffff;
		--vscode-badge-background: #616161;
		--vscode-badge-foreground: #f8f8f8;
		--vscode-editorWarning-foreground: #cca700;
		--vscode-editorError-foreground: #f14c4c;
		--vscode-editorInfo-foreground: #3794ff;
		--vscode-editorHoverWidget-background: #202020;
		--vscode-editorHoverWidget-border: #454545;
		--vscode-editorHoverWidget-foreground: #cccccc;
		--vscode-textCodeBlock-background: #2b2b2b;
		--vscode-symbolIcon-classForeground: #ee9d28;
		--vscode-symbolIcon-methodForeground: #b180d7;
		--vscode-symbolIcon-functionForeground: #b180d7;
		--vscode-symbolIcon-fieldForeground: #75beff;
		--vscode-symbolIcon-eventForeground: #75beff;
	}
	.theme.hc {
		--vscode-foreground: #ffffff;
		--vscode-descriptionForeground: #ffffff;
		--vscode-icon-foreground: #ffffff;
		--vscode-editor-background: #000000;
		--vscode-sideBar-background: #000000;
		--vscode-editorWidget-background: #0c141f;
		--vscode-panel-border: #6fc3df;
		--vscode-widget-border: #6fc3df;
		--vscode-widget-shadow: transparent;
		--vscode-textLink-foreground: #21a6ff;
		--vscode-textLink-activeForeground: #21a6ff;
		--vscode-focusBorder: #f38518;
		--vscode-contrastActiveBorder: #f38518;
		--vscode-list-hoverBackground: transparent;
		--vscode-list-activeSelectionBackground: #000000;
		--vscode-list-activeSelectionForeground: #ffffff;
		--vscode-badge-background: #000000;
		--vscode-badge-foreground: #ffffff;
		--vscode-editorWarning-foreground: #ffff00;
		--vscode-editorError-foreground: #f48771;
		--vscode-editorInfo-foreground: #3794ff;
		--vscode-editorHoverWidget-background: #0c141f;
		--vscode-editorHoverWidget-border: #6fc3df;
		--vscode-editorHoverWidget-foreground: #ffffff;
		--vscode-textCodeBlock-background: #000000;
		--vscode-symbolIcon-classForeground: #ee9d28;
		--vscode-symbolIcon-methodForeground: #b180d7;
		--vscode-symbolIcon-functionForeground: #b180d7;
		--vscode-symbolIcon-fieldForeground: #75beff;
		--vscode-symbolIcon-eventForeground: #75beff;
	}
</style>
