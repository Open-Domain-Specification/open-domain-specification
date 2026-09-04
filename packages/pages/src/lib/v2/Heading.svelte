<script lang="ts">
import type { Snippet } from "svelte";

/**
 * The three heading levels a page uses, and nothing else. Hierarchy comes
 * from size at level 1, from weight and the space above at levels 2 and 3;
 * there are no rules, no capitals and no letterspacing, because the type
 * scale already says which is which. A `lead` is the one line of guidance
 * under a level-2 heading that tells a reader what the section is for. A
 * `count` draws the platform's badge, the one place v2 uses one: a pane
 * header in VS Code carries its item count in exactly this badge.
 */
const {
	level,
	id,
	lead,
	count,
	children,
}: {
	level: 1 | 2 | 3;
	id?: string;
	lead?: string;
	count?: number;
	children: Snippet;
} = $props();
</script>

<svelte:element this={`h${level}`} {id} class="heading h{level}">
	{@render children()}{#if count !== undefined}<span class="count">{count}</span>{/if}
</svelte:element>
{#if lead}<p class="lead">{lead}</p>{/if}

<style>
	/* Explicit colour, case and spacing: the v1 page stylesheet sets bare
	   `h1` and `h3` to capitals and the secondary colour. */
	.heading {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin: 0;
		font-weight: 600;
		color: var(--vscode-foreground);
		text-transform: none;
		letter-spacing: normal;
		scroll-margin-top: 40px;
	}
	.h1 {
		font-size: 1.5em;
		line-height: 1.3;
		margin-bottom: 4px;
	}
	.h2 {
		font-size: 1.15em;
		line-height: 1.4;
		margin-top: 32px;
	}
	.h3 {
		font-size: 1em;
		line-height: 22px;
		margin-top: 16px;
	}
	.lead {
		margin: 2px 0 8px;
		max-width: 80ch;
		color: var(--vscode-descriptionForeground);
	}
	.count {
		align-self: center;
		min-width: 18px;
		height: 18px;
		padding: 0 6px;
		border-radius: 11px;
		font-size: 11px;
		font-weight: 400;
		line-height: 18px;
		text-align: center;
		background: var(--vscode-badge-background);
		color: var(--vscode-badge-foreground);
	}
	/* High contrast themes draw every badge with the contrast border, as the workbench does. */
	:global(.vscode-high-contrast) .count {
		outline: 1px solid var(--vscode-contrastBorder, var(--vscode-panel-border));
		outline-offset: -1px;
	}
</style>
