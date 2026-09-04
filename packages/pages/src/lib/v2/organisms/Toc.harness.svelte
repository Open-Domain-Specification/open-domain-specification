<script lang="ts">
import Toc from "./Toc.svelte";

/** A context page's sections, as the table of contents lists them. */
const sections = [
	{ id: "position", label: "Strategic position" },
	{ id: "model", label: "Model" },
	{ id: "integration", label: "Integration surface" },
	{ id: "policies", label: "Policies" },
	{ id: "language", label: "In the ubiquitous language" },
];
</script>

<Toc {sections} />
