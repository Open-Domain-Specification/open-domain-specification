<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Chip from "./Chip.svelte";

const { Story } = defineMeta({ title: "Atoms/Chip", component: Chip });
</script>

<Story name="Tones">
	<Chip label="plain" /> <Chip label="core" tone="core" /> <Chip label="supporting" tone="supporting" />
	<Chip label="generic" tone="generic" /> <Chip label="internal" tone="warn" title="Stays inside its context." />
	<Chip label="event" tone="muted" />
</Story>
