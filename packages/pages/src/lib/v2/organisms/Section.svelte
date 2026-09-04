<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import type { Snippet } from "svelte";
import Heading from "../Heading.svelte";
import Problems from "../molecules/Problems.svelte";

/**
 * One section of a page: a level-2 heading with its lead, the diagnostics
 * that belong to what it lists, then the section's own content. The rule
 * under the v1 header goes; the 32px above the heading and its weight carry
 * the hierarchy. `count` is the number of things the section lists and draws
 * the pane header's badge.
 */
const {
	id,
	title,
	lead,
	count,
	problems = [],
	children,
}: {
	id: string;
	title: string;
	lead: string;
	count?: number;
	problems?: Diagnostic[];
	children: Snippet;
} = $props();
</script>

<section {id}>
	<Heading level={2} {lead} {count}>{title}</Heading>
	<Problems {problems} />
	{@render children()}
</section>

<style>
	/* The sticky toolbar covers the top 32px, so an anchored section stops below it. */
	section {
		scroll-margin-top: 40px;
	}
</style>
