<script lang="ts">
import { useModel } from "../../model";
import { termsEmbodying } from "../../templates/elements";
import EmptyState from "../EmptyState.svelte";
import RefList from "../molecules/RefList.svelte";
import Section from "./Section.svelte";

/**
 * The glossary terms an element embodies. The v1 pills go: a term is a link,
 * and a link looks like a link, so the section is one row of comma-separated
 * refs carrying the term codicon.
 */
const { target }: { target: { ref: string } } = $props();
const model = useModel();
const terms = $derived(termsEmbodying(model.workspace, target));
</script>

<Section
	id="language"
	title="In the ubiquitous language"
	lead="Glossary terms this element embodies. If the team calls it something else, the model has drifted from the language."
>
	{#if terms.length}
		<RefList items={terms} kind="term" block />
	{:else}
		<EmptyState text="No glossary term names this element." />
	{/if}
</Section>
