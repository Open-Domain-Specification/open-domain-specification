<script lang="ts">
import { Workspace } from "@open-domain-specification/core";
import { onMount, untrack } from "svelte";
import ModelProvider from "../lib/ModelProvider.svelte";
import type { Model } from "../lib/model";
import Sidebar from "../lib/organisms/Sidebar.svelte";
import Page from "../lib/Page.svelte";
import { createRouter } from "../lib/router.svelte";
import {
	type Bootstrap,
	embedded,
	type HostMessage,
	vscode,
	type WorkspacePayload,
} from "./host";
import ImportScreen from "./ImportScreen.svelte";
import WorkspacePicker from "./WorkspacePicker.svelte";

/** Workspaces handed in by the host skip the import screen; more than one shows a picker. */
let { initial }: { initial?: Bootstrap } = $props();
const router = createRouter();
let models = $state<Model[]>(
	untrack(() => initial?.workspaces?.map(load) ?? []),
);
let chosen = $state<number | undefined>(
	untrack(() => (initial?.workspaces?.length === 1 ? 0 : undefined)),
);
const model = $derived(chosen === undefined ? undefined : models[chosen]);

function load(w: WorkspacePayload): Model {
	const workspace = Workspace.fromSchema(
		w.schema as Parameters<typeof Workspace.fromSchema>[0],
	);
	return {
		workspace,
		fileLabel: w.fileLabel,
		diagnostics: w.diagnostics ?? workspace.validate(),
	};
}

onMount(() => {
	if (initial?.ref) router.go(initial.ref);
	const host = vscode;
	if (!host) return;
	const onMessage = (e: MessageEvent<HostMessage>) => {
		const msg = e.data;
		if (msg.type === "toolbar") {
			host.postMessage({ type: msg.action, ref: router.ref });
		} else if (msg.type === "model") {
			models = msg.workspaces.map(load);
			chosen = 0;
			if (msg.ref) router.go(msg.ref);
		} else if (msg.type === "navigate") router.go(msg.ref);
	};
	window.addEventListener("message", onMessage);
	host.postMessage({ type: "ready" });
	return () => window.removeEventListener("message", onMessage);
});

$effect(() => {
	vscode?.postMessage({ type: "navigated", ref: router.ref });
});
</script>

{#if model}
	{#key model}
		<ModelProvider {model}>
			<div class="site" class:embedded={embedded}>
				{#if !embedded}<Sidebar current={router.ref} />{/if}
				<div class="site-page"><Page ref={router.ref} /></div>
			</div>
		</ModelProvider>
	{/key}
{:else if embedded}
	<div class="layout"><main><p class="empty">Workspace not loaded.</p></main></div>
{:else if models.length > 1}
	<WorkspacePicker {models} onpick={(i) => (chosen = i)} />
{:else}
	<ImportScreen examples={initial?.examples ?? []} onload={(schema, fileLabel) => { models = [load({ schema, fileLabel })]; chosen = 0; }} />
{/if}
