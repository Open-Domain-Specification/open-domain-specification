<script lang="ts">
import type { Comment, CommentLinkKind } from "@open-domain-specification/core";
import { LINK_KIND_LABELS } from "../evidence/labels";
import EmptyState from "./EmptyState.svelte";
import Ref from "./Ref.svelte";

/**
 * The comments on one intent (RFC-002 section 3): short grounded statements,
 * each with at most one citation. Each row leads with the comment codicon in
 * a fixed gutter, the way the Comments panel lists threads, and the citation
 * trails the statement as an external link named by what it points at. No
 * bullets, no box: the statement is the content and the link is its footnote.
 */
const {
	comments,
	empty = "No comments recorded yet.",
}: { comments: Comment[]; empty?: string } = $props();

/** The codicon for where a citation points. */
const LINK_ICON: Record<CommentLinkKind, string> = {
	code: "code",
	contract: "symbol-interface",
	adr: "notebook",
	runbook: "terminal",
	dashboard: "graph",
};
</script>

{#if comments.length}
	<ul class="comments">
		{#each comments as comment (comment.text)}
			<li>
				<i class="codicon codicon-comment" aria-hidden="true"></i>
				<span class="text">{comment.text}{#if comment.link}{" "}<Ref
							ref={comment.link.url}
							label={comment.link.label ?? comment.link.url}
							icon={LINK_ICON[comment.link.kind]}
							title={LINK_KIND_LABELS[comment.link.kind]}
							external
						/>{/if}</span>
			</li>
		{/each}
	</ul>
{:else}
	<EmptyState text={empty} />
{/if}

<style>
	.comments {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li {
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		column-gap: 8px;
		padding: 2px 0;
		line-height: 1.5;
	}
	.codicon-comment {
		color: var(--vscode-descriptionForeground);
		line-height: inherit;
		text-align: center;
	}
	.text {
		max-width: 80ch;
	}
</style>
