<script lang="ts">
import { iconColor, type Kind, kindIcon } from "./kinds";
import Ref from "./Ref.svelte";

/**
 * Kind icon plus name: the unit every row and every title is built from. It
 * is the Outline row brought into the page: the codicon in the kind's symbol
 * colour, the name (a link when it has somewhere to go), then the optional
 * trailing pieces a tree row would carry as its description, in the secondary
 * colour and set apart by space alone. `id` is the identifier in the editor
 * font; `detail` is any other short text, such as the kind word on a page
 * title, which replaces v1's uppercase eyebrow.
 */
const {
	kind,
	name,
	ref,
	id,
	detail,
	size = "row",
	current,
}: {
	kind: Kind;
	name: string;
	ref?: string | { ref: string };
	id?: string;
	detail?: string;
	size?: "row" | "title";
	/** Passed to the link as `aria-current`; only a tree row has one. */
	current?: "page";
} = $props();
</script>

<span class={`lockup ${size}`}>
	<span class="mark"><i class={`codicon codicon-${kindIcon(kind)}`} style:color={iconColor(kind)} aria-hidden="true"></i>
	{#if ref}<Ref {ref} label={name} {current} />{:else}<span class="name">{name}</span>{/if}</span>
	{#if id}<code class="id">{id}</code>{/if}
	{#if detail}<span class="detail">{detail}</span>{/if}
</span>

<style>
	/* One token: a narrow table cell may break between a lockup and what
	   follows it, never between the icon and the name or inside the name. */
	.lockup {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
		white-space: nowrap;
	}
	/* The icon and the name are one piece: a title that has to wrap moves the
	   id and the detail, never the name away from its icon. */
	.mark {
		display: inline-flex;
		align-items: baseline;
		gap: 6px;
		min-width: 0;
		white-space: nowrap;
	}
	.codicon {
		font-size: 1em;
		align-self: center;
	}
	.name {
		color: var(--vscode-foreground);
	}
	/* No box: an id is a code the reader may need, not a badge. */
	.id {
		font-family: var(--vscode-editor-font-family);
		font-size: 0.92em;
		font-weight: 400;
		color: var(--vscode-descriptionForeground);
		background: none;
		border: 0;
		padding: 0;
	}
	.detail {
		color: var(--vscode-descriptionForeground);
	}
	.title {
		font-size: 1.5em;
		font-weight: 600;
		gap: 0 10px;
		flex-wrap: wrap;
	}
	.title .id,
	.title .detail {
		font-size: 0.6em;
		font-weight: 400;
	}
</style>
