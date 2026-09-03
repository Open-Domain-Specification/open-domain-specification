<script module lang="ts">
/**
 * The relationship detail carries its own headings, so the table of contents
 * points straight at them rather than at wrapper sections.
 */
export const sections = [
	{ id: "roles", label: "Roles" },
	{ id: "comments", label: "Comments" },
	{ id: "crossings", label: "Crossings" },
	{ id: "links", label: "Links" },
];
</script>

<script lang="ts">
import type { ContextRelationship } from "@open-domain-specification/core";
import RefLink from "../atoms/RefLink.svelte";
import { useModel } from "../model";
import RelationshipDetail from "../organisms/RelationshipDetail.svelte";

/**
 * One relationship as its own page. It renders the same block the strategic
 * position table expands in place, at page level: a relationship owns no
 * members and no sub-pages, so there is nothing to add around it but the
 * trail back to the workspace and to the two contexts it joins.
 */
const { relationship: r }: { relationship: ContextRelationship } = $props();
const model = useModel();
</script>

<header class="page-head">
	<nav class="crumbs">
		<RefLink ref="#" label={model.workspace.name} /><span class="sep">›</span>
		<RefLink ref={r.source.ref} label={r.source.name} /><span class="sep">›</span>
		<RefLink ref={r.target.ref} label={r.target.name} /><span class="sep">›</span>
		<span class="kind">Relationship</span>
	</nav>
</header>

<RelationshipDetail relationship={r} heading="h1" />
