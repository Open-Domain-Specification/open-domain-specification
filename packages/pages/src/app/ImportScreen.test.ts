import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import ImportScreen from "./ImportScreen.svelte";

const KEY = "ods-viewer-url";

function resetLocation() {
	history.replaceState(null, "", "/");
}

afterEach(() => {
	vi.unstubAllGlobals();
	localStorage.clear();
	resetLocation();
});

describe("ImportScreen", () => {
	it("starts empty when there is no query param and nothing remembered", () => {
		render(ImportScreen, { onload: vi.fn() });
		expect(screen.getByLabelText("From a URL")).toHaveValue("");
	});

	it("preloads the remembered URL from localStorage", () => {
		localStorage.setItem(KEY, "https://example.com/a.json");
		render(ImportScreen, { onload: vi.fn() });
		expect(screen.getByLabelText("From a URL")).toHaveValue(
			"https://example.com/a.json",
		);
	});

	it("falls back to empty when localStorage.getItem throws", () => {
		vi.stubGlobal("localStorage", {
			getItem: () => {
				throw new Error("blocked");
			},
			setItem: vi.fn(),
		});
		render(ImportScreen, { onload: vi.fn() });
		expect(screen.getByLabelText("From a URL")).toHaveValue("");
	});

	it("fetches automatically when a ?url= query param is present", async () => {
		history.replaceState(null, "", "/?url=https://example.com/petstore.json");
		const schema = { name: "petstore" };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => schema }),
		);
		const onload = vi.fn();
		render(ImportScreen, { onload });
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "petstore.json"),
		);
	});

	it("loads from a submitted URL, remembers it and shows loading state meanwhile", async () => {
		const schema = { name: "petstore" };
		let resolveFetch!: (v: unknown) => void;
		const pending = new Promise((res) => {
			resolveFetch = res;
		});
		vi.stubGlobal("fetch", vi.fn().mockReturnValue(pending));
		const setItem = vi.fn();
		vi.stubGlobal("localStorage", {
			getItem: () => null,
			setItem,
		});
		const onload = vi.fn();
		render(ImportScreen, { onload });

		const input = screen.getByLabelText("From a URL");
		await fireEvent.input(input, {
			target: { value: "https://example.com/dir/petstore.json" },
		});
		const button = screen.getByRole("button", { name: /load/i });
		fireEvent.click(button);
		await waitFor(() => expect(button).toHaveTextContent("Loading…"));
		expect(input).toHaveAttribute("readonly");
		expect(button).toBeDisabled();

		resolveFetch({ ok: true, json: async () => schema });
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "petstore.json"),
		);
		expect(setItem).toHaveBeenCalledWith(
			KEY,
			"https://example.com/dir/petstore.json",
		);
		await waitFor(() => expect(button).toHaveTextContent("Load"));
		expect(input).not.toHaveAttribute("readonly");
	});

	it("falls back to the whole URL as the file label when it ends in a slash", async () => {
		const schema = { name: "petstore" };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => schema }),
		);
		const onload = vi.fn();
		render(ImportScreen, { onload });

		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/dir/" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "https://example.com/dir/"),
		);
	});

	it("swallows a localStorage.setItem failure and still loads", async () => {
		const schema = { name: "petstore" };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => schema }),
		);
		vi.stubGlobal("localStorage", {
			getItem: () => null,
			setItem: () => {
				throw new Error("quota");
			},
		});
		const onload = vi.fn();
		render(ImportScreen, { onload });

		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/petstore.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "petstore.json"),
		);
	});

	it("loads from a submitted relative URL, resolving it to an absolute URL against the base URL", async () => {
		const schema = { name: "streamline" };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => schema }),
		);
		const setItem = vi.fn();
		vi.stubGlobal("localStorage", {
			getItem: () => null,
			setItem,
		});
		const onload = vi.fn();
		render(ImportScreen, { onload });

		const input = screen.getByLabelText("From a URL");
		await fireEvent.input(input, {
			target: { value: "./examples/streamline.json" },
		});
		await fireEvent.change(input);
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		const expectedUrl = new URL("./examples/streamline.json", document.baseURI)
			.href;
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "streamline.json"),
		);
		expect(fetch).toHaveBeenCalledWith(expectedUrl);
		expect(setItem).toHaveBeenCalledWith(KEY, expectedUrl);
		expect(input).toHaveValue(expectedUrl);
	});

	it("dynamically resolves relative URLs on input change", async () => {
		render(ImportScreen, { onload: vi.fn() });
		const input = screen.getByLabelText("From a URL");
		await fireEvent.input(input, {
			target: { value: "./examples/streamline.json" },
		});
		await fireEvent.change(input);
		const expected = new URL("./examples/streamline.json", document.baseURI)
			.href;
		expect(input).toHaveValue(expected);
	});

	it("dynamically resolves a remembered relative URL to the base URL", () => {
		localStorage.setItem(KEY, "./examples/streamline.json");
		render(ImportScreen, { onload: vi.fn() });
		const expected = new URL("./examples/streamline.json", document.baseURI)
			.href;
		expect(screen.getByLabelText("From a URL")).toHaveValue(expected);
	});

	it("falls back to trimmed string when URL parsing throws", async () => {
		render(ImportScreen, { onload: vi.fn() });
		const input = screen.getByLabelText("From a URL");
		await fireEvent.input(input, {
			target: { value: "http://[invalid]" },
		});
		await fireEvent.change(input);
		expect(input).toHaveValue("http://[invalid]");
	});

	it("trims whitespace around submitted URLs and ignores empty submissions", async () => {
		const schema = { name: "petstore" };
		const fetchFn = vi
			.fn()
			.mockResolvedValue({ ok: true, json: async () => schema });
		vi.stubGlobal("fetch", fetchFn);
		const onload = vi.fn();
		render(ImportScreen, { onload });

		const input = screen.getByLabelText("From a URL");
		await fireEvent.input(input, {
			target: { value: "   " },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		expect(fetchFn).not.toHaveBeenCalled();

		await fireEvent.input(input, {
			target: { value: "  https://example.com/petstore.json  " },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "petstore.json"),
		);
		expect(fetchFn).toHaveBeenCalledWith("https://example.com/petstore.json");
	});

	it("shows an error message on a non-ok response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 404 }),
		);
		const onload = vi.fn();
		render(ImportScreen, { onload });

		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/missing.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(
				screen.getByText(
					"The server answered 404 for https://example.com/missing.json. Check the address is correct and the file is public, then choose Load to try again.",
				),
			).toBeInTheDocument(),
		);
		expect(onload).not.toHaveBeenCalled();
	});

	it("says the url could not be reached when fetch rejects, with what to check", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network down"));
		render(ImportScreen, { onload: vi.fn() });

		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/petstore.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Could not reach https://example.com/petstore.json. Check the address and your connection, and that the host allows cross-origin requests, then choose Load to try again.",
			),
		);
	});

	it("loads a schema from a chosen file", async () => {
		const schema = { name: "petstore" };
		const onload = vi.fn();
		render(ImportScreen, { onload });
		const file = new File([JSON.stringify(schema)], "local.json", {
			type: "application/json",
		});
		const input = document.getElementById("file") as HTMLInputElement;
		await fireEvent.change(input, { target: { files: [file] } });
		expect(onload).toHaveBeenCalledWith(schema, "local.json");
	});

	it("does nothing when the file input change carries no file", async () => {
		const onload = vi.fn();
		render(ImportScreen, { onload });
		const input = document.getElementById("file") as HTMLInputElement;
		await fireEvent.change(input, { target: { files: [] } });
		expect(onload).not.toHaveBeenCalled();
	});

	it("shows a parse error message for invalid file JSON", async () => {
		render(ImportScreen, { onload: vi.fn() });
		const file = new File(["not json"], "bad.json", {
			type: "application/json",
		});
		const input = document.getElementById("file") as HTMLInputElement;
		await fireEvent.change(input, { target: { files: [file] } });
		await waitFor(() =>
			expect(document.querySelector(".error")).toBeInTheDocument(),
		);
	});

	it("says the json is not a workspace when the host refuses it, without the raw error", async () => {
		const onload = vi.fn(() => {
			throw new TypeError("Cannot read properties of undefined");
		});
		render(ImportScreen, { onload });
		const file = new File(["{}"], "ok.json", { type: "application/json" });
		const input = document.getElementById("file") as HTMLInputElement;
		await fireEvent.change(input, { target: { files: [file] } });
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"ok.json is valid JSON but is not an Open Domain Specification workspace",
			),
		);
		expect(screen.getByRole("alert")).not.toHaveTextContent("Cannot read");
	});

	it("says a url that answers with something other than json is not valid JSON", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => {
					throw new SyntaxError("Unexpected token <");
				},
			}),
		);
		render(ImportScreen, { onload: vi.fn() });
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/page.html" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"https://example.com/page.html is not valid JSON. Point it at the workspace file in a project's .ods folder",
			),
		);
	});

	it("announces loading in a polite status region that is in the page before the load starts", async () => {
		let resolve!: (r: unknown) => void;
		vi.stubGlobal(
			"fetch",
			vi.fn().mockReturnValue(
				new Promise((r) => {
					resolve = r;
				}),
			),
		);
		render(ImportScreen, { onload: vi.fn() });
		const status = screen.getByRole("status");
		expect(status).toHaveTextContent("");
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/petstore.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(status).toHaveTextContent("Loading the workspace…"),
		);
		resolve({ ok: true, json: async () => ({}) });
		await waitFor(() => expect(status).toHaveTextContent(""));
	});
});

