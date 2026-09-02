<script module lang="ts">
import { defineMeta } from "@storybook/addon-svelte-csf";
import RefLink from "./RefLink.svelte";

const { Story } = defineMeta({ title: "Atoms/RefLink", component: RefLink });
</script>

<Story name="With icon" args={{ ref: "#/boundedcontexts/sales_bc", label: "Sales BC", icon: "symbol-class" }} />
<Story name="Plain" args={{ ref: "#/teams/orders_team", label: "Orders Team" }} />
