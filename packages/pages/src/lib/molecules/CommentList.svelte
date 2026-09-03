<script lang="ts">
import type { Comment, CommentLink } from "@open-domain-specification/core";
import Empty from "../atoms/Empty.svelte";
import { LINK_KIND_LABELS } from "../evidence/labels";

/**
 * A comments: short grounded statements about the real system, each
 * optionally backed by one link. The statement carries the meaning and the
 * link is a trailing citation, so the sheet still reads as prose when it is
 * rendered as markdown on the docs site.
 */
const {
	comments,
	empty = "No comments recorded yet.",
}: { comments: Comment[]; empty?: string } = $props();

/** How a link reads next to its statement: what kind of thing it is, then which one. */
const nameOf = (link: CommentLink) => link.label ?? link.url;
const citeOf = (link: CommentLink) =>
	`${LINK_KIND_LABELS[link.kind]}: ${nameOf(link)}`;
</script>

{#if comments.length}
	<ul class="comments">
		{#each comments as comment (comment.text)}
			<li><span>{comment.text}</span>{#if comment.link}<a
					class="comment-link"
					href={comment.link.url}
					title={nameOf(comment.link)}
					rel="external noreferrer"
				>{citeOf(comment.link)}</a>{/if}</li>
		{/each}
	</ul>
{:else}
	<Empty text={empty} />
{/if}

<style>
	.comments {
		margin: 4px 0;
		padding-left: 18px;
	}
	.comments li {
		margin-bottom: 3px;
	}
	.comment-link {
		margin-left: 4px;
		font-size: 0.9em;
		white-space: nowrap;
	}
</style>
