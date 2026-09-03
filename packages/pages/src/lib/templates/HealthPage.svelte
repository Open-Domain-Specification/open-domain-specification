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
	 * The health report on a page of its own (RFC-002 section 4.5), reached
	 * from the workspace page's Health section. The workspace page shows only
	 * the summary strip; a reader who wants the backlog behind the numbers
	 * comes here, where the whole report has the width to itself.
	 */
	const model = useModel();
	const ws = model.workspace;
	const crumbs = $derived<[string, string][]>([["#", ws.name]]);
</script>

<PageHeader
	kind="Report"
	icon="pulse"
	name="Health"
	id="health"
	description="What the architecture is not happy with, read off the evidence layer: relationships marked for refactoring, compromises it tolerates, and claims nobody has written anything down about."
	{crumbs}
/>

<Section
	id="report"
	title="Health report"
	lead="Every row is a strategic claim the model makes about how two contexts meet. Refactor is the backlog the model implies, tolerated is the compromise it accepts, and no comments is the reconciliation list."
>
	<HealthReport />
</Section>
