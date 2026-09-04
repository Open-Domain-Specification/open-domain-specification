<script lang="ts">
import EmptyState from "../atoms/EmptyState.svelte";
import Ref from "../atoms/Ref.svelte";
import { termsEmbodying } from "../elements";
import { ICONS, useModel } from "../model";
import Section from "./Section.svelte";

/**
 * The glossary terms an element embodies. v1 wrapped each one in a pill; a
 * term is a link and nothing else, so v2 prints the links in one line,
 * comma-separated, at row height.
 */
const { target }: { target: { ref: string } } = $props();

const model = useModel();
const terms = $derived(termsEmbodying(model.workspace, target));
</script>

<Section
	id="language"
	title="In the ubiquitous language"
	lead="Glossary terms this element embodies. If the team calls it something else, the model has drifted from the language."
	count={terms.length}
>
	{#if terms.length}
		<p class="terms">{#each terms as t, n (t.ref)}{#if n}{", "}{/if}<Ref ref={t.ref} label={t.name} icon={ICONS.term} />{/each}</p>
	{:else}
		<EmptyState text="No glossary term names this element." />
	{/if}
</Section>

<style>
	.terms {
		margin: 0;
		padding: 0 8px;
		line-height: 22px;
	}
</style>
