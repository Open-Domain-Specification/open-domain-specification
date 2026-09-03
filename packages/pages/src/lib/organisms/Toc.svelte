<script lang="ts">
const { sections }: { sections: { id: string; label: string }[] } = $props();
const jump = (id: string) => (e: Event) => {
	e.preventDefault();
	document
		.getElementById(id)
		?.scrollIntoView({ behavior: "smooth", block: "start" });
};
</script>

<aside class="toc">
	<p class="toc-title">On this page</p>
	<ul>{#each sections as s}<li><a href="#{s.id}" onclick={jump(s.id)}>{s.label}</a></li>{/each}</ul>
</aside>
