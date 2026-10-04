<script lang="ts">
import { onDestroy, onMount, tick, untrack } from "svelte";
import EmptyState from "../lib/atoms/EmptyState.svelte";
import Notice from "../lib/atoms/Notice.svelte";
import SkipLink from "../lib/atoms/SkipLink.svelte";
import { focusArrival } from "../lib/focus";
import { type Loaded, loadPayloads } from "../lib/load";
import ModelProvider from "../lib/ModelProvider.svelte";
import Page from "../lib/Page.svelte";
import { modelRefToHash } from "../lib/ref-transport";
import { routeTarget } from "../lib/route";
import { createRouter } from "../lib/router.svelte";
import PageLayout from "../lib/templates/PageLayout.svelte";
import SetPage, {
	sections as setSections,
} from "../lib/templates/SetPage.svelte";
import type { ShellMessage } from "../protocol";
import { type Bootstrap, embedded, type HostMessage, vscode } from "./host";
import ImportScreen from "./ImportScreen.svelte";
import SiteNav from "./SiteNav.svelte";
import WorkspacePicker from "./WorkspacePicker.svelte";

/**
 * What is handed in by the host skips the import screen. One entry (a
 * workspace opened alone, or one set of files) opens at once; several show a
 * picker. A set is read through its own routes: see `lib/route.ts`.
 */
let { initial }: { initial?: Bootstrap } = $props();
const router = createRouter();
onDestroy(router.destroy);
let entries = $state<Loaded[]>(
	untrack(() => (initial?.workspaces ? loadPayloads(initial.workspaces) : [])),
);
let chosen = $state<number | undefined>(
	untrack(() => (entries.length === 1 ? 0 : undefined)),
);
const entry = $derived(chosen === undefined ? undefined : entries[chosen]);

/** What the route is, in the entry on screen: a page of one workspace, or the set's own page. */
const view = $derived.by(() => {
	if (!entry) return undefined;
	if (entry.kind === "workspace")
		return { kind: "page" as const, model: entry.model, ref: router.ref };
	const target = entry.loaded.set.workspaces.length
		? routeTarget(entry.loaded.set, router.ref)
		: ({ kind: "set" } as const);
	if (target.kind === "workspace") {
		const model = entry.loaded.modelOf(target.workspace);
		if (model) return { kind: "page" as const, model, ref: target.ref };
	}
	return {
		kind: "set" as const,
		loaded: entry.loaded,
		missing: target.kind === "unknown-file" ? target.file : undefined,
	};
});

/** The reader imported a workspace, whose heading names it, so focus goes there. A `?url=` deep link and the host's model message never call this. */
function opened() {
	tick().then(() =>
		focusArrival(document.querySelector("main h1") as HTMLElement),
	);
}

onMount(() => {
	if (initial?.ref) router.go(initial.ref);
	const host = vscode;
	if (!host) return;
	const onMessage = (e: MessageEvent<HostMessage>) => {
		const msg = e.data;
		if (msg.type === "toolbar") {
			if (msg.action === "back") router.back();
			else if (msg.action === "forward") router.forward();
			else host.postMessage({ type: msg.action, ref: router.ref });
		} else if (msg.type === "model") {
			entries = loadPayloads(msg.workspaces);
			chosen = 0;
			if (msg.reset) router.reset(msg.ref ?? "#");
			else if (msg.ref) router.go(msg.ref);
		} else if (msg.type === "navigate") router.go(msg.ref);
		else if (msg.type === "probe") {
			const attr = (selector: string, name: string) =>
				[...document.querySelectorAll(selector)].map(
					(el) => el.getAttribute(name) as string,
				);
			host.postMessage({
				type: "rendered",
				hrefs: attr(".md a[href]", "href"),
				images: attr(".md img", "src"),
				...(msg.selectors && {
					probed: Object.fromEntries(
						msg.selectors.map((selector) => [
							selector,
							[...document.querySelectorAll(selector)].map((el) => ({
								text: el.textContent as string,
								class: el.getAttribute("class"),
								title: el.getAttribute("title"),
								href: el.getAttribute("href"),
							})),
						]),
					),
				}),
			});
		}
	};
	window.addEventListener("message", onMessage);
	host.postMessage({ type: "ready" });
	return () => window.removeEventListener("message", onMessage);
});

$effect(() => {
	vscode?.postMessage({ type: "navigated", ref: router.ref });
});

/** The shell's Back and Forward buttons are enabled by where the router stands. */
$effect(() => {
	if (!embedded) return;
	const message: ShellMessage = {
		type: "history",
		canGoBack: router.canGoBack,
		canGoForward: router.canGoForward,
	};
	window.postMessage(message, "*");
});
</script>

{#if view?.kind === "page"}
	{#key view.model}
		<ModelProvider model={view.model}>
			<div class="site" class:embedded={embedded}>
				{#if !embedded}<SkipLink href={modelRefToHash(router.ref)} />{/if}
				{#if !embedded}<SiteNav current={view.ref} />{/if}
				<div class="site-page">
					{#if view.model.stale}<Notice kind="stale" message={`Showing the last version of ${view.model.fileLabel} that loaded. ${view.model.stale}`} />{/if}
					{#each view.model.loaded?.excluded ?? [] as left (left.path)}<Notice kind="excluded" message={left.message} />{/each}
					{#each view.model.loaded?.notices ?? [] as message (message)}<Notice kind="incomplete" {message} />{/each}
					<Page ref={view.ref} arrivals={router.arrivals} />
				</div>
			</div>
		</ModelProvider>
	{/key}
{:else if view?.kind === "set"}
	<div class="site no-nav" class:embedded={embedded}>
		{#if !embedded}<SkipLink href={modelRefToHash(router.ref)} />{/if}
		<div class="site-page"><PageLayout sections={setSections}><SetPage loaded={view.loaded} missing={view.missing} /></PageLayout></div>
	</div>
{:else if embedded}
	<main class="not-loaded"><EmptyState text="Workspace not loaded." /></main>
{:else if entries.length > 1}
	<WorkspacePicker {entries} onpick={(i) => (chosen = i)} />
{:else}
	<ImportScreen examples={initial?.examples ?? []} onload={(schema, fileLabel) => { entries = loadPayloads([{ schema, fileLabel }]); chosen = 0; }} onloadset={(payloads, notices) => { entries = loadPayloads(payloads, notices); chosen = 0; }} onopened={opened} />
{/if}

<style>
	/* The webview before a workspace arrives: the page gutter and nothing
	   else, since there is no layout worth drawing around one sentence. */
	.not-loaded {
		padding: 16px 24px;
	}
	/* The set's own page has no tree beside it (its table of workspaces is the navigation), so the page takes the whole width. */
	.site.no-nav {
		grid-template-columns: minmax(0, 1fr);
	}
</style>
