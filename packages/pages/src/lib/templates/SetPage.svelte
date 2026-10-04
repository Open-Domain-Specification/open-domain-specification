<script module lang="ts">
export const sections = [
	{ id: "workspaces", label: "Workspaces" },
	{ id: "map", label: "Context map" },
	{ id: "problems", label: "Problems" },
];
</script>

<script lang="ts">
import { ODSContextMap } from "@open-domain-specification/core";
import type { Column } from "../atoms/DataTable.svelte";
import DataTable from "../atoms/DataTable.svelte";
import EmptyState from "../atoms/EmptyState.svelte";
import Heading from "../atoms/Heading.svelte";
import Keyword from "../atoms/Keyword.svelte";
import Lockup from "../atoms/Lockup.svelte";
import Notice from "../atoms/Notice.svelte";
import type { LoadedSet, SetFile } from "../load";
import { provideSet } from "../model";
import { routeIn } from "../route";
import Problems from "../molecules/Problems.svelte";
import DiagramFigure from "../organisms/DiagramFigure.svelte";
import PageHeader from "../organisms/PageHeader.svelte";
import Section from "../organisms/Section.svelte";
import { contextGraph } from "../flow/graph";
import ModelProvider from "../ModelProvider.svelte";

/**
 * The set as one reader holds it: every file is a workspace of its own, listed
 * here with its file, what it holds and what is wrong with it, and the map is
 * drawn across all of them with the contexts of different files kept apart
 * even where their ids agree. There is no merged workspace behind this page:
 * the list is the files, and each link goes to exactly one of them.
 */
const { loaded, missing }: { loaded: LoadedSet; missing?: string } = $props();
// svelte-ignore state_referenced_locally
provideSet(loaded.set);
const files = $derived(loaded.files);
const contextMap = $derived(ODSContextMap.fromSet(loaded.set));
const relationships = $derived(files.flatMap((f) => f.workspace.relationships));
const withProblems = $derived(files.filter((f) => f.diagnostics.length));

const columns: Column[] = [
	{ key: "name", label: "Workspace" },
	{ key: "file", label: "File" },
	{ key: "contexts", label: "Contexts", numeric: true },
	{ key: "problems", label: "Problems", numeric: true },
	{ key: "state", label: "State" },
];
const count = (f: SetFile, severity: "error" | "warning") =>
	f.diagnostics.filter((d) => d.severity === severity).length;
const problemsOf = (f: SetFile) => {
	const errors = count(f, "error");
	const warnings = count(f, "warning");
	return errors || warnings
		? `${errors} ${errors === 1 ? "error" : "errors"}, ${warnings} ${warnings === 1 ? "warning" : "warnings"}`
		: "none";
};
</script>

<PageHeader description="Each file is one workspace. The contexts in different files stay apart, and a link goes to the file that owns what it names.">
	{#snippet title()}<Lockup kind="workspace" name="Workspaces" detail={`${files.length} ${files.length === 1 ? "file" : "files"}`} size="title" />{/snippet}
</PageHeader>

{#if missing}<Notice kind="missing" message={`This address names no workspace file in the project: ${missing}. Choose one from the list.`} />{/if}
{#each loaded.notices as message (message)}<Notice kind="incomplete" {message} />{/each}

<Section id="workspaces" title="Workspaces" lead="One per file, in the order the host listed them." count={files.length}>
	<DataTable {columns} rows={files} rowId={(f) => f.path} empty="No workspace file loaded.">
		{#snippet cell(f, col)}
			{#if col.key === "name"}
				<Lockup kind="workspace" name={f.workspace.name} id={f.workspace.id} ref={routeIn(loaded.set, f.path, "#")} />
			{:else if col.key === "file"}
				<code>{f.fileLabel}</code>
			{:else if col.key === "contexts"}
				{f.workspace.boundedcontexts.size}
			{:else if col.key === "problems"}
				{problemsOf(f)}
			{:else if f.stale}
				<Keyword text="last good load" tone="warn" title={f.stale} />
			{:else}
				<Keyword text="loaded" />
			{/if}
		{/snippet}
	</DataTable>
</Section>

<Section id="map" title="Context map" lead="Every context of every file, nested under its workspace. A line between files is a relationship or consumption that names the other file." count={contextMap.nodes.size}>
	<DiagramFigure caption="Context map of the set" emptyText="No bounded contexts yet." graph={contextGraph(contextMap, relationships)} />
</Section>

<Section id="problems" title="Problems" lead="What the rules find, in the file each finding is about. A file that could not be loaded is named with what to do about it." count={withProblems.length + loaded.excluded.length}>
	{#each loaded.excluded as e (e.path)}
		<p class="excluded" role="alert"><i class="codicon codicon-error" aria-hidden="true"></i><span>{e.message}</span></p>
	{/each}
	{#each withProblems as f, i (f.path)}
		<Heading level={3} id={`problems-${i}`}><Lockup kind="workspace" name={f.workspace.name} ref={routeIn(loaded.set, f.path, "#")} detail={f.fileLabel} /></Heading>
		<ModelProvider model={f.model}><Problems problems={f.diagnostics} /></ModelProvider>
	{:else}
		{#if loaded.excluded.length === 0}<EmptyState text="No problems found in any file." />{/if}
	{/each}
</Section>

<style>
	.excluded {
		display: grid;
		grid-template-columns: 16px minmax(0, 1fr);
		column-gap: 8px;
		margin: 0 0 8px;
		line-height: 22px;
	}
	.excluded .codicon {
		color: var(--vscode-editorError-foreground);
		text-align: center;
	}
	.excluded span {
		overflow-wrap: anywhere;
	}
</style>
