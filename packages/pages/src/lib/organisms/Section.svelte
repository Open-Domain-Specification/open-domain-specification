<script lang="ts">
import type { Diagnostic } from "@open-domain-specification/core";
import type { Snippet } from "svelte";
import Problems from "../molecules/Problems.svelte";

const {
	id,
	title,
	lead,
	problems = [],
	children,
}: {
	id: string;
	title: string;
	lead: string;
	problems?: Diagnostic[];
	children: Snippet;
} = $props();
</script>

<section {id}>
	<header><h2>{title}</h2><p class="lead">{lead}</p></header>
	<Problems {problems} />
	{@render children()}
</section>
