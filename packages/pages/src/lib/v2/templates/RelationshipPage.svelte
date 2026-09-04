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
import { useModel } from "../../model";
import Crumbs from "../molecules/Crumbs.svelte";
import RelationshipDetail from "../organisms/RelationshipDetail.svelte";

/**
 * One relationship as its own page: the trail back, then the same block the
 * strategic position expands in place, at title size. A relationship owns no
 * members and no sub-pages, so there is nothing to add around it — and the
 * uppercase "RELATIONSHIP" eyebrow v1 ended the trail with is gone, because
 * the two context lockups in the title already say what this is.
 */
const { relationship: r }: { relationship: ContextRelationship } = $props();
const model = useModel();
const crumbs = $derived<[string, string][]>([
	["#", model.workspace.name],
	[r.source.ref, r.source.name],
	[r.target.ref, r.target.name],
]);
</script>

<header class="page-header">
	<Crumbs {crumbs} />
</header>

<RelationshipDetail relationship={r} heading="h1" />
