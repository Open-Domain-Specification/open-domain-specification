import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { petstoreModel } from "../lib/fixtures";
import { type Loaded, loadSet } from "../lib/load";
import type { Model } from "../lib/model";
import { modelRefToHash } from "../lib/ref-transport";
import { cxPayloads } from "../lib/set-fixture";
import WorkspacePicker from "./WorkspacePicker.svelte";

const entry = (model: Model): Loaded => ({ kind: "workspace", model });

describe("WorkspacePicker", () => {
	it("lists every model and calls onpick with its index when clicked", async () => {
		const a = petstoreModel();
		const b = petstoreModel();
		b.fileLabel = "petstore-2.json";
		const onpick = vi.fn();
		render(WorkspacePicker, { entries: [entry(a), entry(b)], onpick });

		expect(screen.getByText("petstore.json")).toBeInTheDocument();
		expect(screen.getByText("petstore-2.json")).toBeInTheDocument();
		const links = screen.getAllByRole("link", { name: a.workspace.name });
		expect(links).toHaveLength(2);

		await fireEvent.click(links[1]);
		expect(onpick).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("renders nothing under the heading when there are no models", () => {
		render(WorkspacePicker, { entries: [], onpick: vi.fn() });
		expect(document.querySelectorAll(".site-index li")).toHaveLength(0);
	});

	it("falls back to empty text when a workspace has no name", () => {
		const m = petstoreModel();
		(m.workspace as unknown as { name: unknown }).name = undefined;
		render(WorkspacePicker, { entries: [entry(m)], onpick: vi.fn() });
		expect(screen.getByRole("link").textContent?.trim()).toBe("");
	});
});

describe("WorkspacePicker deep links", () => {
	it("keeps the hash the visitor arrived with, so a deep link survives picking", () => {
		location.hash = modelRefToHash("#/boundedcontexts/sales_bc");
		const { container } = render(WorkspacePicker, {
			entries: [entry(petstoreModel())],
			onpick: () => {},
		});
		expect(container.querySelector("a.ref")).toHaveAttribute(
			"href",
			modelRefToHash("#/boundedcontexts/sales_bc"),
		);
		location.hash = "";
	});
});

describe("WorkspacePicker with sets", () => {
	it("lists a set as one entry with the files it holds, and picks it by its index", async () => {
		const set = loadSet(cxPayloads());
		const onpick = vi.fn();
		render(WorkspacePicker, {
			entries: [entry(petstoreModel()), { kind: "set", loaded: set }],
			onpick,
		});
		const link = screen.getByRole("link", { name: "2 workspaces" });
		expect(screen.getByText("a.json, b.json")).toBeInTheDocument();
		await fireEvent.click(link);
		expect(onpick).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("says one workspace in the singular", () => {
		const set = loadSet([cxPayloads()[0]]);
		render(WorkspacePicker, {
			entries: [{ kind: "set", loaded: set }],
			onpick: vi.fn(),
		});
		expect(
			screen.getByRole("link", { name: "1 workspace" }),
		).toBeInTheDocument();
	});
});
