<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import type { Snippet } from "svelte";
import Heading from "../Heading.svelte";
import Problems from "./Problems.svelte";

/**
 * One band of a page: a level-2 heading, the line of guidance under it, the
 * diagnostics that belong to it, then whatever it lists. v1 closed the header
 * with a rule; v2 spends the 32px above the heading instead, because the space
 * and the weight already say where the section starts.
 *
 * `count` is the number of rows the section lists, drawn as the pane header's
 * badge — the one badge v2 uses.
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
	/* The sticky toolbar is 32px, so an anchored section stops below it. */
	section {
		scroll-margin-top: 40px;
	}
</style>
