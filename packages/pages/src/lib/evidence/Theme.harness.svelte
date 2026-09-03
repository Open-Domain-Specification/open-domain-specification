<script lang="ts">
import type { Snippet } from "svelte";

/**
 * Renders a story in one explicit theme.
 *
 * Every page token in `assets/page.css` resolves through a `--vscode-*`
 * variable, and `assets/site.css` only supplies the dark set behind a
 * `prefers-color-scheme` query — which a single Storybook session cannot show
 * both sides of. This harness pins the tokens on a wrapper instead, so a
 * light and a dark story can sit side by side in the same sidebar. The values
 * are the ones in `assets/site.css:6-50`, copied rather than derived because
 * nothing shipped may change for these designs.
 */
const { mode, children }: { mode: "light" | "dark"; children: Snippet } =
	$props();
</script>

<div class="theme {mode}">{@render children()}</div>

<style>
	.theme {
		padding: 16px;
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
		--vscode-textLink-foreground: #005fb8;
		--vscode-badge-background: #cccccc;
		--vscode-badge-foreground: #3b3b3b;
		--vscode-charts-purple: #652d90;
		--vscode-charts-blue: #007acc;
		--vscode-charts-green: #388a34;
		--vscode-editorWarning-foreground: #bf8803;
		--vscode-editorError-foreground: #e51400;
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
		--vscode-textLink-foreground: #4daafc;
		--vscode-badge-background: #616161;
		--vscode-badge-foreground: #f8f8f8;
		--vscode-charts-purple: #b180d7;
		--vscode-charts-blue: #3794ff;
		--vscode-charts-green: #89d185;
		--vscode-editorWarning-foreground: #cca700;
		--vscode-editorError-foreground: #f14c4c;
	}
</style>
