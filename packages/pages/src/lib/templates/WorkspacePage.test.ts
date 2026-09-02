import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import Harness from "./WorkspacePage.harness.svelte";

describe("WorkspacePage", () => {
	it("renders the workspace with its domains, contexts and teams", async () => {
		const model = petstoreModel();
		render(Harness, { model });
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			model.workspace.name,
		);
		for (const d of model.workspace.domains.values())
			expect(screen.getByRole("link", { name: d.name })).toHaveAttribute(
				"href",
				d.ref,
			);
		for (const t of model.workspace.teams.values())
			expect(screen.getAllByText(t.name).length).toBeGreaterThan(0);
		expect(document.querySelectorAll("section")).toHaveLength(4);
	});
});
