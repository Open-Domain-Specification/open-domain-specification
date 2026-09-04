<script lang="ts">
import { PATTERNS } from "@open-domain-specification/core";
import Comments from "./Comments.svelte";
import Disposition from "./Disposition.svelte";
import HoverCard from "./HoverCard.svelte";
import Keyword from "./Keyword.svelte";

/**
 * The two hovers RFC-002 asks for: a pattern's meaning over a keyword, and
 * an intent's evidence summary over a map badge. `variant` picks one.
 */
const { variant = "pattern" }: { variant?: "pattern" | "evidence" } = $props();
const acl = PATTERNS["anti-corruption-layer"];
</script>

{#if variant === "pattern"}
	<HoverCard heading="{acl.name}  ({acl.abbreviation})">
		<p>{acl.summary}</p>
		<hr />
		<p>{acl.architecturalNature}</p>
	</HoverCard>
{:else}
	<HoverCard heading="Catalog BC ↔ Inventory BC">
		<p><Keyword text="shared-kernel" /> <Disposition disposition="refactor" /></p>
		<p>{PATTERNS["shared-kernel"].summary}</p>
		<hr />
		<Comments
			comments={[
				{ text: "PetStatus and its values live in @petstore/kernel.", link: { kind: "code", url: "https://example.com/kernel", label: "packages/kernel" } },
				{ text: "It should become a Published Language from Catalog.", link: { kind: "adr", url: "https://example.com/adr/14", label: "ADR-014" } },
			]}
		/>
	</HoverCard>
{/if}
