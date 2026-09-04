<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import type { Snippet } from "svelte";
import Heading from "../Heading.svelte";
import Problems from "./Problems.svelte";

/**
 * One band of a page: a level-2 heading with its lead, the section's
 * diagnostics, then the content. The rule under the v1 section header goes;
 * the 32px above the heading and its weight carry the hierarchy. `count` is
 * the number of rows the section lists and draws the pane header's badge.
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
	lead?: string;
	count?: number;
	problems?: Diagnostic[];
	children: Snippet;
} = $props();
</script>

<section {id} class="section">
	<Heading level={2} {lead} {count}>{title}</Heading>
	<Problems {problems} />
	{@render children()}
</section>

<style>
	.section {
		/* The sticky toolbar is 32px, so an anchored section clears it by 40px. */
		scroll-margin-top: 40px;
	}
</style>
