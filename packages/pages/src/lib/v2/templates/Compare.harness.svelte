<script lang="ts">
import type { Model } from "../../model";
import V1Page from "../../Page.harness.svelte";
import Theme from "../Theme.harness.svelte";
import V2Page from "./Page.harness.svelte";

/**
 * The same element rendered by v1 and by v2, two 1200px columns side by side,
 * so the morning review can read one against the other without switching
 * stories. v1 is shown in the ambient theme because its derived tokens
 * (`--muted`, `--card`, `--accent`) resolve on `:root` in the v1 stylesheets
 * and so cannot be repointed by a wrapper; the v2 column pins the Light
 * Modern tokens, which is what the v1 column shows by default too.
 */
const { model, ref }: { model: Model; ref: string } = $props();
</script>

<div class="compare">
	<section>
		<p class="label">v1</p>
		<V1Page {model} {ref} />
	</section>
	<section>
		<p class="label">v2</p>
		<Theme mode="light"><V2Page {model} {ref} /></Theme>
	</section>
</div>

<style>
	.compare {
		display: flex;
		align-items: flex-start;
		gap: 24px;
	}
	section {
		width: 1200px;
		flex: none;
	}
	.label {
		margin: 0 0 8px;
		padding: 0 24px;
		color: var(--vscode-descriptionForeground);
		font-family: var(--vscode-font-family);
		font-size: var(--vscode-font-size);
		line-height: 22px;
	}
</style>
