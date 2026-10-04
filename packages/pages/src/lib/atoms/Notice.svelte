<script lang="ts">
/**
 * A line the reader needs before the page itself: that what they are reading
 * is not the whole project, or is the last version of a file that has since
 * stopped loading. It is a `status`, read when it appears and again on
 * arrival, and it says what is true and what to do. The icon is drawn in the
 * warning colour and the text stays in the foreground, as a Problems row does.
 */
const { message, kind = "notice" }: { message: string; kind?: string } =
	$props();
</script>

<p class="notice" role="status" data-notice={kind}><i class="codicon codicon-info" aria-hidden="true"></i><span>{message}</span></p>

<style>
	.notice {
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		column-gap: 8px;
		margin: 0 0 8px;
		line-height: 22px;
	}
	.codicon {
		font-size: 1em;
		line-height: inherit;
		text-align: center;
		color: var(--vscode-editorWarning-foreground);
	}
	span {
		overflow-wrap: anywhere;
	}
</style>
