<script lang="ts">
import type { Invariant, Workspace } from "@open-domain-specification/core";
import { edgeCaseModel, petstoreModel } from "../../fixtures";
import InvariantsSection from "./InvariantsSection.svelte";

/**
 * The invariants an entity is constrained by. `constrains` turns on the third
 * column the aggregate page adds; `dense` widens the list to three
 * aggregates', including one rule that names nothing in particular and one
 * that names a single attribute, so both readings of the column are on screen.
 */
const {
	constrains = false,
	dense = false,
	empty = false,
}: { constrains?: boolean; dense?: boolean; empty?: boolean } = $props();

const invariantsOf = (workspace: Workspace, bc: string, aggregate: string) => [
	...(workspace.boundedcontexts
		.get(bc)
		?.aggregates.get(aggregate)
		?.invariants.values() ?? []),
];
const petstore = petstoreModel().workspace;
const invariants = $derived<Invariant[]>(
	dense
		? [
				...invariantsOf(petstore, "catalog_bc", "pet"),
				...invariantsOf(petstore, "sales_bc", "order"),
				...invariantsOf(
					edgeCaseModel().workspace,
					"main_context",
					"rootless_aggregate",
				),
			]
		: invariantsOf(petstore, "catalog_bc", "pet"),
);
</script>

<InvariantsSection
	invariants={empty ? [] : invariants}
	{constrains}
	title={constrains ? "Invariants" : "Constrained by"}
	lead="Invariants that name this entity explicitly. The root enforces them on every change."
	emptyText="No invariant names this entity."
/>
