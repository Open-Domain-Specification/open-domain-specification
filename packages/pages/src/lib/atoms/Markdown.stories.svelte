<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import Markdown from "./Markdown.svelte";

const { Story } = defineMeta({ title: "Atoms/Markdown", component: Markdown });
</script>

<Story name="Description" args={{ text: "Orders use **placed → approved → delivered**. Raw `<b>html</b>` is shown as text." }} />
<Story name="Empty" args={{ text: undefined }} />
