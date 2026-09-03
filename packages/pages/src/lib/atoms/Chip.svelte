<script lang="ts">
const {
	label,
	tone = "",
	title,
}: {
	label: string;
	tone?: "" | "core" | "supporting" | "generic" | "warn" | "muted";
	title?: string;
} = $props();
</script>

<span class="chip {tone}" {title}>{label}</span>
