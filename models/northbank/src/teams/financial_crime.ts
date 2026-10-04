import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as AccountsSurface } from "./accounts.ts";
import type { Published as CardsSurface } from "./cards.ts";
import type { Published as CustomerPlatformSurface } from "./customer_platform.ts";
import { foreign } from "./foreign.ts";

/** This team's file in the NorthBank set. */
export const FILE = "financial_crime.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Financial Crime",
	attributes: {
		id: "northbank_financial_crime",
		description:
			"NorthBank's Financial Crime Team: sanctions screening and fraud scoring, the screening vendor behind them, and the Risk & Compliance domain.",
		version: "1.0.0",
		primaryColor: "#1d4ed8",
	},
} as const;

/**
 * What other teams may name in this file. A team's `link` reaches into another
 * team's workspace only through these refs, type-checked against this list.
 */
export const published = {
	consumables: [
		"#/boundedcontexts/fraud/aggregates/fraud_case/provides/fraud_case_opened",
		"#/boundedcontexts/fraud/services/fraud_app/provides/score_transaction",
		"#/boundedcontexts/fraud/services/transaction_scorer/provides/transaction_flagged",
		"#/boundedcontexts/sanctions_screening/aggregates/screening_result/provides/party_matched",
		"#/boundedcontexts/sanctions_screening/services/screening_app/provides/screen_party",
	],
	contexts: [
		"#/boundedcontexts/fraud",
		"#/boundedcontexts/sanctions_screening",
	],
	subdomains: ["#/domains/risk_&_compliance/subdomains/regulatory_reporting"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const riskDomain = ws.addDomain("Risk & Compliance", {
		description: "Financial crime and the regulator",
	});
	const fraudSD = riskDomain.addSubdomain("Fraud", {
		type: "core",
		description: "Every missed flag is the bank's money",
	});
	const sanctionsSD = riskDomain.addSubdomain("Sanctions Screening", {
		type: "generic",
		description: "Bought lists, bought engine",
	});
	riskDomain.addSubdomain("Regulatory Reporting", {
		type: "supporting",
		description: "Returns to the PCA, reconciled to the ledger",
	});

	const financialCrimeTeam = ws.addTeam("Financial Crime Team", {
		description: "Sanctions screening, fraud scoring, cases",
	});

	const sanctionsBC = sanctionsSD.addBoundedcontext("Sanctions Screening", {
		description: "Names against lists, with a match score",
		team: financialCrimeTeam,
	});

	const fraudBC = fraudSD.addBoundedcontext("Fraud", {
		description: "The transaction scorer and fraud cases",
		team: financialCrimeTeam,
	});

	// There is no Shared Kernel context. Card 56 made one, with a Shared Kernel
	// Team, and gave six contexts a shared-kernel relationship with it; the
	// interview names two owners of the library, Accounts and the ledger, and
	// nobody named the team. The kernel is the pairwise one between those two, and
	// every other context that carries an amount borrows it over a directed
	// relationship (DISCOVERY, revision for card 157; decision 16's amendment of
	// 2026-09-30).
	// The systems the bank integrates with and does not run: the screening
	// vendor behind Sanctions Screening ("the lists are bought; the screening
	// engine is bought"), CardCo, which sends the authorisation requests Cards
	// answers, the payment scheme the gateway submits to, and the credit bureau
	// Credit Decisioning pulls a report from. None has a subdomain or a team
	// here, and none has aggregates, because what happens inside somebody else's
	// machine is not ours to state (decision 28).
	const screeningVendorBC = ws.addBoundedContext("Screening Vendor", {
		description:
			"The bought sanctions lists and the bought screening engine, behind a documented API. Not the bank's",
		external: true,
	});

	// SANCTIONS SCREENING
	// DISCOVERY: Financial Crime lead. Bought lists, bought engine, documented API.
	const screeningAgg = sanctionsBC.addAggregate("ScreeningResult", {
		description: "One name checked against the lists",
	});
	const screening = screeningAgg.addRootEntity("ScreeningResult", {
		description: "The outcome for one party",
	});
	const matchScoreVO = sanctionsBC.addValueObject("MatchScore", {
		description: "0 to 100; above the threshold is a match",
	});
	matchScoreVO.addAttribute("value", { type: "int 0..100" });
	screening.addAttribute("resultId", { type: "string", identity: true });
	// The engine's own reference for the match. The vendor has no entities here
	// to name -- what is inside a bought engine is not the bank's to state -- so
	// the attribute names the system the id belongs to (decision 28, card 81).
	screening.addAttribute("vendorMatchRef", {
		type: "string",
		identifies: screeningVendorBC,
	});
	screening.addAttribute("partyName", { type: "string" });
	screening.addAttribute("score", {
		type: "MatchScore",
		valueobject: matchScoreVO,
	});
	screening.uses(matchScoreVO, "scored", "1");

	// DISCOVERY: Financial Crime lead. "The lists are bought; the screening
	// engine is bought; the API is documented" -- so the engine is a system the
	// bank calls, and Screening takes its answer as published (decision 28).
	const listMatchSchema = screeningVendorBC.addSchema("ListMatchQuery", {
		description: "The vendor's query format, which the bank does not negotiate",
	});
	listMatchSchema.addAttribute("name", { type: "string" });
	listMatchSchema.addAttribute("dateOfBirth", { type: "date" });
	listMatchSchema.addAttribute("country", { type: "ISO 3166 code" });
	const vendorApi = screeningVendorBC.addService("Screening Engine API", {
		description: "The vendor's documented interface, and all the bank can see",
		type: "application",
	});
	const matchAgainstLists = vendorApi.provides("MatchAgainstLists", {
		description: "Score a name against the bought lists",
		type: "operation",
		pattern: "open-host-service",
		schema: listMatchSchema,
	});

	const partyMatchedSchema = sanctionsBC.addSchema("PartyMatched");
	partyMatchedSchema.addAttribute("resultId", {
		type: "string",
		identity: true,
	});
	partyMatchedSchema.addAttribute("score", {
		type: "MatchScore",
		valueobject: matchScoreVO,
	});

	const partyMatched = screeningAgg.provides("PartyMatched", {
		description: "The name matched a list; the caller stops",
		type: "event",
		pattern: "published-language",
		schema: partyMatchedSchema,
	});
	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	const screeningApp = sanctionsBC.addService("ScreeningApp", {
		description:
			"Sanctions Screening's application service: the boundary the bank screens names through",
		type: "application",
	});
	// Screening asks for a name in the vendor's own words: it is the vendor's
	// query format that goes in at the bank's boundary and straight out at the
	// vendor's, which is what "reshapes nothing" means. A conformist may carry
	// its upstream's schema, and that borrowing is the whole of the role
	// (decisions 03 and 16, card 81); the duplicate shape Screening used to
	// declare said the same thing twice and let the two drift apart.
	const screenParty = screeningApp
		.provides("ScreenParty", {
			description: "Check a name, date of birth and country against the lists",
			type: "operation",
			pattern: "open-host-service",
			schema: listMatchSchema,
		})
		.raises(partyMatched);

	// FRAUD
	// DISCOVERY: Financial Crime lead. Synchronous scoring; a flag opens a case;
	// a case always has an alert; a score always has reasons.
	const fraudCaseAgg = fraudBC.addAggregate("FraudCase", {
		description: "A suspected fraud and the alerts behind it",
	});
	const fraudCase = fraudCaseAgg.addRootEntity("FraudCase", {
		description: "One investigation",
	});
	const alert = fraudCaseAgg.addEntity("Alert", {
		description: "One flagged transaction with its score",
	});
	const riskScoreVO = fraudBC.addValueObject("RiskScore", {
		description: "0 to 1000 with the reasons that produced it",
	});
	riskScoreVO.addAttribute("value", { type: "int 0..1000" });
	const riskReasons = riskScoreVO.addAttribute("reasons", { type: "string[]" });
	// The value's own rule: a score without its reasons is not a score the bank
	// may act on, and no save is involved in keeping that true.
	riskScoreVO
		.addInvariant("ScoreExplained", {
			description:
				"A score carries its reasons, because the customer may be entitled to them",
		})
		.constrains(riskReasons);
	const caseStatusVO = fraudBC.addValueObject("CaseStatus", {
		description: "open, confirmed, dismissed",
	});
	caseStatusVO.addAttribute("value", {
		type: "'open' | 'confirmed' | 'dismissed'",
	});
	fraudCase.addAttribute("caseId", { type: "string", identity: true });
	// The customer and the account a case is about both live in other contexts, so
	// the case holds their identities and says which roots they are of.
	const fraudCaseCustomerIdAttr = fraudCase.addAttribute("customerId", {
		type: "string",
	});
	const fraudCaseAccountIdAttr = fraudCase.addAttribute("accountId", {
		type: "string",
	});
	alert.addAttribute("alertId", { type: "string", identity: true });
	alert.addAttribute("transactionRef", { type: "string" });
	alert.addAttribute("score", { type: "RiskScore", valueobject: riskScoreVO });
	fraudCase.includes(alert, "raised-by", "1..*");
	fraudCase.addAttribute("status", {
		type: "CaseStatus",
		valueobject: caseStatusVO,
	});
	fraudCase.uses(caseStatusVO, "has-status", "1");
	alert.uses(riskScoreVO, "scored", "1");

	fraudCaseAgg
		.addInvariant("CaseHasAlert", {
			description: "A case always has at least one alert",
		})
		.constrains(fraudCase, alert);

	const scoreTransactionSchema = fraudBC.addSchema("ScoreTransaction", {
		description:
			"What the scorer needs: the transaction, its channel, amount and payee",
	});
	scoreTransactionSchema.addAttribute("transactionRef", {
		type: "string",
		identity: true,
	});
	scoreTransactionSchema.addAttribute("channel", {
		type: "'payment' | 'card'",
	});
	scoreTransactionSchema.addAttribute("amountMinor", { type: "int64" });
	scoreTransactionSchema.addAttribute("payeeIban", { type: "string" });
	// DISCOVERY: Financial Crime lead, "synchronous scoring": the caller waits and
	// is told. The verdict is what ScoreTransaction answers with, so it is the
	// operation's `returns` and the shape Payments' process waits on (decision 23).
	// It was a pair of published events until card 92, which made a caller
	// subscribe to hear the answer to its own question.
	const transactionVerdictSchema = fraudBC.addSchema("TransactionVerdict", {
		description:
			"What the scorer answers with: the transaction and its score, reasons and all; above the threshold is a flag",
	});
	transactionVerdictSchema.addAttribute("transactionRef", {
		type: "string",
		identity: true,
	});
	transactionVerdictSchema.addAttribute("channel", {
		type: "'payment' | 'card'",
	});
	transactionVerdictSchema.addAttribute("score", {
		type: "RiskScore",
		valueobject: riskScoreVO,
	});
	const fraudCaseSchema = fraudBC.addSchema("FraudCaseOpened");
	fraudCaseSchema.addAttribute("caseId", { type: "string", identity: true });
	fraudCaseSchema.addAttribute("accountId", { type: "string" });

	// The flag belongs to the scorer, not the case: a flag opens a case, so the
	// FraudCase aggregate cannot be what raises it. A flag is a fact the bank acts
	// on wherever it happened — Cards blocks the card on one — which is why it is
	// still an event beside the answer the caller waited for; a clearance is not a
	// fact anybody publishes, it is the call coming back, and it was an event only
	// because the model had nowhere else to put it (card 92).
	const transactionScorer = fraudBC.addService("TransactionScorer", {
		description:
			"The bank's own model; a domain service because it reads across every customer's history",
		type: "domain",
	});
	const transactionFlagged = transactionScorer.provides("TransactionFlagged", {
		description: "Above threshold; a case is opened and the card is blocked",
		type: "event",
		pattern: "published-language",
		schema: transactionVerdictSchema,
	});
	const fraudCaseOpened = fraudCaseAgg.provides("FraudCaseOpened", {
		description: "An investigation began; the account is frozen",
		type: "event",
		pattern: "published-language",
		schema: fraudCaseSchema,
	});
	const openCase = fraudCaseAgg
		.provides("OpenCase", {
			description:
				"Open a case with the flagged transaction as its first alert",
			type: "operation",
			internal: true,
		})
		.raises(fraudCaseOpened);
	fraudCaseAgg.provides("CloseCase", {
		description: "Confirm or dismiss",
		type: "operation",
		internal: true,
	});

	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	const fraudApp = fraudBC.addService("FraudApp", {
		description:
			"Fraud's application service: the boundary other contexts ask for a verdict through, in front of the scorer",
		type: "application",
	});
	fraudApp
		.provides("ScoreTransaction", {
			description:
				"Score synchronously; the caller waits and is answered with the verdict, and a flag is published as well because other contexts act on it",
			type: "operation",
			pattern: "open-host-service",
			schema: scoreTransactionSchema,
			returns: transactionVerdictSchema,
		})
		.raises(transactionFlagged);

	fraudBC
		.addPolicy("Open case on flag", {
			description: "Every flag becomes a case with the alert attached",
		})
		.on(transactionFlagged)
		.issues(openCase);

	fraudBC.addTerm("Alert", {
		definition: "One flagged transaction and its score",
		embodiedBy: alert,
	});
	fraudBC.addTerm("APP scam", {
		definition:
			"An authorised push payment the customer was tricked into making; reimbursable, so every missed flag costs the bank",
		embodiedBy: transactionScorer,
	});

	// Post-authorisation monitoring: card authorisations are part of the history
	// the scorer reads, translated at Fraud's boundary into its own words. What
	// takes the fact in is a reaction, not the query that later reads it -- an
	// operation is issued rather than woken -- so the policy is what the
	// subscription names, and it issues the step that files the authorisation
	// (`consumption-by-reactor`, card 98).
	const recordAuthorisation = fraudApp.provides("RecordCardAuthorisation", {
		description:
			"File an approved card authorisation in the history the scorer reads, in Fraud's own words",
		type: "operation",
		internal: true,
	});
	const fileCardAuthorisation = fraudBC
		.addPolicy("File a card authorisation", {
			description:
				"Every approved authorisation joins the history the scorer reads; nothing else happens on one",
		})
		.issues(recordAuthorisation);
	return {
		fraudCaseCustomerIdAttr,
		fraudCaseAccountIdAttr,
		fileCardAuthorisation,
		screeningApp,
		matchAgainstLists,
		screenParty,
		screeningVendorBC,
		sanctionsBC,
		fraudApp,
		fraudBC,
	};
}

const built = new WeakMap<Workspace, ReturnType<typeof build>>();

/** Phase one: everything this team can state without naming another team's file. */
export function declare(ws: Workspace): void {
	built.set(ws, build(ws));
}

/** Phase two: every statement that names an element of another file. Run after the set exists. */
export function link(set: WorkspaceSet): void {
	const ws = set.byPath(FILE);
	const own = ws && built.get(ws);
	if (!own) throw new Error(`${FILE} was not declared before it was linked`);
	const {
		fraudCaseCustomerIdAttr,
		fraudCaseAccountIdAttr,
		fileCardAuthorisation,
		screeningApp,
		matchAgainstLists,
		screenParty,
		screeningVendorBC,
		sanctionsBC,
		fraudApp,
		fraudBC,
	} = own;
	const accounts = foreign<AccountsSurface>(set, "accounts.json");
	const account = accounts.entity(
		"#/boundedcontexts/accounts/aggregates/account/entities/account",
	);
	const cards = foreign<CardsSurface>(set, "cards.json");
	const cardAuthorised = cards.consumable(
		"#/boundedcontexts/cards/aggregates/card/provides/card_authorised",
	);
	const cardsBC = cards.context("#/boundedcontexts/cards");
	const customerPlatform = foreign<CustomerPlatformSurface>(
		set,
		"customer_platform.json",
	);
	const customer = customerPlatform.entity(
		"#/boundedcontexts/customer_&_kyc/aggregates/customer/entities/customer",
	);

	screeningApp.consumes(matchAgainstLists, {
		pattern: "conformist",
		by: [screenParty],
	});
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: screeningVendorBC,
		downstream: sanctionsBC,
		description:
			"The engine's API is the vendor's; Screening calls it as documented and reshapes nothing",
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["conformist"],
	});

	fraudCaseCustomerIdAttr.identifies = customer;
	fraudCaseAccountIdAttr.identifies = account;
	fileCardAuthorisation.on(cardAuthorised);
	fraudApp.consumes(cardAuthorised, {
		pattern: "anti-corruption-layer",
		by: [fileCardAuthorisation],
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: cardsBC,
		downstream: fraudBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
		description: "Post-authorisation monitoring",
	});
}
