<script lang="ts">
import { focusArrival } from "../focus";

/**
 * "Skip to content": the first stop in the Tab order of the viewer and the
 * static export, where a reader would otherwise pass every link in the tree
 * before reaching the page. Hidden until it has focus, then drawn over the
 * top-left corner in the editor's own colours.
 *
 * It is a link whose `href` is the route being read, never `#content`: this
 * app's hash is the router's, so an anchor id would navigate to the workspace
 * root. Activating it does not follow the link at all. The default is
 * prevented, so the hash and history stay as they are, and focus goes to the
 * page's heading the way it does on arrival, so the next Tab is the first
 * stop after it. `target="_self"` is what keeps the router's click listener,
 * which runs first, from treating the click as a navigation.
 */
const { href }: { href: string } = $props();

const skip = (event: MouseEvent) => {
	event.preventDefault();
	const heading = document.querySelector<HTMLElement>("main h1");
	if (heading) focusArrival(heading);
};
</script>

<a class="skip" {href} target="_self" onclick={skip}>Skip to content</a>

<style>
	.skip:not(:focus) {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.skip:focus {
		position: fixed;
		top: 8px;
		left: 8px;
		z-index: 1100;
		padding: 4px 12px;
		line-height: 22px;
		color: var(--vscode-textLink-foreground);
		background: var(--vscode-editor-background);
		border-radius: 2px;
		outline: 1px solid var(--vscode-focusBorder);
		outline-offset: -1px;
	}
</style>
