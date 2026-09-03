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
					"Failed to fetch workspace from https://example.com/missing.json (404)",
				),
			).toBeInTheDocument(),
		);
		expect(onload).not.toHaveBeenCalled();
	});

	it("shows a stringified error when fetch rejects with a non-Error value", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue("network down"));
		render(ImportScreen, { onload: vi.fn() });

		await fireEvent.input(screen.getByLabelText("From a URL"), {
			target: { value: "https://example.com/petstore.json" },
		});
		await fireEvent.click(screen.getByRole("button", { name: /load/i }));
		await waitFor(() =>
			expect(screen.getByText("network down")).toBeInTheDocument(),
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

	it("shows a stringified error when the file handler throws a non-Error", async () => {
		const onload = vi.fn(() => {
			throw "boom";
		});
		render(ImportScreen, { onload });
		const file = new File(["{}"], "ok.json", { type: "application/json" });
		const input = document.getElementById("file") as HTMLInputElement;
		await fireEvent.change(input, { target: { files: [file] } });
		await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
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
