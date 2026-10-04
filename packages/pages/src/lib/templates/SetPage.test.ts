import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { loadSet } from "../load";
import { cxPayloads } from "../set-fixture";
import SetPage from "./SetPage.svelte";

const diagnostic = (
	rule: string,
	severity: "error" | "warning",
	ref = "#",
) => ({
	severity,
	rule,
	message: `${rule} says no`,
	ref,
});

describe("SetPage", () => {
	it("counts what each file has wrong, in words, and names a clean file's problems none", () => {
		const [a, b] = cxPayloads();
		a.diagnostics = [
			diagnostic("r1", "error"),
			diagnostic("r2", "warning"),
			diagnostic("r3", "warning"),
		];
		b.diagnostics = [];
		const loaded = loadSet([a, b]);
		render(SetPage, { loaded });
		const rows = [...document.querySelectorAll("#workspaces tbody tr")];
		expect(rows[0].textContent).toContain("1 error, 2 warnings");
		expect(rows[1].textContent).toContain("none");
		expect(rows[1].textContent).toContain("loaded");
	});

	it("says one error and one warning in the singular", () => {
		const [a, b] = cxPayloads();
		a.diagnostics = [diagnostic("r1", "error"), diagnostic("r2", "warning")];
		b.diagnostics = [];
		render(SetPage, { loaded: loadSet([a, b]) });
		expect(
			document.querySelector("#workspaces tbody tr")?.textContent,
		).toContain("1 error, 1 warning");
	});

	it("says one file in the singular, and shows a file shown from its last good load", () => {
		const [a] = cxPayloads();
		a.stale = "Its current text does not load.";
		a.diagnostics = [];
		render(SetPage, { loaded: loadSet([a]) });
		expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
			"1 file",
		);
		expect(screen.getByText("last good load")).toHaveAttribute(
			"title",
			"Its current text does not load.",
		);
	});

	it("says there are no problems when every file is clean and nothing was left out", () => {
		const [a, b] = cxPayloads();
		a.diagnostics = [];
		b.diagnostics = [];
		render(SetPage, { loaded: loadSet([a, b]) });
		expect(
			screen.getByText("No problems found in any file."),
		).toBeInTheDocument();
	});

	it("names a file left out, and says nothing of 'no problems' beside it", () => {
		const [a, b] = cxPayloads();
		a.diagnostics = [];
		b.diagnostics = [];
		const loaded = loadSet([
			a,
			b,
			{ schema: 5, fileLabel: "nope.json", path: "nope.json", set: "cx" },
		]);
		render(SetPage, { loaded });
		expect(screen.queryByText("No problems found in any file.")).toBeNull();
		const alert = screen.getByRole("alert");
		expect(alert.textContent).toContain("is not a workspace file");
	});

	it("shows each notice the host gave, once, and the address that names no file", () => {
		const [a, b] = cxPayloads();
		const loaded = loadSet(
			[a, b],
			["Only two were reached.", "Only two were reached."],
		);
		render(SetPage, { loaded, missing: "gone.json" });
		expect(screen.getAllByText("Only two were reached.")).toHaveLength(1);
		expect(
			document.querySelector('[data-notice="missing"]')?.textContent,
		).toContain("names no workspace file in the project: gone.json");
	});
});
