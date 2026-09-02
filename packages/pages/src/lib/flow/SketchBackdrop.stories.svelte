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
const cluster = (id: string, parentId?: string): Node => ({
	id,
	type: "cluster",
	position: { x: 0, y: 0 },
	parentId,
	data: {},
	width: 1,
	height: 1,
	hidden: true,
});
const nodes: Node[] = [
	cluster("cluster:sales"),
	cluster("cluster:support"),
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
	["cluster:commerce", "Commerce"],
	["cluster:service", "Customer Service"],
	["cluster:orders", "Orders"],
	["cluster:billing", "Billing"],
	["cluster:helpdesk", "Helpdesk"],
	["cluster:returns", "Returns"],
]);
/** Two domains of two subdomains each: thick borders between the domains, names along them. */
const domains: Node[] = [
	cluster("cluster:commerce"),
	cluster("cluster:service"),
	cluster("cluster:orders", "cluster:commerce"),
	cluster("cluster:billing", "cluster:commerce"),
	cluster("cluster:helpdesk", "cluster:service"),
	cluster("cluster:returns", "cluster:service"),
	ctx("Ordering", 40, 40, "cluster:orders"),
	ctx("Catalogue", 320, 20, "cluster:orders"),
	ctx("Invoicing", 620, 60, "cluster:billing"),
	ctx("Payments", 900, 40, "cluster:billing"),
	ctx("Helpdesk", 80, 340, "cluster:helpdesk"),
	ctx("Knowledge", 400, 360, "cluster:helpdesk"),
	ctx("Returns", 700, 340, "cluster:returns"),
	ctx("Refunds", 960, 360, "cluster:returns"),
];
const { Story } = defineMeta({
	title: "Flow/SketchBackdrop",
	component: SketchBackdrop,
	render: Harness,
	args: { nodes, groupLabels },
});
</script>

<Story name="Two regions and a loose node" />
<Story name="Two domains with subdomains" args={{ nodes: domains }} />
<Story name="Tight padding" args={{ padding: 12 }} />
<Story name="Single node" args={{ nodes: [ctx("Alone", 100, 100, "cluster:sales")] }} />