describe("ImportScreen tells the host when the reader opened a workspace", () => {
	const schema = { name: "petstore" };
	const ok = () =>
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => schema }),
		);

	it("does after a submitted URL, after a chosen file and after an example card", async () => {
		ok();
		const onopened = vi.fn();
		render(ImportScreen, {
			onload: vi.fn(),
			onopened,
			examples: [{ name: "Ex", url: "https://example.com/ex.json" }],
		});
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/petstore.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() => expect(onopened).toHaveBeenCalledTimes(1));

		const file = new File([JSON.stringify(schema)], "a.json");
		await fireEvent.change(document.getElementById("file") as HTMLElement, {
			target: { files: [file] },
		});
		await waitFor(() => expect(onopened).toHaveBeenCalledTimes(2));

		await fireEvent.click(screen.getByRole("button", { name: /Ex/ }));
		await waitFor(() => expect(onopened).toHaveBeenCalledTimes(3));
	});

	it("does not for the ?url= deep link that loads by itself", async () => {
		history.replaceState(null, "", "/?url=https://example.com/petstore.json");
		ok();
		const onload = vi.fn();
		const onopened = vi.fn();
		render(ImportScreen, { onload, onopened });
		await waitFor(() => expect(onload).toHaveBeenCalled());
		expect(onopened).not.toHaveBeenCalled();
	});

	it("does not when the host refuses the workspace", async () => {
		const onopened = vi.fn();
		render(ImportScreen, {
			onload: () => {
				throw new Error("no");
			},
			onopened,
		});
		const file = new File(["{}"], "a.json");
		await fireEvent.change(document.getElementById("file") as HTMLElement, {
			target: { files: [file] },
		});
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent("a.json"),
		);
		expect(onopened).not.toHaveBeenCalled();
	});
});

