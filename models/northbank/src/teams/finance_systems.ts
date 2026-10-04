import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as AccountsSurface } from "./accounts.ts";
import type { Published as CoreBankingSurface } from "./core_banking.ts";
import type { Published as FinancialCrimeSurface } from "./financial_crime.ts";
import { foreign } from "./foreign.ts";
import type { Published as LendingSurface } from "./lending.ts";

/** This team's file in the NorthBank set. */
export const FILE = "finance_systems.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Finance Systems",
	attributes: {
		id: "northbank_finance_systems",
		description: "NorthBank's Finance Systems Team: regulatory reporting.",
		version: "1.0.0",
		primaryColor: "#1d4ed8",
	},
} as const;

/**
 * What other teams may name in this file. A team's `link` reaches into another
 * team's workspace only through these refs, type-checked against this list.
 */
export const published = {} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const financeSystemsTeam = ws.addTeam("Finance Systems Team", {
		description: "Regulatory reporting",
	});

	const reportingBC = ws.addBoundedContext("Regulatory Reporting", {
		description: "Returns assembled from events and reconciled to the ledger",
		team: financeSystemsTeam,
	});

	// REGULATORY REPORTING
	// DISCOVERY: Finance Systems lead. Lines reconcile to the ledger; period closed
	// before filing; filed once; events taken as published.
	const returnAgg = reportingBC.addAggregate("RegulatoryReturn", {
		description: "One report code for one period and its lines",
	});
	const regReturn = returnAgg.addRootEntity("RegulatoryReturn", {
		description: "A return to the PCA",
	});
	const reportLine = returnAgg.addEntity("ReportLine", {
		description: "One line code and its amount",
	});
	const periodVO = reportingBC.addValueObject("ReportingPeriod", {
		description: "Month or quarter; closed before filing",
	});
	periodVO.addAttribute("from", { type: "date" });
	periodVO.addAttribute("to", { type: "date" });
	periodVO.addAttribute("closed", { type: "boolean" });

	regReturn.addAttribute("returnId", { type: "string", identity: true });
	regReturn.addAttribute("reportCode", { type: "string" });
	regReturn.addAttribute("filedAt", { type: "date-time" });
	reportLine.addAttribute("lineCode", { type: "string", identity: true });
	const reportLineAmountAttr = reportLine.addAttribute("amount", {
		type: "Money",
	});
	regReturn.includes(reportLine, "made-of", "1..*");
	regReturn.addAttribute("period", {
		type: "ReportingPeriod",
		valueobject: periodVO,
	});
	regReturn.uses(periodVO, "for-period", "1");
	// Money is borrowed from Ledger, so it is typed by `valueobject` reference
	// only, with no `uses` relation to cross with it.
	returnAgg
		.addInvariant("PeriodClosedBeforeFiling", {
			description: "A return is filed only for a closed period",
		})
		.constrains(periodVO);
	returnAgg
		.addInvariant("FiledOnceOnly", {
			description: "A return is filed once; corrections are a new return",
		})
		.constrains(regReturn);

	const returnFiled = returnAgg.provides("ReturnFiled", {
		description: "Sent to the regulator",
		type: "event",
		internal: true,
	});
	const accumulateLine = returnAgg.provides("AccumulateLine", {
		description: "Add an event's amount to the right line",
		type: "operation",
		internal: true,
	});
	const fileReturn = returnAgg
		.provides("FileReturn", {
			description: "File a closed period's return",
			type: "operation",
			internal: true,
		})
		.raises(returnFiled);
	// The ledger is another context, so this is checked before the call
	// proceeds, not a rule the return can hold on its own: a precondition of
	// filing, named on the operation it guards (decision 19, amendment of
	// 2026-09-09; card 105).
	returnAgg
		.addInvariant("LinesReconcileToLedger", {
			description:
				"A return is filed only when every line has been reconciled to the ledger postings for its period; FileReturn refuses an unreconciled line",
			precondition: true,
		})
		.constrains(fileReturn);

	// Reporting takes its facts in at its own boundary: an aggregate is a
	// consistency boundary, not a client, so ReportingApp is what subscribes and
	// the policy below is what accumulates (decision 17).
	const reportingApp = reportingBC.addService("ReportingApp", {
		description:
			"Regulatory Reporting's application service: the boundary through which the postings, openings and disbursements a return is built from arrive",
		type: "application",
	});

	const accumulateOnPosting = reportingBC
		.addPolicy("Accumulate on posting", {
			description:
				"Ledger postings, account openings and disbursements each add to a line as they happen, and Sovereign's nightly batch adds the savings movements",
		})
		.issues(accumulateLine);

	reportingBC.addTerm("Return", {
		definition:
			"A report to the regulator. The branches' 'return' is a returned payment",
		embodiedBy: returnAgg,
	});
	reportingBC.addTerm("Reporting period", {
		definition: "The month or quarter a return covers",
		embodiedBy: periodVO,
	});

	const gen = accumulateOnPosting;
	return {
		reportingBC,
		reportLineAmountAttr,
		accumulateOnPosting,
		gen,
		reportingApp,
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
		reportingBC,
		reportLineAmountAttr,
		accumulateOnPosting,
		gen,
		reportingApp,
	} = own;
	const accounts = foreign<AccountsSurface>(set, "accounts.json");
	const accountOpened = accounts.consumable(
		"#/boundedcontexts/accounts/aggregates/account/provides/account_opened",
	);
	const accountsBC = accounts.context("#/boundedcontexts/accounts");
	const coreBanking = foreign<CoreBankingSurface>(set, "core_banking.json");
	const reportMoney = coreBanking.valueobject(
		"#/boundedcontexts/ledger/valueobjects/money",
	);
	const entryPosted = coreBanking.consumable(
		"#/boundedcontexts/ledger/aggregates/journal_entry/provides/entry_posted",
	);
	const nightlyBatchCompleted = coreBanking.consumable(
		"#/boundedcontexts/sovereign_core_(legacy)/aggregates/savings_account_record/provides/nightly_batch_completed",
	);
	const ledgerBC = coreBanking.context("#/boundedcontexts/ledger");
	const sovereignBC = coreBanking.context(
		"#/boundedcontexts/sovereign_core_(legacy)",
	);
	const financialCrime = foreign<FinancialCrimeSurface>(
		set,
		"financial_crime.json",
	);
	const reportingSD = financialCrime.subdomain(
		"#/domains/risk_&_compliance/subdomains/regulatory_reporting",
	);
	const lending = foreign<LendingSurface>(set, "lending.json");
	const loanDisbursed = lending.consumable(
		"#/boundedcontexts/lending/aggregates/loan/provides/loan_disbursed",
	);
	const lendingBC = lending.context("#/boundedcontexts/lending");

	reportingBC.serves(reportingSD);
	reportLineAmountAttr.valueobject = reportMoney;

	reportingApp.consumes(entryPosted, { pattern: "conformist" });
	reportingApp.consumes(accountOpened, { pattern: "conformist" });
	reportingApp.consumes(loanDisbursed, { pattern: "conformist" });

	accumulateOnPosting.on(entryPosted, accountOpened, loanDisbursed);

	// DISCOVERY: Finance Systems lead, "we accumulate lines from ledger postings,
	// account openings and loan disbursements as they happen, and from Sovereign's
	// batch for savings". The fourth event was consumed and never reacted to, so
	// the model said Reporting depended on the batch and never what it did with it
	// (`subscription-backed`, card 92). It is written here because the batch event
	// is declared in this section.
	reportingApp.consumes(nightlyBatchCompleted, {
		pattern: "anti-corruption-layer",
	});

	gen.on(nightlyBatchCompleted);

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: ledgerBC,
		downstream: reportingBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
	});
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: accountsBC,
		downstream: reportingBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
	});
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: lendingBC,
		downstream: reportingBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: sovereignBC,
		downstream: reportingBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
	});
}
