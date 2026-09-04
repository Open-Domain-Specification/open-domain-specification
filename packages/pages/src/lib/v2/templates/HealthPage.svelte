<script module lang="ts">
/** The three headings inside the report, which is one block rather than three sections. */
export const sections = [
	{ id: "refactor", label: "Refactor" },
	{ id: "tolerated", label: "Tolerated" },
	{ id: "no-comments", label: "No comments" },
];
</script>

<script lang="ts">
import { useModel } from "../../model";
import Heading from "../Heading.svelte";
import Crumbs from "../molecules/Crumbs.svelte";
import HealthReport from "../organisms/HealthReport.svelte";
import Section from "../organisms/Section.svelte";

/**
 * The health report on a page of its own (RFC-002 section 4.5), reached from
 * the workspace page's Model health section. It is the one page that is a read
 * of the whole workspace rather than an element, so it has no lockup and no
 * id: the title is the report's name behind the pulse codicon the tree uses
 * for it, which is why this page draws its own header instead of `PageHeader`.
 */
const model = useModel();
const ws = model.workspace;
const crumbs = $derived<[string, string][]>([["#", ws.name]]);
</script>

<header class="page-header">
	<Crumbs {crumbs} />
	<Heading level={1}>
		<i class="codicon codicon-pulse" aria-hidden="true"></i>
		Health
	</Heading>
	<p class="description">
		What the architecture is not happy with, read off the evidence layer:
		relationships marked for refactoring, compromises it tolerates, and claims
		nobody has written anything down about.
	</p>
</header>

<Section
	id="report"
	title="Health report"
	lead="Every row is a strategic claim the model makes about how two contexts meet. Refactor is the backlog the model implies, tolerated is the compromise it accepts, and no comments is the reconciliation list."
>
	<HealthReport />
</Section>

<style>
	.page-header {
		margin-bottom: 8px;
	}
	.codicon-pulse {
		color: var(--vscode-icon-foreground);
		font-size: 0.8em;
	}
	.description {
		margin: 4px 0 8px;
		max-width: 80ch;
		line-height: 1.5;
	}
</style>
