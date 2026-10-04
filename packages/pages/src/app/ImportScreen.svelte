<script lang="ts">
import Logo from "../lib/atoms/Logo.svelte";
import { readUpload } from "../lib/upload-set";
import { incompleteness, loadFromUrls } from "../lib/url-set";
import type { Example, WorkspacePayload } from "../protocol";

/**
 * Import by URL (query parameter or form), by file upload, by folder upload,
 * or from an example card; the last URL is remembered. A workspace read alone
 * goes to `onload`; several files that belong together go to `onloadset`, with
 * what the reader must be told about them.
 */
let {
	onload,
	onloadset = () => {},
	onopened,
	examples = [],
}: {
	onload: (schema: unknown, fileLabel: string) => void;
	/** The files of one set, and the notices that go with them (what could not be loaded, what a URL read cannot see). */
	onloadset?: (payloads: WorkspacePayload[], notices: string[]) => void;
	/** Called after a load the reader asked for has been handed to `onload` or `onloadset`. */
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

const query = new URLSearchParams(location.search);
const queried = query.getAll("url");
let url = $state(
	queried.length > 1 ? "" : toAbsoluteUrl(queried[0] ?? remembered()),
);
/** Several files to start from, one address a line (all of them, when the address named several), and the folder they lie under. */
let more = $state(
	queried.length > 1 ? queried.map(toAbsoluteUrl).join("\n") : "",
);
let root = $state(toAbsoluteUrl(query.get("root")));
let error = $state<string | undefined>();
let loading = $state(false);
/** The last file the reader picked, shown beside the control; it outlives a failed load and a cancelled or empty pick. */
let chosen = $state("");
/** The folder the reader last picked, shown beside its control. */
let chosenFolder = $state("");
/** How many files the reader last picked together, shown beside their control. */
let chosenFiles = $state("");

function remembered(): string {
	try {
		return localStorage.getItem(KEY) ?? "";
	} catch {
		return "";
	}
}

const NEXT = "Choose a workspace file from a project's .ods folder.";

/** The addresses to start from: the main field, then one more per line, each made absolute, none twice. */
function entriesOf(first: string, rest: string): string[] {
	const all = [first, ...rest.split("\n").map(toAbsoluteUrl)].filter(Boolean);
	return [...new Set(all)];
}

/** A load that failed says what went wrong and what to do about it, since it is read aloud with nothing else on screen to point at. */
async function fromUrl(asked = false) {
	url = toAbsoluteUrl(url);
	const entries = entriesOf(url, more);
	if (entries.length === 0) return;
	const target = entries[0];
	loading = true;
	error = undefined;
	try {
		const load = await loadFromUrls({
			entries,
			root: toAbsoluteUrl(root) || undefined,
			// One argument, as a plain page would call it: the address and nothing else.
			fetchFn: (address) => fetch(address),
		});
		if (load.files.length === 0)
			// Every path above gives a failure its own message, so there is always one to show.
			throw new Error(load.failures[0].message);
		try {
			localStorage.setItem(KEY, target);
		} catch {}
		if (load.files.length === 1 && load.failures.length === 0 && !load.linked) {
			const label = target.split("/").pop() || target;
			open(load.files[0].schema, label, asked);
		} else {
			const payloads = load.files.map((f) => ({
				schema: f.schema,
				fileLabel: f.path,
				path: f.path,
				set: "urls",
			}));
			openSet(
				payloads,
				[...load.failures.map((f) => f.message), incompleteness(load)],
				asked,
			);
		}
	} catch (e) {
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

/** The files of one set, handed to the host; a throw means the JSON was valid but no workspace could be made. */
function openSet(
	payloads: WorkspacePayload[],
	notices: string[],
	asked: boolean,
) {
	try {
		onloadset(payloads, notices);
	} catch {
		throw new Error(
			`The files are valid JSON but are not an Open Domain Specification workspace set: they do not match the workspace schema. ${NEXT}`,
		);
	}
	if (asked) onopened?.();
}

/** Several files, or a folder, picked from this computer: they are a set, complete by construction. */
async function fromPicked(files: File[], folder: boolean) {
	const upload = await readUpload(files);
	if (upload.payloads.length === 0)
		throw new Error(
			`${folder ? "That folder holds" : "Those files include"} no workspace .json file${upload.problems.length ? ` that could be read. ${upload.problems.join(" ")}` : `. ${NEXT}`}`,
		);
	if (upload.payloads.length === 1 && upload.problems.length === 0) {
		// One workspace file is a workspace opened alone, however it was picked.
		const [only] = upload.payloads;
		return open(only.schema, only.fileLabel, true);
	}
	const left = upload.skipped.length;
	const skipped = left
		? [
				`${left === 1 ? "1 file was not a workspace file and was" : `${left} files were not workspace files and were`} left out: ${upload.skipped.join(", ")}.`,
			]
		: [];
	openSet(upload.payloads, [...upload.problems, ...skipped], true);
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

/** Several files picked together, which are the files of one set. */
async function fromFiles(e: Event) {
	const input = e.target as HTMLInputElement;
	const picked = [...(input.files ?? [])];
	if (!picked.length) return;
	input.value = "";
	chosenFiles = `${picked.length} ${picked.length === 1 ? "file" : "files"}`;
	error = undefined;
	try {
		await fromPicked(picked, false);
	} catch (err) {
		error = (err as Error).message;
	}
}

async function fromFolder(e: Event) {
	const input = e.target as HTMLInputElement;
	const picked = [...(input.files ?? [])];
	if (!picked.length) return;
	input.value = "";
	chosenFolder = `${picked[0].webkitRelativePath.split("/")[0] || "folder"} (${picked.length} files)`;
	error = undefined;
	try {
		await fromPicked(picked, true);
	} catch (err) {
		error = (err as Error).message;
	}
}

function fromExample(example: Example) {
	// An example that is a set names each of its files, because no one file
	// refers to all the others; one that is a file is just its address.
	const several = (example.urls?.length ?? 0) > 1;
	url = several ? "" : toAbsoluteUrl(example.url);
	more = several
		? (example.urls as string[]).map(toAbsoluteUrl).join("\n")
		: "";
	root = toAbsoluteUrl(example.root);
	fromUrl(true);
}

if (queried.length) fromUrl();
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
		<label for="files">From several files</label>
		<div class="picker">
			<span class="many-choose">
				<input id="files" type="file" multiple accept=".json,application/json" onchange={fromFiles} />
				<span class="many-face" aria-hidden="true">Choose files…</span>
			</span>
			<span class="many-chosen dim">{chosenFiles}</span>
		</div>
		<label for="folder">From a folder</label>
		<div class="picker">
			<span class="many-choose">
				<input id="folder" type="file" webkitdirectory onchange={fromFolder} />
				<span class="many-face" aria-hidden="true">Choose a folder…</span>
			</span>
			<span class="many-chosen dim">{chosenFolder}</span>
		</div>
		<details class="more" open={Boolean(more || root)}>
			<summary>Several files by URL</summary>
			<form onsubmit={(e) => { e.preventDefault(); fromUrl(true); }}>
				<label for="more-urls">Workspace file URLs, one a line</label>
				<textarea id="more-urls" bind:value={more} rows="3" readonly={loading} placeholder="https://example.com/.ods/accounts.json" required></textarea>
				<label for="root">Folder they are all under (optional)</label>
				<input id="root" type="url" bind:value={root} readonly={loading} placeholder="https://example.com/.ods/" />
				<p class="dim">Each address is read, then every file it names with a file-qualified $ref, inside this folder. A file nothing here names cannot be found, because a web host lists nothing: add it above, or choose the folder from your computer.</p>
				<button type="submit" disabled={loading}>{loading ? "Reading…" : "Read addresses"}</button>
			</form>
		</details>
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
	.more { margin: 8px 0; }
	.more summary { cursor: pointer; }
	.more textarea, .more input { display: block; width: 100%; box-sizing: border-box; font: inherit; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--card); color: inherit; }
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
	.chosen, .many-chosen { min-width: 0; overflow-wrap: anywhere; }
	/* The pickers for several files and a folder are drawn exactly as the single-file one is. */
	.many-choose { position: relative; display: inline-flex; flex: none; }
	.many-choose input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; opacity: 0; cursor: pointer; }
	.many-choose input::file-selector-button { cursor: pointer; }
	.many-face { display: inline-flex; align-items: center; padding: 6px 10px; border: 1px solid transparent; border-radius: var(--radius); background: var(--vscode-button-background); color: var(--vscode-button-foreground); font-family: inherit; }
	.many-choose input:focus-visible + .many-face { outline: 1px solid var(--vscode-focusBorder); outline-offset: 2px; }
	.examples-title { margin: 28px 0 10px; font-size: 1rem; font-weight: 600; }
	.examples { gap: 10px; }
	.example { --tint: var(--accent); display: flex; flex-direction: column; align-items: flex-start; gap: 6px; text-align: left; margin: 0; padding: 12px 14px; border-left: 3px solid var(--tint); cursor: pointer; }
	.example:hover:not(:disabled) { border-color: var(--tint); }
	.example .card-head { color: var(--fg); }
	.example:disabled { cursor: default; opacity: 0.6; }
</style>
