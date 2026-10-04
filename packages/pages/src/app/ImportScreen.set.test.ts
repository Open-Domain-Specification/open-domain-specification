import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WorkspacePayload } from "../protocol";
import ImportScreen from "./ImportScreen.svelte";

const ROOT = "https://h.test/p/.ods/";

afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
	history.replaceState(null, "", "/");
});

/** A workspace file naming others by file-qualified `$ref`. */
const file = (...names: string[]) => ({
	name: "w",
	boundedcontexts: Object.fromEntries(
		names.map((n, i) => [
			`c${i}`,
			{ consumes: [{ consumable: { $ref: `${n}#/boundedcontexts/x` } }] },
		]),
	),
});

/** A fake host answering by url, 404 for the rest. */
function stubHost(files: Record<string, unknown>) {
	const fetchFn = vi.fn(async (url: string) =>
		url in files
			? { ok: true, json: async () => files[url] }
			: { ok: false, status: 404 },
	);
	vi.stubGlobal("fetch", fetchFn);
	return fetchFn;
}

const setup = () => {
	const onload = vi.fn();
	const onloadset = vi.fn();
	const onopened = vi.fn();
	const view = render(ImportScreen, { onload, onloadset, onopened });
	return { onload, onloadset, onopened, ...view };
};

const paths = (call: unknown[]) =>
	(call[0] as WorkspacePayload[]).map((p) => p.path);

