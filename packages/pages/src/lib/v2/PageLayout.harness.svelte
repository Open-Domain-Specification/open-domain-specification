<script lang="ts">
import type { BoundedContext } from "@open-domain-specification/core";
import { petstoreModel } from "../fixtures";
import ModelProvider from "../ModelProvider.svelte";
import Definition from "./Definition.svelte";
import DefinitionList from "./DefinitionList.svelte";
import Keyword from "./Keyword.svelte";
import Lockup from "./Lockup.svelte";
import AttributesSection from "./organisms/AttributesSection.svelte";
import PageHeader from "./organisms/PageHeader.svelte";
import Section from "./organisms/Section.svelte";
import Sidebar from "./organisms/Sidebar.svelte";
import Toc from "./organisms/Toc.svelte";
import PageLayout from "./PageLayout.svelte";

/**
 * The whole chrome of a page at once: the site's tree on the left, the sticky
 * toolbar, the header, a section of rows and the table of contents. It exists
 * so the frame can be judged as one thing rather than component by component —
 * the gutters, the 1200px cap, the 22px rhythm and the two columns only read
 * as a page when they are all on screen together.
 *
 * `nav` drops the sidebar, which is what the VS Code webview does: the tree
 * view is the navigation there.
 */
const { nav = true }: { nav?: boolean } = $props();

const model = petstoreModel();
const catalog = model.workspace.boundedcontexts.get(
	"catalog_bc",
) as BoundedContext;
const pet = catalog.aggregates.get("pet");
const attributes = [...(pet?.entities.get("pet")?.attributes.values() ?? [])];
const sections = [
	{ id: "attributes", label: "Attributes" },
	{ id: "position", label: "Strategic position" },
];
</script>

<ModelProvider {model}>
	<div class="site" class:with-nav={nav}>
		{#if nav}
			<div class="nav"><Sidebar current={pet?.ref ?? "#"} /></div>
		{/if}
		<div class="page">
			<PageLayout>
				{#snippet toolbar()}
					<i class="codicon codicon-arrow-left" aria-hidden="true"></i>
					<i class="codicon codicon-arrow-right" aria-hidden="true"></i>
					<span class="file">petstore.json</span>
				{/snippet}
				{#snippet toc()}<Toc {sections} active="attributes" />{/snippet}
				<PageHeader
					kind="aggregate"
					kindLabel="Aggregate"
					name={pet?.name ?? ""}
					id={pet?.id ?? ""}
					description={pet?.description}
					crumbs={[["#", model.workspace.name], [catalog.ref, catalog.name]]}
				>
					{#snippet facts()}
						<Definition term="Root">
							<Lockup kind="entity" name="Pet" ref={`${pet?.ref}/entities/pet`} />
						</Definition>
						<Definition term="Context">
							<Lockup kind="boundedcontext" name={catalog.name} ref={catalog.ref} />
						</Definition>
					{/snippet}
				</PageHeader>
				<AttributesSection
					{attributes}
					lead="An entity is known by its identity, not its attributes. Name the identity and keep the rest to what the model needs."
				/>
				<Section
					id="position"
					title="Strategic position"
					lead="Who this context depends on and who depends on it."
					count={1}
				>
					<p class="row">
						<Lockup kind="boundedcontext" name="Sales BC" ref="#/boundedcontexts/sales_bc" />
						<Keyword text="customer-supplier" />
					</p>
				</Section>
				<DefinitionList>
					<Definition term="Source"><code>petstore.json</code></Definition>
				</DefinitionList>
			</PageLayout>
		</div>
	</div>
</ModelProvider>

<style>
	.site {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		min-height: 100%;
	}
	.with-nav {
		grid-template-columns: 260px minmax(0, 1fr);
	}
	.nav {
		padding: 12px 8px;
		background: var(--vscode-sideBar-background);
		border-right: 1px solid var(--vscode-panel-border);
	}
	.page {
		min-width: 0;
	}
	.file {
		color: var(--vscode-descriptionForeground);
	}
	.row {
		margin: 0;
		padding: 0 8px;
		line-height: 22px;
	}
	code {
		font-family: var(--vscode-editor-font-family);
		font-size: 0.92em;
	}
</style>
