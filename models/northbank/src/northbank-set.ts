import { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import * as accounts from "./teams/accounts.ts";
import * as cards from "./teams/cards.ts";
import * as channels from "./teams/channels.ts";
import * as coreBanking from "./teams/core_banking.ts";
import * as creditRisk from "./teams/credit_risk.ts";
import * as customerPlatform from "./teams/customer_platform.ts";
import * as digitalPlatform from "./teams/digital_platform.ts";
import * as financeSystems from "./teams/finance_systems.ts";
import * as financialCrime from "./teams/financial_crime.ts";
import * as lending from "./teams/lending.ts";
import * as payments from "./teams/payments.ts";
import * as schemeConnectivity from "./teams/scheme_connectivity.ts";

/*
 * Relationships NorthBank deliberately does not declare (this note sat beside
 * the relationships when they were one list; each team now declares the ones
 * whose downstream context it owns):
 *
 * Four identity-only relationships used to sit here: Lending on Accounts,
 * Fraud on Customer & KYC, Fraud on Accounts, Identity & Access on Customer &
 * KYC. Each was joined by nothing but an identity attribute naming the other
 * context's entity, so neither end played a role, both lists were empty, and
 * the description said in words that nothing is exchanged. That is a shape DDD
 * does not have, and the model already had the record it needed: the context
 * map draws an identity crossing as an implied «id» edge. `relationship-
 * declared` no longer asks for a relationship on top of one (decision 14's
 * amendment of 2026-09-09; card 100), and the four are gone. The dependencies
 * are not: they read on the map, from the attributes that hold them.
 *
 * Scheme Gateway had been dropped from that list earlier, for the instruction
 * id its SchemeSubmission and SchemeSettlement payloads carry. An id echoed in
 * a payload is not a dependency at all: the gateway writes the instruction id
 * into the message so that Payments can recognise the answer, and it stores
 * nothing and asks Payments for nothing (decision 14, second amendment;
 * card 90).
 */

/**
 * The twelve team modules, in the order their files are listed in the set,
 * and the order the teams link in.
 *
 * Linking creates consumptions, and a provider lists its consumers in the
 * order they were created (a consumable map draws that list; so does a set
 * loaded from the files, which links the files in the order it was given).
 * This order keeps every provider's consumers in the order the old single
 * workspace had them: Accounts before Financial Crime and Finance Systems,
 * Core Banking before Finance Systems, Payments before Cards, Lending and
 * Channels, Lending before Credit Risk and Channels, Credit Risk and Cards
 * before Channels (each rule is a provider that two teams consume). Among the
 * orders that do, it is the one that reaches each team's contexts in the order
 * the old workspace first did.
 *
 * Each is a complete workspace of its own; nothing is merged and no module
 * imports another at run time (cross-team references are `import type`).
 */
export const teams = [
	customerPlatform,
	accounts,
	financialCrime,
	coreBanking,
	payments,
	schemeConnectivity,
	cards,
	lending,
	creditRisk,
	financeSystems,
	channels,
	digitalPlatform,
] as const;

/**
 * Where the set is written, and the files it consists of, in set order. These
 * are the authoritative outputs of the build: there is no other NorthBank file.
 */
export const OUTPUT = {
	dir: ".ods",
	files: teams.map((team) => team.FILE as string),
} as const;

/**
 * NorthBank as twelve workspaces: every team declares its own, the set joins
 * them, and only then does each team link the elements it names in another
 * team's file.
 */
export function buildNorthbankSet(): WorkspaceSet {
	const entries = teams.map((team): [string, Workspace] => [
		team.FILE,
		new Workspace(team.meta.name, team.meta.attributes),
	]);
	teams.forEach((team, i) => {
		team.declare(entries[i][1]);
	});
	const set = WorkspaceSet.fromWorkspaces(entries);
	for (const team of teams) team.link(set);
	return set;
}
