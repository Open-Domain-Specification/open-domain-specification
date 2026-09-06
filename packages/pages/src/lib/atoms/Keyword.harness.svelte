<script lang="ts">
import { PATTERNS } from "@open-domain-specification/core";
import Keyword from "./Keyword.svelte";
import Lockup from "./Lockup.svelte";

/**
 * Every way a keyword is used, beside the names it classifies, so the story
 * shows the word doing its job rather than floating alone. The same rows in
 * v1 would each have carried two or three pills.
 */
</script>

<div class="rows">
	<div><Lockup kind="event" name="PetRegistered" ref="#/x" /> <Keyword text="event" /> <Keyword text="published-language" title={PATTERNS["published-language"].summary} /></div>
	<div><Lockup kind="command" name="ChangePetStatus" ref="#/y" /> <Keyword text="operation" /> <Keyword text="internal" title="Stays inside its context; other contexts cannot consume it." /></div>
	<div><Lockup kind="subdomain" name="Catalog" ref="#/z" /> <Keyword text="core" title="Core: the differentiator." /></div>
	<div><Lockup kind="boundedcontext" name="Identity BC" ref="#/i" /> <Keyword text="big ball of mud" tone="warn" title="A model that is not coherent; neighbours should protect themselves." /></div>
	<div><Keyword text="OHS" mono title={PATTERNS["open-host-service"].summary} /> <Keyword text="PL" mono title={PATTERNS["published-language"].summary} /> <Keyword text="ACL" mono title={PATTERNS["anti-corruption-layer"].summary} /> <Keyword text="CF" mono title={PATTERNS.conformist.summary} /></div>
	<div><Keyword text="no root entity" tone="error" title="An aggregate needs exactly one root entity." /></div>
</div>

<style>
	.rows {
		display: grid;
		gap: 0;
		line-height: 22px;
	}
</style>