describe("ImportScreen examples", () => {
	const examples = [
		{
			name: "Petstore",
			description: "A small shop",
			url: "https://example.com/examples/petstore.json",
			color: "#0ea5e9",
		},
		{ name: "Bare", url: "https://example.com/examples/bare.json" },
	];

	it("shows no example section when the host offers none", () => {
		render(ImportScreen, { onload: vi.fn() });
		expect(screen.queryByText("Or try an example")).not.toBeInTheDocument();
	});

	it("renders one card per example, tinted with its colour or the accent", () => {
		render(ImportScreen, { onload: vi.fn(), examples });
		expect(screen.getByText("Or try an example")).toBeInTheDocument();
		const petstore = screen.getByRole("button", { name: /Petstore/ });
		expect(petstore).toHaveTextContent("A small shop");
		expect(petstore.getAttribute("style")).toContain("--tint: #0ea5e9");
		// No colour: the card leaves --tint unset so the stylesheet's accent default applies.
		expect(
			screen.getByRole("button", { name: /Bare/ }).getAttribute("style") ?? "",
		).not.toContain("--tint");
	});

	it("loads the example's URL when its card is clicked", async () => {
		const schema = { name: "petstore" };
		let resolve!: (r: unknown) => void;
		const fetch = vi.fn().mockReturnValue(
			new Promise((r) => {
				resolve = r;
			}),
		);
		vi.stubGlobal("fetch", fetch);
		const onload = vi.fn();
		render(ImportScreen, { onload, examples });

		const card = screen.getByRole("button", { name: /Petstore/ });
		await fireEvent.click(card);
		// Cards are disabled while a load is in flight.
		await waitFor(() => expect(card).toBeDisabled());
		resolve({ ok: true, json: async () => schema });

		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "petstore.json"),
		);
		expect(fetch).toHaveBeenCalledWith(examples[0].url);
		expect(screen.getByLabelText("From a URL")).toHaveValue(examples[0].url);
	});

	it("dynamically resolves relative example URLs to the base URL", async () => {
		const relativeExamples = [
			{
				name: "StreamLine",
				description: "A streaming service",
				url: "./examples/streamline.json",
			},
		];
		const schema = { name: "streamline" };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: true, json: async () => schema }),
		);
		const onload = vi.fn();
		render(ImportScreen, { onload, examples: relativeExamples });

		const card = screen.getByRole("button", { name: /StreamLine/ });
		await fireEvent.click(card);

		const expected = new URL("./examples/streamline.json", document.baseURI)
			.href;
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "streamline.json"),
		);
		expect(fetch).toHaveBeenCalledWith(expected);
		expect(screen.getByLabelText("From a URL")).toHaveValue(expected);
	});
});

