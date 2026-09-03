import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import { petstoreModel } from "../lib/fixtures";
import WorkspacePicker from "./WorkspacePicker.svelte";

describe("WorkspacePicker", () => {
	it("lists every model and calls onpick with its index when clicked", async () => {
		const a = petstoreModel();
		const b = petstoreModel();
		b.fileLabel = "petstore-2.json";
		const onpick = vi.fn();
		render(WorkspacePicker, { models: [a, b], onpick });

		expect(screen.getByText("petstore.json")).toBeInTheDocument();
		expect(screen.getByText("petstore-2.json")).toBeInTheDocument();
		const links = screen.getAllByRole("link", { name: a.workspace.name });
		expect(links).toHaveLength(2);

		await fireEvent.click(links[1]);
		expect(onpick).toHaveBeenCalledExactlyOnceWith(1);
	});

	it("renders nothing under the heading when there are no models", () => {
		render(WorkspacePicker, { models: [], onpick: vi.fn() });
		expect(document.querySelectorAll(".site-index li")).toHaveLength(0);
	});

	it("falls back to empty text when a workspace has no name", () => {
		const m = petstoreModel();
		(m.workspace as unknown as { name: unknown }).name = undefined;
		render(WorkspacePicker, { models: [m], onpick: vi.fn() });
		expect(screen.getByRole("link").textContent?.trim()).toBe("");
	});
});

describe("WorkspacePicker deep links", () => {
	it("keeps the hash the visitor arrived with, so a deep link survives picking", () => {
		location.hash = "#/boundedcontexts/sales_bc";
		const { container } = render(WorkspacePicker, {
			models: [petstoreModel()],
			onpick: () => {},
		});
		expect(container.querySelector("a.ref")).toHaveAttribute(
			"href",
			"#/boundedcontexts/sales_bc",
		);
		location.hash = "";
	});
});
