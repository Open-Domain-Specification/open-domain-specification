<script module lang="ts">
/** The three headings inside the report, which is one block rather than three sections. */
export const sections = [
	{ id: "refactor", label: "Refactor" },
	{ id: "tolerated", label: "Tolerated" },
	{ id: "no-comments", label: "No comments" },
];
</script>

<script lang="ts">
import { useModel } from "../model";
import HealthReport from "../organisms/HealthReport.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";

/**
 * The health report on a page of its own (RFC-002 section 4.5), reached from
 * the workspace page's Health section. It is the one page that is a read of
 * the whole workspace rather than an element, so its title is not a lockup: a
 * lockup carries a kind, an id and a detail, and a report has none, and a
 * workspace lockup would claim the page is the workspace, which the crumb
 * already names as where the reader came from. The title is the report's name
 * behind the pulse codicon the tree draws on the health node, at the size a
 * title lockup's icon takes, so the row a reader clicked and the title they
 * land on match.
 */
const model = useModel();
const ws = model.workspace;
const description =
	"What the architecture is not happy with, read off the evidence layer: relationships marked for refactoring, compromises it tolerates, and claims nobody has written anything down about.";
</script>

<PageHeader crumbs={[["#", ws.name]]} {description}>
	{#snippet title()}<span class="title"><i class="codicon codicon-pulse" aria-hidden="true"></i>Health</span>{/snippet}
</PageHeader>

<Section
	id="report"
	title="Health report"
	lead="Every row is a strategic claim the model makes about how two contexts meet. Refactor is the backlog the model implies, tolerated is the compromise it accepts, and no comments is the reconciliation list."
>
	<HealthReport />
</Section>

<style>
	/* The same icon-and-name unit a title lockup is, at the same size, without
	   a kind behind it; `Lockup.svelte`'s `.title` sets the same values. */
	.title {
		display: inline-flex;
		align-items: baseline;
		gap: 10px;
		font-size: 1.5em;
	}
	.codicon-pulse {
		align-self: center;
		font-size: 1em;
		color: var(--vscode-icon-foreground);
	}
</style>