describe("ImportScreen file control", () => {
	const input = () => document.getElementById("file") as HTMLInputElement;
	const choose = async (file: File) =>
		fireEvent.change(input(), { target: { files: [file] } });

	it("keeps the native single-file input as the labelled control and draws a themed Choose a file… face over it", () => {
		render(ImportScreen, { onload: vi.fn() });
		const native = screen.getByLabelText("From a file");
		expect(native).toBe(input());
		expect(native).toHaveAttribute("type", "file");
		expect(native).toHaveAttribute("accept", ".json,application/json");
		expect(native).not.toHaveAttribute("multiple");
		const face = screen.getByText("Choose a file…");
		expect(face).toHaveAttribute("aria-hidden", "true");
		expect(face.previousElementSibling).toBe(native);
	});

	it("shows no file name until one is chosen", () => {
		render(ImportScreen, { onload: vi.fn() });
		expect(document.querySelector(".chosen")?.textContent).toBe("");
	});

	it("names the chosen file beside the control, also when the file fails, and keeps naming it on an empty selection", async () => {
		render(ImportScreen, { onload: vi.fn() });
		await choose(new File(["nope"], "notes.json"));
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"notes.json is not valid JSON",
			),
		);
		expect(document.querySelector(".chosen")).toHaveTextContent("notes.json");

		await fireEvent.change(input(), { target: { files: [] } });
		expect(document.querySelector(".chosen")).toHaveTextContent("notes.json");
		expect(screen.getByRole("alert")).toHaveTextContent(
			"notes.json is not valid JSON",
		);
	});

	it("clears the native selection once it is read, so choosing the same file again fires change in a real browser", async () => {
		const reset = vi.fn();
		render(ImportScreen, { onload: vi.fn() });
		Object.defineProperty(input(), "value", {
			configurable: true,
			get: () => "C:\\fakepath\\notes.json",
			set: reset,
		});
		await choose(new File(["nope"], "notes.json"));
		expect(reset).toHaveBeenCalledWith("");
	});

	it("tries the same failing file again, and then loads a different valid one", async () => {
		const schema = { name: "petstore" };
		const onload = vi.fn();
		render(ImportScreen, { onload });
		const bad = new File(["nope"], "notes.json");
		await choose(bad);
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent("notes.json"),
		);
		await choose(bad);
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"notes.json is not valid JSON",
			),
		);
		expect(onload).not.toHaveBeenCalled();
		await choose(new File([JSON.stringify(schema)], "petstore.json"));
		await waitFor(() =>
			expect(onload).toHaveBeenCalledWith(schema, "petstore.json"),
		);
		expect(screen.getByRole("alert")).toBeEmptyDOMElement();
	});
});

describe("ImportScreen load error", () => {
	it("draws the message in an alert as a Problems row: an aria-hidden error codicon, then plain message text", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 404 }),
		);
		render(ImportScreen, { onload: vi.fn() });
		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/missing.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		const alert = await screen.findByRole("alert");
		await waitFor(() => expect(alert).toHaveTextContent("404"));
		const row = alert.querySelector("p.error") as HTMLElement;
		const icon = row.querySelector("i.codicon.codicon-error");
		expect(icon).toHaveAttribute("aria-hidden", "true");
		expect(icon).toBeEmptyDOMElement();
		const message = row.querySelector(".message") as HTMLElement;
		expect(message).toHaveTextContent("https://example.com/missing.json");
		expect(row.querySelector("a")).toBeNull();
		expect(row.children).toHaveLength(2);
	});
});
