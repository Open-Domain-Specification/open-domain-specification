<script lang="ts">
import type { WorkspaceSet } from "@open-domain-specification/core";
import { type Model, maybeSet, provideModel, provideSet } from "./model";

/** Says which set a diagram's key reading would find from where it is mounted, for the unit tests. */
const {
	set,
	model,
	onsee,
}: {
	set?: WorkspaceSet;
	model?: Model;
	onsee: (set: WorkspaceSet | undefined) => void;
} = $props();
// Context is read where it is provided, which is all a test needs of it.
// svelte-ignore state_referenced_locally
if (set) provideSet(set);
// svelte-ignore state_referenced_locally
if (model) provideModel(model);
// svelte-ignore state_referenced_locally
onsee(maybeSet());
</script>
