import {
	type BoundedContext,
	narrativeText,
	PATTERNS,
	relationshipNarrative,
	Workspace,
} from "@open-domain-specification/core";
import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../evidence/WithModel.harness.svelte";
import { edgeCaseModel, petstoreSales, rivermartModel } from "../fixtures";
import StrategicPositionTable from "./StrategicPositionTable.svelte";

type Model = ReturnType<typeof petstoreSales>["model"];

const position = (model: Model, context: BoundedContext) =>
	render(Harness, {
		model,
		component: StrategicPositionTable,
		args: { context },
	});

describe("StrategicPositionTable", () => {
	it("groups the relationships by what they mean from here, with the counterpart as a lockup and the roles as codes", () => {
		const { model, context } = petstoreSales();
		const { container } = position(model, context);
		expect(
			[...container.querySelectorAll("tr.group th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["Depends on", "Depended on by", "Works alongside"]);
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual([
			"",
			"With",
			"Description",
			"Type",
			"Upstream",
			"Downstream",
			"Disposition",
		]);
		// The counterpart is a link, not a pill, and carries the generated sentence.
		const counterpart = container.querySelector(
			"tbody td:nth-child(2) .context",
		) as HTMLElement;
		expect(counterpart.title.length).toBeGreaterThan(0);
		expect(counterpart.querySelector("a")).toBeInTheDocument();
		expect(container.querySelector(".keyword.mono")).toBeInTheDocument();
		expect(container.querySelector(".disposition")).toBeInTheDocument();
	});

	it("discloses what a role code means, and this row's evidence under it", async () => {
		const { model, context } = petstoreSales();
		const { container } = position(model, context);
		const acl = PATTERNS["anti-corruption-layer"];
		const term = [...container.querySelectorAll(".pattern-hover")].find((el) =>
			el.textContent?.includes(acl.abbreviation),
		) as HTMLElement;
		await fireEvent.focusIn(term);
		const card = term.querySelector(".hover-card") as HTMLElement;
		expect(card.querySelector(".heading")).toHaveTextContent(acl.name);
		expect(card).toHaveTextContent(acl.summary);
		// The row's own relationship, not the pattern in general.
		expect(card).toHaveTextContent("PetSummaryClient");
	});

	it("opens the whole relationship detail in the modal, and closes it again", async () => {
		const { model, context } = petstoreSales();
		const { container } = position(model, context);
		// The detail is no longer a row of the table: a table inside a table
		// row gave the reader two header rows in one grid.
		expect(container.querySelector("tr.detail")).toBeNull();
		expect(document.getElementById("relationship-modal")).toBeNull();

		const toggle = screen.getAllByRole("button", { name: /^Evidence for/ })[0];
		expect(toggle).toHaveAttribute("aria-controls", "relationship-modal");
		await fireEvent.click(toggle);

		expect(toggle).toHaveAttribute("aria-expanded", "true");
		const modal = document.getElementById("relationship-modal") as HTMLElement;
		expect(modal).toHaveAttribute("aria-modal", "true");
		expect(modal.querySelector("h2")).toHaveTextContent("Relationship");
		expect(modal.querySelector("#roles")).toBeInTheDocument();
		expect(container.querySelector("tr.detail")).toBeNull();

		await fireEvent.click(toggle);
		expect(document.getElementById("relationship-modal")).toBeNull();

		// One modal, one relationship at a time: a second row replaces the first.
		const others = screen.getAllByRole("button", { name: /^Evidence for/ });
		await fireEvent.click(others[0]);
		const first = document.querySelector(
			"#relationship-modal .body",
		)?.textContent;
		await fireEvent.click(others[1]);
		const modals = document.querySelectorAll("#relationship-modal");
		expect(modals).toHaveLength(1);
		expect(modals[0].querySelector(".body")?.textContent).not.toBe(first);
	});

	it("names a named agreement on its row's toggle and in its modal's title, so two between one pair read apart (#74)", async () => {
		const model = rivermartModel();
		const named = model.workspace.relationships.filter((r) => r.name);
		const warehouse = named[0].target;
		// Give each a comment so both rows carry a toggle.
		for (const r of named)
			if (!r.comments.length) r.comments.push({ text: "Recorded." });
		position(model, warehouse);
		for (const r of named) {
			// The row itself names it beside the type, not only the toggle.
			const row = screen
				.getAllByRole("row")
				.find(
					(tr) =>
						tr.querySelector(".agreement")?.textContent === ` · ${r.name}`,
				);
			expect(row).toBeDefined();
			const toggle = screen.getByRole("button", {
				name: `Evidence for ${r.source.name} and ${r.target.name}, the ${r.name} agreement`,
			});
			await fireEvent.click(toggle);
			const modal = document.getElementById(
				"relationship-modal",
			) as HTMLElement;
			expect(modal.querySelector(".agreement")).toHaveTextContent(
				`· ${r.name}`,
			);
			await fireEvent.click(toggle);
		}
	});

	it("closes the modal on Escape and puts focus back on the row's toggle", async () => {
		const { model, context } = petstoreSales();
		position(model, context);
		const toggle = screen.getAllByRole("button", { name: /^Evidence for/ })[0];
		toggle.focus();
		await fireEvent.click(toggle);
		const modal = document.getElementById("relationship-modal") as HTMLElement;
		expect(modal).not.toBeNull();

		await fireEvent.keyDown(modal, { key: "Escape" });

		expect(document.getElementById("relationship-modal")).toBeNull();
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(document.activeElement).toBe(toggle);
	});

	it("leaves the toggle and disposition columns out where nothing is recorded", () => {
		const model = edgeCaseModel();
		const context = model.workspace.boundedcontexts.get(
			"main_context",
		) as BoundedContext;
		const { container } = position(model, context);
		expect(
			[...container.querySelectorAll("thead th")].map((th) =>
				th.textContent?.trim(),
			),
		).toEqual(["With", "Description", "Type", "Upstream", "Downstream"]);
		expect(document.getElementById("relationship-modal")).toBeNull();
		// With no description of its own, the row reads the generated sentence.
		expect(
			container.querySelector("tbody td:nth-child(2) .description")?.textContent
				?.length,
		).toBeGreaterThan(0);
	});

	it("says so when a context has no explicit relationship at all", () => {
		const model = edgeCaseModel();
		const context = model.workspace.boundedcontexts.get(
			"thin_context",
		) as BoundedContext;
		position(model, context);
		expect(
			screen.getByText(
				"No explicit relationships. Consumptions imply upstream and downstream links.",
			),
		).toHaveClass("empty");
	});

	it("treats an empty or whitespace-only description as generated, the way the DSL writes it", () => {
		const workspace = new Workspace("Blank", {
			description: "Relationships with blank descriptions.",
			version: "0.1.0",
		});
		const hub = workspace.addBoundedContext("Hub", { description: "The hub." });
		const a = workspace.addBoundedContext("A", { description: "A." });
		const b = workspace.addBoundedContext("B", { description: "B." });
		const empty = hub.upstreamOf(a, { description: "" });
		const blank = hub.upstreamOf(b, { description: "  \t" });
		const model = { workspace, fileLabel: "b.json", diagnostics: [] };
		const { container } = position(model, hub);

		const spans = [
			...container.querySelectorAll<HTMLElement>("span.description"),
		];
		expect(spans).toHaveLength(2);
		for (const [span, r] of [
			[spans[0], empty],
			[spans[1], blank],
		] as const) {
			expect(span).toHaveClass("description", "generated");
			expect(
				span.textContent?.startsWith(
					narrativeText(relationshipNarrative(r, hub)),
				),
			).toBe(true);
			expect(span.querySelector(".keyword")).toHaveTextContent("generated");
		}
	});

	it("marks a description the model generated, and leaves an authored one exactly as written", () => {
		const workspace = new Workspace("Provenance", {
			description: "Two relationships, one described.",
			version: "0.1.0",
		});
		const hub = workspace.addBoundedContext("Hub", { description: "The hub." });
		const written = workspace.addBoundedContext("Written", {
			description: "Has an authored relationship.",
		});
		const silent = workspace.addBoundedContext("Silent", {
			description: "Has none.",
		});
		const authored = "A sentence somebody chose to write.";
		hub.upstreamOf(written, { description: authored });
		const generatedRel = hub.upstreamOf(silent);
		const model = { workspace, fileLabel: "p.json", diagnostics: [] };
		const { container } = position(model, hub);

		const spans = [...container.querySelectorAll("span.description")];
		expect(spans).toHaveLength(2);
		const written$ = spans.find((s) => s.textContent?.includes(authored));
		const generated = spans.find((s) => s !== written$) as HTMLElement;

		// Authored: the text and nothing else.
		expect(written$?.textContent).toBe(authored);
		expect(written$).not.toHaveClass("generated");
		expect(written$?.querySelector(".keyword")).toBeNull();

		// Generated: the core sentence, in the generated class, then the keyword.
		const sentence = narrativeText(relationshipNarrative(generatedRel, hub));
		expect(generated).toHaveClass("description", "generated");
		expect(generated.textContent?.startsWith(sentence)).toBe(true);
		const keyword = generated.querySelector(".keyword") as HTMLElement;
		expect(keyword).toHaveTextContent("generated");
		expect(keyword.title).toBe(
			"Generated from the relationship's type and roles. The model has no authored description.",
		);
		expect(
			container.querySelectorAll(".keyword[title^='Generated from']"),
		).toHaveLength(1);
	});
});
