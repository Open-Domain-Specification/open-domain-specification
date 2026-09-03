<script lang="ts">
import Empty from "../atoms/Empty.svelte";
import RefLink from "../atoms/RefLink.svelte";
import { ICONS, useModel } from "../model";
import { termsEmbodying } from "../templates/elements";
import Section from "./Section.svelte";

/** Glossary terms embodied by an element. */
let { target }: { target: { ref: string } } = $props();
const model = useModel();
const terms = $derived(termsEmbodying(model.workspace, target));
</script>

<Section
	id="language"
	title="In the ubiquitous language"
	lead="Glossary terms this element embodies. If the team calls it something else, the model has drifted from the language."
>
	{#if terms.length}
		<div class="pills">{#each terms as t}<span class="pill"><RefLink ref={t.ref} label={t.name} icon={ICONS.term} /></span>{/each}</div>
	{:else}
		<Empty text="No glossary term names this element." />
	{/if}
</Section>
