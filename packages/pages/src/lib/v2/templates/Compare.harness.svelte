<script lang="ts">
import { petstoreModel } from "../../fixtures";
import ModelProvider from "../../ModelProvider.svelte";
import V1ContextPage from "../../templates/ContextPage.svelte";
import V1DomainPage from "../../templates/DomainPage.svelte";
import V1HealthPage from "../../templates/HealthPage.svelte";
import V1RelationshipPage from "../../templates/RelationshipPage.svelte";
import V1SubdomainPage from "../../templates/SubdomainPage.svelte";
import V1TeamPage from "../../templates/TeamPage.svelte";
import V1WorkspacePage from "../../templates/WorkspacePage.svelte";
import Theme from "../Theme.harness.svelte";
import {
	pickContext,
	pickDomain,
	pickRelationship,
	pickSubdomain,
	pickTeam,
} from "./picks.harness";
import V2Page, { type PageName } from "./V2Page.harness.svelte";

/**
 * The same page twice for the morning review: v1 as it ships on the left, v2
 * on the right, in two columns inside the 1200px the page is capped at. The v1
 * column takes its colours from the loaded page stylesheet, as it does today;
 * the v2 column carries its theme with it. Neither column gets the table of
 * contents — what is being compared is the content, and both columns draw the
 * same element, picked once in `picks.harness.ts`.
 */
const {
	page,
	mode = "light",
}: { page: PageName; mode?: "light" | "dark" | "hc" } = $props();

const model = petstoreModel();
const ws = model.workspace;
</script>

<ModelProvider {model}>
	<div class="compare">
		<section>
			<p class="label">v1</p>
			<div class="layout">
				<main>
					{#if page === "workspace"}
						<V1WorkspacePage />
					{:else if page === "domain"}
						<V1DomainPage domain={pickDomain(ws)} />
					{:else if page === "subdomain"}
						<V1SubdomainPage subdomain={pickSubdomain(ws)} />
					{:else if page === "context"}
						<V1ContextPage context={pickContext(ws)} />
					{:else if page === "relationship"}
						<V1RelationshipPage relationship={pickRelationship(ws)} />
					{:else if page === "team"}
						<V1TeamPage team={pickTeam(ws)} />
					{:else}
						<V1HealthPage />
					{/if}
				</main>
			</div>
		</section>
		<section>
			<p class="label">v2</p>
			<Theme {mode}><V2Page {page} {ws} /></Theme>
		</section>
	</div>
</ModelProvider>

<style>
	.compare {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 24px;
		max-width: 1200px;
		margin: 0 auto;
	}
	.compare :global(.layout) {
		padding: 0;
	}
	.label {
		margin: 0 0 4px;
		font-family: var(--vscode-editor-font-family);
		color: var(--vscode-descriptionForeground);
	}
</style>
