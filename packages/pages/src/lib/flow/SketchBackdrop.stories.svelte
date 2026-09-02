<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import type { Node } from "@xyflow/svelte";
import Harness from "./SketchBackdrop.harness.svelte";
import SketchBackdrop from "./SketchBackdrop.svelte";

const ctx = (id: string, x: number, y: number, parentId?: string): Node => ({
	id,
	type: "default",
	position: { x, y },
	parentId,
	data: { label: id },
});
const nodes: Node[] = [
	{
		id: "cluster:sales",
		type: "cluster",
		position: { x: 0, y: 0 },
		data: {},
		width: 1,
		height: 1,
		hidden: true,
	},
	{
		id: "cluster:support",
		type: "cluster",
		position: { x: 0, y: 0 },
		data: {},
		width: 1,
		height: 1,
		hidden: true,
	},
	ctx("Ordering", 40, 40, "cluster:sales"),
	ctx("Billing", 320, 20, "cluster:sales"),
	ctx("Catalogue", 620, 60, "cluster:sales"),
	ctx("Helpdesk", 80, 320, "cluster:support"),
	ctx("Returns", 400, 340, "cluster:support"),
	ctx("Legacy", 700, 300),
];
const groupLabels = new Map([
	["cluster:sales", "Sales"],
	["cluster:support", "Support"],
]);
const { Story } = defineMeta({
	title: "Flow/SketchBackdrop",
	component: SketchBackdrop,
	render: Harness,
	args: { nodes, groupLabels },
});
</script>

<Story name="Two regions and a loose node" />
<Story name="Tight padding" args={{ padding: 12 }} />
<Story name="Single node" args={{ nodes: [ctx("Alone", 100, 100, "cluster:sales")] }} />
