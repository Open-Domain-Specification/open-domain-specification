import type { Team } from "@open-domain-specification/core";

/** A team's name, linked to its homepage when it has one. */
export const teamLinkMd = (team: Team) =>
	team.homepage ? `[${team.name}](${team.homepage})` : team.name;
