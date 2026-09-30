<script lang="ts">
import Logo from "../lib/atoms/Logo.svelte";
import type { Example } from "../protocol";

/** Import by URL (query parameter or form), by file upload, or from an example card; the last URL is remembered. */
let {
	onload,
	onopened,
	examples = [],
}: {
	onload: (schema: unknown, fileLabel: string) => void;
	/** Called after a load the reader asked for has been handed to `onload`. */
	onopened?: () => void;
	examples?: Example[];
} = $props();
const KEY = "ods-viewer-url";

function toAbsoluteUrl(raw?: string | null): string {
	if (!raw?.trim()) return "";
	try {
		return new URL(raw.trim(), document.baseURI).href;
	} catch {
		return raw.trim();
	}
}

let url = $state(
	toAbsoluteUrl(
		new URLSearchParams(location.search).get("url") ?? remembered(),
	),
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

const NEXT = "Choose a workspace file from a project's .ods folder.";

/** A load that failed says what went wrong and what to do about it, since it is read aloud with nothing else on screen to point at. */
async function fromUrl(asked = false) {
	const target = toAbsoluteUrl(url);
	url = target;
	loading = true;
	error = undefined;
	try {
		let res: Response;
		try {
			res = await fetch(target);
		} catch {
			throw new Error(
				`Could not reach ${target}. Check the address and your connection, and that the host allows cross-origin requests, then choose Load to try again.`,
			);
		}
		if (!res.ok)
			throw new Error(
				`The server answered ${res.status} for ${target}. Check the address is correct and the file is public, then choose Load to try again.`,
			);
		let schema: unknown;
		try {
			schema = await res.json();
		} catch {
			throw new Error(
				`${target} is not valid JSON. Point it at the workspace file in a project's .ods folder, not at a web page, then choose Load.`,
			);
		}
		const label = target.split("/").pop() || target;
		try {
			localStorage.setItem(KEY, target);
		} catch {}
		open(schema, label, asked);
	} catch (e) {
		// Every path above throws an Error of its own, so the message is always one to show.
		error = (e as Error).message;
	} finally {
		loading = false;
	}
}

/**
 * Hands the parsed JSON to the host; a throw means it was valid JSON but not a
 * workspace. `asked` is true when the reader did it (Load, Enter in the field,
 * a file choice, an example card) and false for the `?url=` deep link that
 * loads by itself, and only an asked load tells the host it has opened.
 */
function open(schema: unknown, label: string, asked: boolean) {
	try {
		onload(schema, label);
	} catch {
		throw new Error(
			`${label} is valid JSON but is not an Open Domain Specification workspace: it does not match the workspace schema. ${NEXT}`,
		);
	}
	if (asked) onopened?.();
}

async function fromFile(e: Event) {
	const file = (e.target as HTMLInputElement).files?.[0];
	if (!file) return;
	error = undefined;
	try {
		let schema: unknown;
		try {
			schema = JSON.parse(await file.text());
		} catch {
			throw new Error(`${file.name} is not valid JSON. ${NEXT}`);
		}
		open(schema, file.name, true);
	} catch (err) {
		error = (err as Error).message;
	}
}

function fromExample(example: Example) {
	url = toAbsoluteUrl(example.url);
	fromUrl(true);
}

if (new URLSearchParams(location.search).get("url")) fromUrl();
</script>

<div class="screen">
	<main class="import">
		<h1 class="brand"><Logo size={32} /> Open a workspace</h1>
		<p class="lead">Load an Open Domain Specification workspace file to browse it.</p>
		<form onsubmit={(e) => { e.preventDefault(); fromUrl(true); }}>
			<label for="url">From a URL</label>
			<div class="row">
				<input
					id="url"
					type="url"
					bind:value={url}
					onchange={() => {
						if (url) url = toAbsoluteUrl(url);
					}}
					placeholder="https://example.com/.ods/petstore.json"
					readonly={loading}
					required
				/>
				<button type="submit" disabled={loading}>{loading ? "Loading…" : "Load"}</button>
			</div>
			<p class="dim">The file is fetched directly from the URL by your browser, so it must allow cross-origin requests.</p>
		</form>
		<label for="file">From a file</label>
		<input id="file" type="file" accept=".json,application/json" onchange={fromFile} />
		<div role="status" class="status dim">{#if loading}Loading the workspace…{/if}</div>
		<div role="alert">{#if error}<p class="problems error">{error}</p>{/if}</div>
		{#if examples.length}
			<h2 class="examples-title">Or try an example</h2>
			<div class="grid examples">
				{#each examples as example (example.url)}
					<button type="button" class="card example" style:--tint={example.color} onclick={() => fromExample(example)} disabled={loading}>
						<span class="card-head">{example.name}</span>
						{#if example.description}<span class="dim">{example.description}</span>{/if}
					</button>
				{/each}
			</div>
		{/if}
	</main>
</div>

<style>
	.import { max-width: 640px; margin: 48px auto; }
	.brand { display: flex; align-items: center; gap: 10px; }
	.row { display: flex; gap: 8px; }
	.row input { flex: 1; }
	label { display: block; margin: 16px 0 6px; font-weight: 600; }
	input, button { font: inherit; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); color: inherit; }
	button { cursor: pointer; }
	.error { color: var(--error); }
	.examples-title { margin: 28px 0 10px; font-size: 1rem; font-weight: 600; }
	.examples { gap: 10px; }
	.example { --tint: var(--accent); display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left; margin: 0; padding: 12px 14px; border-left: 3px solid var(--tint); cursor: pointer; }
	.example:hover:not(:disabled) { border-color: var(--tint); }
	.example .card-head { color: var(--tint); }
	.example:disabled { cursor: default; opacity: 0.6; }
</style>
