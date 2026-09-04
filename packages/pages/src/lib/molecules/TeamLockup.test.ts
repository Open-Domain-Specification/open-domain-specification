import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import TeamLockup from "./TeamLockup.svelte";

describe("TeamLockup", () => {
	it("links the team behind its organization codicon", () => {
		const team = [...petstoreModel().workspace.teams.values()][0];
		const { container } = render(TeamLockup, { team });
		expect(screen.getByRole("link", { name: team.name })).toHaveAttribute(
			"href",
			team.ref,
		);
		expect(
			container.querySelector(".codicon-organization"),
		).toBeInTheDocument();
	});

	it("says so plainly when nobody owns the thing", () => {
		render(TeamLockup, { team: undefined });
		expect(screen.getByText("no owning team")).toHaveClass("keyword");
	});
});
