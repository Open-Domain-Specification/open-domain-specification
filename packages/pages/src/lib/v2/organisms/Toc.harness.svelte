<script lang="ts">
import Toc from "./Toc.svelte";

/** A context page's sections, with the third one being read. */
const { active }: { active?: string } = $props();

const sections = [
	{ id: "position", label: "Strategic position" },
	{ id: "model", label: "Model" },
	{ id: "integration", label: "Integration surface" },
	{ id: "policies", label: "Policies" },
	{ id: "language", label: "In the ubiquitous language" },
];
</script>

<Toc {sections} {active} />
