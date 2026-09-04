<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Theme from "../Theme.harness.svelte";
import Demo from "./PageLayout.harness.svelte";
import PageLayout from "./PageLayout.svelte";

// Each story's body goes in a `template` snippet. Plain children of <Story>
// are passed to the meta `component` as its own children instead of replacing
// it, which renders the bare component with empty args and drops the body.
const { Story } = defineMeta({
	title: "Templates/PageLayout",
	component: PageLayout,
	parameters: { layout: "fullscreen" },
});
</script>

<!--
	The whole chrome at once: the site tree, the header with its crumbs and
	facts, a table of attributes and the table of contents. This is the story
	to look at when judging whether a page reads as one thing rather than as a
	set of components.
-->
<Story name="Context page shell">
	{#snippet template()}<Theme mode="light"><Demo /></Theme>{/snippet}
</Story>

<Story name="Light">
	{#snippet template()}<Theme mode="light"><Demo nav={false} /></Theme>{/snippet}
</Story>

<Story name="Dark">
	{#snippet template()}<Theme mode="dark"><Demo /></Theme>{/snippet}
</Story>

<Story name="High contrast">
	{#snippet template()}<Theme mode="hc"><Demo /></Theme>{/snippet}
</Story>

<!-- Inside the VS Code webview the tree view is the navigation, so the page
     takes the whole width. -->
<Story name="Webview (no tree)">
	{#snippet template()}<Theme mode="dark"><Demo nav={false} /></Theme>{/snippet}
</Story>
