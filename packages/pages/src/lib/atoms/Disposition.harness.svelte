<script lang="ts">
import Disposition from "./Disposition.svelte";
import Lockup from "./Lockup.svelte";

/** The three dispositions beside the relationships that carry them; by design draws nothing, which is the point. */
</script>

<ul class="rows">
	<li><Lockup kind="boundedcontext" name="Catalog BC" ref="#/a" /> <span class="arrow">↔</span> <Lockup kind="boundedcontext" name="Inventory BC" ref="#/b" /> <Disposition disposition="refactor" /></li>
	<li><Lockup kind="boundedcontext" name="Sales BC" ref="#/c" /> <span class="arrow">→</span> <Lockup kind="boundedcontext" name="Inventory BC" ref="#/b" /> <Disposition disposition="tolerated" /></li>
	<li><Lockup kind="boundedcontext" name="Catalog BC" ref="#/a" /> <span class="arrow">→</span> <Lockup kind="boundedcontext" name="Sales BC" ref="#/c" /> <Disposition disposition="by-design" /></li>
	<li><Lockup kind="boundedcontext" name="Sales BC" ref="#/c" /> <span class="arrow">↔</span> <Lockup kind="boundedcontext" name="Fulfilment BC" ref="#/d" /> <Disposition /></li>
</ul>

<style>
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		line-height: 22px;
	}
	li {
		display: flex;
		gap: 8px;
		align-items: baseline;
		padding: 0 8px;
	}
	.arrow {
		color: var(--vscode-descriptionForeground);
	}
</style>
