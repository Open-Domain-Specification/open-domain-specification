<script lang="ts">
import DispositionChip from "../atoms/DispositionChip.svelte";

/**
 * Every state the chip has, side by side, so one story shows the whole atom.
 * A component rather than a snippet because a story's body is lifted out of
 * this file's scope by addon-svelte-csf.
 */
</script>

<p>tolerated: <DispositionChip disposition="tolerated" /></p>
<p>refactor: <DispositionChip disposition="refactor" /></p>
<p>by-design, which renders nothing: <DispositionChip disposition="by-design" />—</p>
<p>unset, which also renders nothing: <DispositionChip />—</p>
