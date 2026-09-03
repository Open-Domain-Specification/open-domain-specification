<script lang="ts">
import Empty from "../atoms/Empty.svelte";
import {
	type Fact,
	type FactLink,
	LINK_KIND_LABELS,
} from "../evidence/fixtures";

/**
 * A fact sheet: short grounded statements about the real system, each
 * optionally backed by one link. The statement carries the meaning and the
 * link is a trailing citation, so the sheet still reads as prose when it is
 * rendered as markdown on the docs site.
 */
const {
	facts,
	empty = "No facts recorded yet.",
}: { facts: Fact[]; empty?: string } = $props();

/** How a link reads next to its statement: what kind of thing it is, then which one. */
const nameOf = (link: FactLink) => link.label ?? link.url;
const citeOf = (link: FactLink) =>
	`${LINK_KIND_LABELS[link.kind]}: ${nameOf(link)}`;
</script>

{#if facts.length}
	<ul class="facts">
		{#each facts as fact (fact.text)}
			<li><span>{fact.text}</span>{#if fact.link}<a
					class="fact-link"
					href={fact.link.url}
					title={nameOf(fact.link)}
					rel="external noreferrer"
				>{citeOf(fact.link)}</a>{/if}</li>
		{/each}
	</ul>
{:else}
	<Empty text={empty} />
{/if}

<style>
	.facts {
		margin: 4px 0;
		padding-left: 18px;
	}
	.facts li {
		margin-bottom: 3px;
	}
	.fact-link {
		margin-left: 4px;
		font-size: 0.9em;
		white-space: nowrap;
	}
</style>
