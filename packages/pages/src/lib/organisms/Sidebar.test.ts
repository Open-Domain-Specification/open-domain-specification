import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { dotToSvg } from "../../graphviz";
import { petstoreModel } from "../fixtures";
import Harness from "./Sidebar.harness.svelte";

function linkFor(container: HTMLElement, ref: string) {
	return container.querySelector(`a[href="${ref}"]`);
}

describe("Sidebar", () => {
	it("lists domains with their subdomains, contexts with their aggregates and services, and teams", () => {
		const model = petstoreModel();
		const { container } = render(Harness, { model, current: "#" });

		for (const d of model.workspace.domains.values()) {
			expect(linkFor(container, d.ref)).toBeTruthy();
			for (const s of d.subdomains.values())
				expect(linkFor(container, s.ref)).toBeTruthy();
		}
		for (const bc of model.workspace.boundedcontexts.values()) {
			expect(linkFor(container, bc.ref)).toBeTruthy();
			for (const a of bc.aggregates.values())
				expect(linkFor(container, a.ref)).toBeTruthy();
			for (const s of bc.services.values())
				expect(linkFor(container, s.ref)).toBeTruthy();
		}
		for (const t of model.workspace.teams.values())
			expect(linkFor(container, t.ref)).toBeTruthy();
	});

	it("marks the current ref active, and its ancestor active too", () => {
		const model = petstoreModel();
		const domain = [...model.workspace.domains.values()][0];
		const subdomain = [...domain.subdomains.values()][0];
		const { container } = render(Harness, { model, current: subdomain.ref });

		expect(linkFor(container, subdomain.ref)).toHaveClass("active");
		expect(linkFor(container, domain.ref)).toHaveClass("active");
	});

	it("leaves unrelated items without the active class", () => {
		const model = petstoreModel();
		const [first, second] = [...model.workspace.teams.values()];
		const { container } = render(Harness, { model, current: first.ref });
		expect(linkFor(container, first.ref)).toHaveClass("active");
		expect(linkFor(container, second.ref)).not.toHaveClass("active");
	});

	it("copes with an item whose name is missing", () => {
		const workspace = new Workspace("No Names", {
			odsVersion: "1.0.0",
			description: "A team with no name.",
			version: "0.0.1",
		});
		// biome-ignore lint/suspicious/noExplicitAny: exercises the missing-label fallback branch
		const team = workspace.addTeam(undefined as any, { id: "nameless_team" });
		const model = {
			workspace,
			fileLabel: "no-names.ts",
			diagnostics: workspace.validate(),
			renderDot: dotToSvg,
		};
		const { container } = render(Harness, { model, current: "#" });
		expect(linkFor(container, team.ref)).toBeTruthy();
	});
});
