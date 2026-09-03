<script lang="ts">
import type { HealthCounts } from "../evidence/derive";

/**
 * The three numbers a product owner reads to answer "is the map true, and is
 * it what we want?" (RFC-002 section 4.5). It sits at the top of the full
 * health report and again in the workspace page's Health section, so both say
 * the same thing in the same shape.
 *
 * A zero is dimmed rather than hidden: "0 to refactor" is the good news, and
 * dropping it would make the strip change shape between workspaces.
 */
let { counts }: { counts: HealthCounts } = $props();
</script>

<ul class="summary">
	<li class:zero={counts.refactor === 0}>
		<strong>{counts.refactor}</strong> to refactor
	</li>
	<li class:zero={counts.tolerated === 0}>
		<strong>{counts.tolerated}</strong> tolerated
	</li>
	<li class:zero={counts.noComments === 0}>
		<strong>{counts.noComments}</strong> with no comments
	</li>
</ul>

<style>
	.summary {
		display: flex;
		flex-wrap: wrap;
		gap: var(--gap);
		margin: 0 0 var(--gap);
		padding: 0;
		list-style: none;
	}
	.summary li {
		flex: 1 1 120px;
		padding: 8px 12px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--card);
		color: var(--muted);
	}
	.summary strong {
		display: block;
		font-size: 1.6em;
		color: var(--fg);
	}
	.summary li.zero strong {
		color: var(--muted);
	}
</style>
