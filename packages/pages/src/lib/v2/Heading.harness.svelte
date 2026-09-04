<script lang="ts">
import EmptyState from "./EmptyState.svelte";
import Heading from "./Heading.svelte";
import Lockup from "./Lockup.svelte";

/** The three levels in the order a page uses them, with a lead and a count where a page would carry one. */
const { withCounts = true }: { withCounts?: boolean } = $props();
</script>

<Heading level={1}><Lockup kind="aggregate" name="Pet" id="pet" detail="Aggregate" size="title" /></Heading>
<p class="description">A pet listed in the store. One aggregate because a pet's photos, tags and status change together.</p>

<Heading level={2} id="structure" lead="Entities have identity and a lifecycle; value objects are defined by their attributes and are replaced, not changed." count={withCounts ? 5 : undefined}>Structure</Heading>
<Heading level={3} count={withCounts ? 1 : undefined}>Entities</Heading>
<EmptyState text="No entities. An aggregate needs a root entity." />
<Heading level={3}>Value objects</Heading>
<EmptyState text="No value objects." />

<Heading level={2} id="invariants" lead="Rules that must hold after every change.">Invariants</Heading>
<EmptyState text="No invariants stated. If nothing can go wrong, is this really an aggregate?" />

<style>
	.description {
		margin: 0;
		max-width: 80ch;
	}
</style>