describe("importing a set by URL", () => {
	it("starts from every url= in the address and the root=, filling the form with what it was given", () => {
		history.replaceState(
			null,
			"",
			`/?url=${encodeURIComponent(`${ROOT}a.json`)}&url=${encodeURIComponent(`${ROOT}b.json`)}&url=${encodeURIComponent(`${ROOT}c.json`)}&root=${encodeURIComponent(ROOT)}`,
		);
		stubHost({});
		setup();
		// Several addresses all go in the several-files field; the single field is for one.
		expect(screen.getByLabelText("From a URL")).toHaveValue("");
		expect(screen.getByLabelText(/Workspace file URLs/)).toHaveValue(
			`${ROOT}a.json\n${ROOT}b.json\n${ROOT}c.json`,
		);
		expect(screen.getByLabelText(/Folder they are all under/)).toHaveValue(
			ROOT,
		);
		// The details are open because they hold something.
		expect(
			(document.querySelector("details.more") as HTMLDetailsElement).open,
		).toBe(true);
	});

	it("keeps the extra fields closed and empty when nothing asked for them", () => {
		setup();
		expect(
			(document.querySelector("details.more") as HTMLDetailsElement).open,
		).toBe(false);
		expect(screen.getByLabelText(/Workspace file URLs/)).toHaveValue("");
	});

	it("hands the files it reached to the host as one set, with the notice that others may be out of view", async () => {
		history.replaceState(
			null,
			"",
			`/?url=${encodeURIComponent(`${ROOT}a.json`)}`,
		);
		const host = stubHost({
			[`${ROOT}a.json`]: file("b.json"),
			[`${ROOT}b.json`]: { name: "b" },
		});
		const { onload, onloadset } = setup();
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(onload).not.toHaveBeenCalled();
		expect(paths(onloadset.mock.calls[0])).toEqual(["a.json", "b.json"]);
		const [payloads, notices] = onloadset.mock.calls[0] as [
			WorkspacePayload[],
			string[],
		];
		expect(payloads.every((p) => p.set === "urls")).toBe(true);
		expect(payloads.map((p) => p.fileLabel)).toEqual(["a.json", "b.json"]);
		expect(notices).toHaveLength(1);
		expect(notices[0]).toContain("2 workspaces reached");
		expect(notices[0]).toContain(
			`Other workspaces under ${ROOT} are not discoverable by URL`,
		);
		// Each fetch was made with the address alone.
		expect(host.mock.calls.every((c) => c.length === 1)).toBe(true);
	});

	it("reads the addresses typed in the form: the field, one more a line, and the folder", async () => {
		const host = stubHost({
			[`${ROOT}a.json`]: { name: "a" },
			[`${ROOT}n/b.json`]: { name: "b" },
		});
		const { onloadset, onopened } = setup();
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: `${ROOT}a.json` },
		});
		await fireEvent.input(screen.getByLabelText(/Workspace file URLs/), {
			target: { value: `  ${ROOT}n/b.json \n\n${ROOT}a.json\n` },
		});
		await fireEvent.input(screen.getByLabelText(/Folder they are all under/), {
			target: { value: ROOT.slice(0, -1) },
		});
		await fireEvent.click(screen.getByRole("button", { name: "Load" }));
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(paths(onloadset.mock.calls[0])).toEqual(["a.json", "n/b.json"]);
		expect(host).toHaveBeenCalledTimes(2);
		expect(onopened).toHaveBeenCalledOnce();
	});

	it("reads the addresses of the several-files form on their own, with its own button", async () => {
		const host = stubHost({
			[`${ROOT}a.json`]: { name: "a" },
			[`${ROOT}b.json`]: { name: "b" },
		});
		const { onloadset } = setup();
		await fireEvent.input(screen.getByLabelText(/Workspace file URLs/), {
			target: { value: `${ROOT}b.json\n${ROOT}a.json` },
		});
		const button = screen.getByRole("button", { name: "Read addresses" });
		expect(screen.getByLabelText("From a URL")).toHaveValue("");
		await fireEvent.click(button);
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(paths(onloadset.mock.calls[0])).toEqual(["a.json", "b.json"]);
		expect(host).toHaveBeenCalledTimes(2);
	});

	it("reads nothing when the several-files form is sent with no address", async () => {
		const host = stubHost({});
		const { onloadset, onload } = setup();
		const form = (document.getElementById("more-urls") as HTMLElement).closest(
			"form",
		) as HTMLFormElement;
		await fireEvent.submit(form);
		expect(host).not.toHaveBeenCalled();
		expect(onloadset).not.toHaveBeenCalled();
		expect(onload).not.toHaveBeenCalled();
	});

	it("opens a file with no ref to another as the workspace alone it always was", async () => {
		stubHost({ [`${ROOT}a.json`]: { name: "a" } });
		const { onload, onloadset } = setup();
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: `${ROOT}a.json` },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith({ name: "a" }, "a.json"),
		);
		expect(onloadset).not.toHaveBeenCalled();
	});

	it("shows a dependency that answers 404 as a notice with what to do, and still opens what loaded", async () => {
		stubHost({ [`${ROOT}a.json`]: file("gone.json") });
		const { onload, onloadset } = setup();
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: `${ROOT}a.json` },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(onload).not.toHaveBeenCalled();
		const [, notices] = onloadset.mock.calls[0] as [unknown, string[]];
		expect(notices[0]).toBe(
			`gone.json (named by a.json): The server answered 404 for ${ROOT}gone.json. Check the address is correct and the file is public, then choose Load to try again.`,
		);
	});

	it("shows a dependency the host refuses to share as a notice that names CORS", async () => {
		const fetchFn = vi.fn(async (url: string) => {
			if (url.endsWith("b.json")) throw new TypeError("Failed to fetch");
			return { ok: true, json: async () => file("b.json") };
		});
		vi.stubGlobal("fetch", fetchFn);
		const { onloadset } = setup();
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: `${ROOT}a.json` },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect((onloadset.mock.calls[0][1] as string[])[0]).toContain(
			"allows cross-origin requests",
		);
	});

	it("says every file failed when none loaded, in the words a single file always had", async () => {
		stubHost({});
		const { onload, onloadset } = setup();
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: `${ROOT}a.json` },
		});
		await fireEvent.input(screen.getByLabelText(/Workspace file URLs/), {
			target: { value: `${ROOT}b.json` },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				`The server answered 404 for ${ROOT}a.json.`,
			),
		);
		expect(onload).not.toHaveBeenCalled();
		expect(onloadset).not.toHaveBeenCalled();
	});

	it("says the files are valid JSON but not a workspace set when the host refuses them", async () => {
		stubHost({ [`${ROOT}a.json`]: file("b.json"), [`${ROOT}b.json`]: {} });
		const onloadset = vi.fn(() => {
			throw new TypeError("Cannot read properties of undefined");
		});
		render(ImportScreen, { onload: vi.fn(), onloadset });
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: `${ROOT}a.json` },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"The files are valid JSON but are not an Open Domain Specification workspace set",
			),
		);
		expect(screen.getByRole("alert")).not.toHaveTextContent("Cannot read");
	});

	it("stops at 64 files and tells the reader which were left", async () => {
		const names = Array.from({ length: 70 }, (_, i) => `${ROOT}e${i}.json`);
		stubHost(Object.fromEntries(names.map((u) => [u, { name: u }])));
		history.replaceState(
			null,
			"",
			`/?${names.map((u) => `url=${encodeURIComponent(u)}`).join("&")}`,
		);
		const { onloadset } = setup();
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect((onloadset.mock.calls[0][0] as unknown[]).length).toBe(64);
		expect((onloadset.mock.calls[0][1] as string[])[0]).toContain(
			"Stopped at 64 workspace files",
		);
	});

	it("opens an example that is a set from every file it lists, none standing in for the rest", async () => {
		const files: Record<string, unknown> = {};
		const urls = ["a", "b", "c"].map((n) => {
			const url = new URL(`./examples/bank/${n}.json`, document.baseURI).href;
			files[url] = { name: n };
			return `./examples/bank/${n}.json`;
		});
		const host = stubHost(files);
		const onloadset = vi.fn();
		render(ImportScreen, {
			onload: vi.fn(),
			onloadset,
			examples: [
				{ name: "Bank", url: urls[0], urls, root: "./examples/bank/" },
			],
		});
		await fireEvent.click(screen.getByRole("button", { name: /Bank/ }));
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(paths(onloadset.mock.calls[0])).toEqual([
			"a.json",
			"b.json",
			"c.json",
		]);
		expect(host).toHaveBeenCalledTimes(3);
	});

	it("opens an example that is one file as the one workspace it is, and clears what an earlier example left", async () => {
		const first = new URL("./examples/p.json", document.baseURI).href;
		stubHost({ [first]: { name: "p" } });
		const onload = vi.fn();
		render(ImportScreen, {
			onload,
			examples: [{ name: "P", url: "./examples/p.json" }],
		});
		await fireEvent.input(screen.getByLabelText(/Workspace file URLs/), {
			target: { value: "https://x.test/old.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /^P/ }));
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith({ name: "p" }, "p.json"),
		);
		expect(screen.getByLabelText(/Workspace file URLs/)).toHaveValue("");
	});
});

