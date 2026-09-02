<script lang="ts">
/** Import by URL (query parameter or form) or by file upload; the last URL is remembered. */
let { onload }: { onload: (schema: unknown, fileLabel: string) => void } =
	$props();
const KEY = "ods-viewer-url";
let url = $state(
	new URLSearchParams(location.search).get("url") ?? remembered(),
);
let error = $state<string | undefined>();
let loading = $state(false);

function remembered(): string {
	try {
		return localStorage.getItem(KEY) ?? "";
	} catch {
		return "";
	}
}

async function fromUrl() {
	loading = true;
	error = undefined;
	try {
		const res = await fetch(url);
		if (!res.ok)
			throw new Error(`Failed to fetch workspace from ${url} (${res.status})`);
		const schema = await res.json();
		try {
			localStorage.setItem(KEY, url);
		} catch {}
		onload(schema, url.split("/").pop() || url);
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	} finally {
		loading = false;
	}
}

async function fromFile(e: Event) {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (!file) return;
	error = undefined;
	try {
		onload(JSON.parse(await file.text()), file.name);
	} catch (err) {
		error = err instanceof Error ? err.message : String(err);
	}
}

if (new URLSearchParams(location.search).get("url")) fromUrl();
</script>

<div class="layout">
	<main class="import">
		<h1><i class="codicon codicon-package"></i> Open a workspace</h1>
		<p class="lead">Load an Open Domain Specification workspace file to browse it.</p>
		<form onsubmit={(e) => { e.preventDefault(); fromUrl(); }}>
			<label for="url">From a URL</label>
			<div class="row">
				<input id="url" type="url" bind:value={url} placeholder="https://example.com/.ods/petstore.json" readonly={loading} required />
				<button type="submit" disabled={loading}>{loading ? "Loading…" : "Load"}</button>
			</div>
			<p class="dim">The file is fetched directly from the URL by your browser, so it must allow cross-origin requests.</p>
		</form>
		<label for="file">From a file</label>
		<input id="file" type="file" accept=".json,application/json" onchange={fromFile} />
		{#if error}<p class="problems error">{error}</p>{/if}
	</main>
</div>

<style>
	.import { max-width: 640px; margin: 48px auto; }
	.row { display: flex; gap: 8px; }
	.row input { flex: 1; }
	label { display: block; margin: 16px 0 6px; font-weight: 600; }
	input, button { font: inherit; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); color: inherit; }
	button { cursor: pointer; }
	.error { color: var(--error); }
</style>
