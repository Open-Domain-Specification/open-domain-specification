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
/** The last file the reader picked, shown beside the control; it outlives a failed load and a cancelled or empty pick. */
let chosen = $state("");

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
	const input = e.target as HTMLInputElement;
	const file = input.files?.[0];
	if (!file) return;
	// A browser fires no change when the reader picks the file the input already holds, so a failed file could never be tried again; emptying the input once the file is in hand lets the same pick count as a new one. The File stays readable.
	input.value = "";
	chosen = file.name;
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
		<div class="picker">
			<span class="choose">
				<input id="file" type="file" accept=".json,application/json" onchange={fromFile} />
				<span class="face" aria-hidden="true">Choose a file…</span>
			</span>
			<span class="chosen dim">{chosen}</span>
		</div>
		<div role="status" class="status dim">{#if loading}Loading the workspace…{/if}</div>
		<div role="alert">{#if error}<p class="problems error"><i class="codicon codicon-error" aria-hidden="true"></i><span class="message">{error}</span></p>{/if}</div>
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
	/* The load error is a Problems row: the error codicon in the error colour in a 16px gutter, the message in the foreground colour. */
	.problems.error { display: grid; grid-template-columns: 16px minmax(0, 1fr); column-gap: 8px; line-height: 22px; }
	.problems .codicon { font-size: 1em; line-height: inherit; text-align: center; color: var(--error); }
	.problems .message { color: var(--fg); overflow-wrap: anywhere; }
	.picker { display: flex; align-items: center; gap: 10px; }
	.choose { position: relative; display: inline-flex; flex: none; }
	/* The native input stays the control: the keyboard focus target and what the pointer lands on, with the picker it opens. It only stops being seen; the face under it is what is drawn. */
	.choose input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; opacity: 0; cursor: pointer; }
	.choose input::file-selector-button { cursor: pointer; }
	.face { display: inline-flex; align-items: center; padding: 6px 10px; border: 1px solid transparent; border-radius: var(--radius); background: var(--vscode-button-background); color: var(--vscode-button-foreground); font-family: inherit; }
	input:focus-visible + .face { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
	.chosen { min-width: 0; overflow-wrap: anywhere; }
	.examples-title { margin: 28px 0 10px; font-size: 1rem; font-weight: 600; }
	.examples { gap: 10px; }
	.example { --tint: var(--accent); display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left; margin: 0; padding: 12px 14px; border-left: 3px solid var(--tint); cursor: pointer; }
	.example:hover:not(:disabled) { border-color: var(--tint); }
	.example .card-head { color: var(--fg); }
	.example:disabled { cursor: default; opacity: 0.6; }
</style>