/** A picked file as a browser hands it, with the path under a chosen folder when it was picked that way. */
function picked(name: string, body: string, relative?: string): File {
	const f = new File([body], name, { type: "application/json" });
	if (relative !== undefined)
		Object.defineProperty(f, "webkitRelativePath", { value: relative });
	return f;
}

describe("importing several files from this computer", () => {
	const files = () => document.getElementById("files") as HTMLInputElement;
	const folder = () => document.getElementById("folder") as HTMLInputElement;

	it("offers a native multiple-file input and a native folder input, each labelled, beside the single-file one", () => {
		setup();
		expect(files()).toHaveAttribute("type", "file");
		expect(files()).toHaveAttribute("multiple");
		expect(screen.getByLabelText("From several files")).toBe(files());
		expect(folder()).toHaveAttribute("type", "file");
		expect(folder().hasAttribute("webkitdirectory")).toBe(true);
		expect(screen.getByLabelText("From a folder")).toBe(folder());
		// The single-file input is unchanged.
		const single = document.getElementById("file") as HTMLInputElement;
		expect(single).not.toHaveAttribute("multiple");
		expect(screen.getByText("Choose files…")).toHaveAttribute(
			"aria-hidden",
			"true",
		);
		expect(screen.getByText("Choose a folder…")).toHaveAttribute(
			"aria-hidden",
			"true",
		);
	});

	it("takes several files as one set, each at its name, in code-point order, and empties the input so the same pick counts again", async () => {
		const { onloadset, onopened } = setup();
		await fireEvent.change(files(), {
			target: {
				files: [
					picked("b.json", '{"name":"b"}'),
					picked("a.json", '{"name":"a"}'),
				],
			},
		});
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(paths(onloadset.mock.calls[0])).toEqual(["a.json", "b.json"]);
		expect((onloadset.mock.calls[0][0] as WorkspacePayload[])[0].set).toBe(
			"upload",
		);
		expect(onloadset.mock.calls[0][1]).toEqual([]);
		expect(files().value).toBe("");
		expect(screen.getByText("2 files")).toBeInTheDocument();
		expect(onopened).toHaveBeenCalledOnce();
	});

	it("opens one workspace file picked this way as the workspace alone, like the single input", async () => {
		const { onload, onloadset } = setup();
		await fireEvent.change(files(), {
			target: { files: [picked("only.json", '{"name":"o"}')] },
		});
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith({ name: "o" }, "only.json"),
		);
		expect(onloadset).not.toHaveBeenCalled();
		expect(screen.getByText("1 file")).toBeInTheDocument();
	});

	it("says which file was not JSON, and still opens the ones that were", async () => {
		const { onloadset } = setup();
		await fireEvent.change(files(), {
			target: {
				files: [
					picked("a.json", "{}"),
					picked("bad.json", "nope"),
					picked("c.json", "{}"),
				],
			},
		});
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(onloadset.mock.calls[0][1]).toEqual([
			"bad.json is not valid JSON, so it was left out. Fix the file, or leave it out of the folder, then choose it again.",
		]);
	});

	it("says what to do when none of the files is a workspace file", async () => {
		const { onload, onloadset } = setup();
		await fireEvent.change(files(), {
			target: { files: [picked("notes.txt", "x"), picked("more.md", "y")] },
		});
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Those files include no workspace .json file. Choose a workspace file from a project's .ods folder.",
			),
		);
		expect(onload).not.toHaveBeenCalled();
		expect(onloadset).not.toHaveBeenCalled();
	});

	it("says the one JSON file that could not be read, when that is all there was", async () => {
		setup();
		await fireEvent.change(files(), {
			target: { files: [picked("bad.json", "nope"), picked("notes.txt", "x")] },
		});
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Those files include no workspace .json file that could be read. bad.json is not valid JSON",
			),
		);
	});

	it("does nothing when the pick is empty, and does not clear what was chosen before", async () => {
		const { onloadset } = setup();
		await fireEvent.change(files(), { target: { files: [] } });
		await fireEvent.change(folder(), { target: { files: [] } });
		expect(onloadset).not.toHaveBeenCalled();
	});

	it("takes a folder with the chosen folder's own name off every path, and keeps encoded characters raw", async () => {
		const { onloadset } = setup();
		await fireEvent.change(folder(), {
			target: {
				files: [
					picked("schema.json", "{}", ".ods/schema.json"),
					picked("a#%.json", '{"name":"h"}', ".ods/a#%.json"),
					picked("my team.json", '{"name":"s"}', ".ods/my team.json"),
					picked("é.json", '{"name":"u"}', ".ods/ü/é.json"),
					picked("README.md", "x", ".ods/README.md"),
				],
			},
		});
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(paths(onloadset.mock.calls[0])).toEqual([
			"a#%.json",
			"my team.json",
			"ü/é.json",
		]);
		expect(onloadset.mock.calls[0][1]).toEqual([
			"2 files were not workspace files and were left out: README.md, schema.json.",
		]);
		expect(screen.getByText(".ods (5 files)")).toBeInTheDocument();
		expect(folder().value).toBe("");
	});

	it("says one skipped file in the singular", async () => {
		const { onloadset } = setup();
		await fireEvent.change(folder(), {
			target: {
				files: [
					picked("a.json", "{}", "f/a.json"),
					picked("b.json", "{}", "f/b.json"),
					picked("schema.json", "{}", "f/schema.json"),
				],
			},
		});
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(onloadset.mock.calls[0][1]).toEqual([
			"1 file was not a workspace file and was left out: schema.json.",
		]);
	});

	it("opens a folder holding one workspace file as the workspace alone", async () => {
		const { onload } = setup();
		await fireEvent.change(folder(), {
			target: { files: [picked("p.json", '{"name":"p"}', "d/p.json")] },
		});
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith({ name: "p" }, "p.json"),
		);
	});

	it("says a folder holds no workspace file, naming the folder pick", async () => {
		setup();
		await fireEvent.change(folder(), {
			target: { files: [picked("notes.txt", "x", "d/notes.txt")] },
		});
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"That folder holds no workspace .json file.",
			),
		);
	});

	it("names a folder pick that carries no folder name 'folder'", async () => {
		const { onloadset } = setup();
		await fireEvent.change(folder(), {
			target: {
				files: [picked("a.json", "{}", ""), picked("b.json", "{}", "")],
			},
		});
		await waitFor(() => expect(onloadset).toHaveBeenCalledOnce());
		expect(screen.getByText("folder (2 files)")).toBeInTheDocument();
	});
});

describe("a pick that carries no file list", () => {
	it("is ignored by the several-file and folder inputs, as an empty pick is", async () => {
		const { onloadset, onload } = setup();
		for (const id of ["files", "folder"]) {
			const input = document.getElementById(id) as HTMLInputElement;
			Object.defineProperty(input, "files", {
				value: null,
				configurable: true,
			});
			await fireEvent.change(input);
		}
		expect(onloadset).not.toHaveBeenCalled();
		expect(onload).not.toHaveBeenCalled();
	});
});
