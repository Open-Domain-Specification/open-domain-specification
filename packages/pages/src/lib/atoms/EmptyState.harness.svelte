<script lang="ts">
import EmptyState from "./EmptyState.svelte";
import Ref from "./Ref.svelte";

/** Empty sentences with and without an action after them. */
</script>

<EmptyState text="No explicit relationships. Consumptions imply upstream and downstream links." />
<EmptyState text="No comments recorded for this relationship yet.">
	<Ref ref="#/skill" label="Reconcile with the skill" />
</EmptyState>
<EmptyState text="Provides nothing." />
