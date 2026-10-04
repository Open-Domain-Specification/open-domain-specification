import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as AccountsSurface } from "./accounts.ts";
import type { Published as CoreBankingSurface } from "./core_banking.ts";
import type { Published as CreditRiskSurface } from "./credit_risk.ts";
import type { Published as CustomerPlatformSurface } from "./customer_platform.ts";
import { foreign } from "./foreign.ts";

/** This team's file in the NorthBank set. */
export const FILE = "lending.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Lending",
	attributes: {
		id: "northbank_lending",
		description:
			"NorthBank's Lending Team: origination and servicing of loans, and the Credit domain.",
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
		"#/boundedcontexts/lending/aggregates/loan/provides/loan_disbursed",
	],
	contexts: ["#/boundedcontexts/lending"],
	entities: [
		"#/boundedcontexts/lending/aggregates/loan_application/entities/loan_application",
	],
	subdomains: ["#/domains/credit/subdomains/credit_decisioning"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const credit = ws.addDomain("Credit", {
		description: "Lending the bank's money well",
	});
	const lendingSD = credit.addSubdomain("Lending", {
		type: "core",
		description:
			"Origination and servicing. A below-market loss rate for fifteen years",
	});
	credit.addSubdomain("Credit Decisioning", {
		type: "core",
		description: "The bank's own scorecard and affordability rules",
	});

	const lendingTeam = ws.addTeam("Lending Team", {
		description:
			"Origination and servicing; one planning board with Credit Risk",
	});

	const lendingBC = lendingSD.addBoundedcontext("Lending", {
		description: "Applications, agreements, loans and schedules",
		team: lendingTeam,
	});

	// LENDING
	// DISCOVERY: Head of Lending. One open application; nothing before signature;
	// APR within cap; installments sum to principal plus interest; arrears on a miss.
	const applicationAgg = lendingBC.addAggregate("LoanApplication", {
		description:
			"A customer asking for an amount over a term, and the decision on it",
	});
	const application = applicationAgg.addRootEntity("LoanApplication", {
		description: "One request for credit",
	});

	const termVO = lendingBC.addValueObject("Term", {
		description: "Months to repay over",
	});
	termVO.addAttribute("months", { type: "int" });
	const decisionVO = lendingBC.addValueObject("Decision", {
		description:
			"approved or declined, with the reasons the customer is entitled to",
	});
	decisionVO.addAttribute("outcome", { type: "'approved' | 'declined'" });
	decisionVO.addAttribute("reasons", { type: "string[]" });
	application.addAttribute("applicationId", { type: "string", identity: true });
	const applicationCustomerIdAttr = application.addAttribute("customerId", {
		type: "string",
	});
	const applicationRequestedAttr = application.addAttribute("requested", {
		type: "Money",
	});
	application.addAttribute("status", {
		type: "'open' | 'decided' | 'withdrawn'",
	});
	application.addAttribute("term", { type: "Term", valueobject: termVO });
	application.addAttribute("decision", {
		type: "Decision",
		valueobject: decisionVO,
		optional: true,
		description: "Absent until Credit Decisioning has answered",
	});
	application.uses(termVO, "over", "1");
	application.uses(decisionVO, "decided", "0..1");
	// Customer lives in Customer & KYC: `customerId` above is the only thing that
	// crosses the boundary. Money is borrowed from Ledger, so it is typed by
	// `valueobject` reference only, with no `uses` relation to cross with it.
	const loanAgg = lendingBC.addAggregate("Loan", {
		description:
			"A signed agreement, its schedule and its installments; the schedule is checked against the principal",
	});
	const loan = loanAgg.addRootEntity("Loan", {
		description: "Money lent under a signed agreement",
	});
	const schedule = loanAgg.addEntity("RepaymentSchedule", {
		description:
			"The plan of installments; an entity because it is re-cut on arrears",
	});
	const installment = loanAgg.addEntity("Installment", {
		description: "One due payment",
	});

	const aprVO = lendingBC.addValueObject("InterestRate", {
		description: "Annual percentage rate, within the regulatory cap",
	});
	aprVO.addAttribute("aprPercent", { type: "decimal" });
	const loanStatusVO = lendingBC.addValueObject("LoanStatus", {
		description: "approved, signed, disbursed, in-arrears, repaid",
	});
	loanStatusVO.addAttribute("value", {
		type: "'approved' | 'signed' | 'disbursed' | 'in-arrears' | 'repaid'",
	});
	loan.addAttribute("loanId", { type: "string", identity: true });
	loan.addAttribute("applicationId", { type: "string" });
	const loanAccountIdAttr = loan.addAttribute("accountId", {
		type: "string",
		description:
			"Identity of the Account the loan is disbursed to, in Accounts; only the id crosses the boundary",
	});
	const loanPrincipalAttr = loan.addAttribute("principal", { type: "Money" });
	loan.addAttribute("apr", { type: "InterestRate", valueobject: aprVO });
	loan.addAttribute("status", {
		type: "LoanStatus",
		valueobject: loanStatusVO,
	});
	schedule.addAttribute("scheduleId", { type: "string", identity: true });
	installment.addAttribute("dueOn", { type: "date", identity: true });
	const installmentAmountAttr = installment.addAttribute("amount", {
		type: "Money",
	});
	installment.addAttribute("paid", { type: "boolean" });
	loan.includes(schedule, "repaid-under", "1");
	schedule.includes(installment, "due", "1..*");
	loan.uses(aprVO, "charged-at", "1");
	loan.uses(loanStatusVO, "has-status", "1");
	loan.references(application, "from-application", "1");
	// The account the loan is disbursed to lives in Accounts: `accountId` above is
	// the only thing that crosses the boundary. The application it came from is in
	// Lending too, so that one stays a relation. Money is borrowed from Ledger, so
	// it is typed by `valueobject` reference only, with no `uses` relation to
	// cross with it.
	loanAgg
		.addInvariant("NoDrawdownBeforeSignature", {
			description: "Nothing is disbursed before the agreement is signed",
		})
		.constrains(loanStatusVO);
	loanAgg
		.addInvariant("AprWithinCap", {
			description: "The APR never exceeds the regulatory cap",
		})
		.constrains(aprVO);
	loanAgg
		.addInvariant("InstallmentsSumToPrincipalPlusInterest", {
			description: "The schedule's installments sum to principal plus interest",
		})
		.constrains(installment, schedule);
	loanAgg
		.addInvariant("ArrearsAfterMissedInstallment", {
			description: "A missed installment puts the loan in arrears",
		})
		.constrains(loanStatusVO, installment);

	const applicationSubmittedSchema = lendingBC.addSchema(
		"ApplicationSubmitted",
		{
			description: "What decisioning receives",
		},
	);
	applicationSubmittedSchema.addAttribute("applicationId", {
		type: "string",
		identity: true,
	});
	const applicationSubmittedSchemaCustomerIdAttr =
		applicationSubmittedSchema.addAttribute("customerId", {
			type: "string",
		});
	const applicationSubmittedSchemaRequestedAttr =
		applicationSubmittedSchema.addAttribute("requested", {
			type: "Money",
		});
	applicationSubmittedSchema.addAttribute("term", {
		type: "Term",
		valueobject: termVO,
	});
	const loanEventSchema = lendingBC.addSchema("LoanEvent", {
		description: "Loan, account and amount; shared by the loan events",
	});
	loanEventSchema.addAttribute("loanId", { type: "string", identity: true });
	const loanEventSchemaAccountIdAttr = loanEventSchema.addAttribute(
		"accountId",
		{
			type: "string",
		},
	);
	const loanEventSchemaAmountAttr = loanEventSchema.addAttribute("amount", {
		type: "Money",
	});

	const applicationSubmitted = applicationAgg.provides("ApplicationSubmitted", {
		description: "A customer asked for credit; decisioning runs",
		type: "event",
		pattern: "published-language",
		schema: applicationSubmittedSchema,
	});
	const loanApproved = applicationAgg.provides("LoanApproved", {
		description: "Decisioning said yes; an offer follows (out of scope)",
		type: "event",
		internal: true,
	});
	const applicationDeclined = applicationAgg.provides("ApplicationDeclined", {
		description: "Decisioning said no, with reasons",
		type: "event",
		internal: true,
	});
	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	const lendingApp = lendingBC.addService("LendingApp", {
		description:
			"Lending's application service: the boundary applications arrive through, and the one that calls decisioning and the ledger",
		type: "application",
	});
	const submitApplication = lendingApp
		.provides("SubmitApplication", {
			description: "Ask for an amount over a term",
			type: "operation",
			pattern: "open-host-service",
			schema: applicationSubmittedSchema,
		})
		.raises(applicationSubmitted);
	// A rule across applications, so it belongs to the context and names the
	// operation that keeps it: SubmitApplication looks over the customer's
	// applications, because one instance cannot see the others (decision 27).
	lendingBC
		.addInvariant("OneOpenApplicationPerCustomer", {
			description:
				"A customer has at most one open application; SubmitApplication refuses a second while one is open",
		})
		.constrains(application, submitApplication);
	const recordDecision = applicationAgg
		.provides("RecordDecision", {
			description: "Store decisioning's outcome and reasons",
			type: "operation",
			internal: true,
		})
		.raises(loanApproved, applicationDeclined);

	const agreementSigned = loanAgg.provides("LoanAgreementSigned", {
		description: "The customer signed; disbursement may proceed",
		type: "event",
		internal: true,
	});
	const loanDisbursed = loanAgg.provides("LoanDisbursed", {
		description:
			"The principal reached the account; the ledger posts and reporting counts it",
		type: "event",
		pattern: "published-language",
		schema: loanEventSchema,
	});
	const installmentMissed = loanAgg.provides("InstallmentMissed", {
		description: "A due installment was not paid",
		type: "event",
		pattern: "published-language",
		schema: loanEventSchema,
	});
	const arrearsNoticeIssued = loanAgg.provides("ArrearsNoticeIssued", {
		description: "The customer was told the loan is in arrears",
		type: "event",
		internal: true,
	});
	lendingApp
		.provides("SignAgreement", {
			description: "Record the signed agreement and create the loan",
			type: "operation",
			pattern: "open-host-service",
			schema: loanEventSchema,
		})
		.raises(agreementSigned);
	const disburse = loanAgg
		.provides("Disburse", {
			description: "Pay the principal into the customer's account",
			type: "operation",
			internal: true,
		})
		.raises(loanDisbursed);
	loanAgg
		.provides("MarkInstallmentMissed", {
			description: "Record a missed due date and move the loan into arrears",
			type: "operation",
			internal: true,
		})
		.raises(installmentMissed);
	loanAgg
		.provides("IssueArrearsNotice", {
			description: "Send the regulatory arrears notice",
			type: "operation",
			internal: true,
		})
		.raises(arrearsNoticeIssued);

	// DELIBERATE (consumable-kind): the arrears rule was transcribed from a
	// process document that names the outcome, not the action. It issues the
	// event where the IssueArrearsNotice operation belongs.
	lendingBC
		.addPolicy("Escalate arrears", {
			description: "A missed installment triggers the arrears notice",
		})
		.on(installmentMissed)
		.issues(arrearsNoticeIssued);

	lendingBC
		.addPolicy("Disburse on signature", {
			description: "A signed agreement is disbursed",
		})
		.on(agreementSigned)
		.issues(disburse);
	// Lending's own step, which is what the policy names (decision 17).
	const postDisbursement = lendingApp.provides("PostDisbursement", {
		description:
			"Post the disbursement to the ledger, through the ACL over PostEntry",
		type: "operation",
		internal: true,
	});

	lendingBC
		.addPolicy("Post disbursement", {
			description:
				"Disbursement is a ledger entry: debit loan book, credit the account",
		})
		.on(loanDisbursed)
		.issues(postDisbursement);

	lendingBC.addTerm("Loan", {
		definition: "Money lent under a signed agreement, repaid by a schedule",
		embodiedBy: loanAgg,
	});
	lendingBC.addTerm("Drawdown", {
		definition:
			"Paying the principal to the customer. The ledger calls it a posting",
		aliases: ["Disbursement"],
		embodiedBy: disburse,
	});
	lendingBC.addTerm("Arrears", {
		definition:
			"At least one installment missed; the regulatory notice follows (IssueArrearsNotice). Notice intervals and forbearance are servicing detail left out (DISCOVERY section 8)",
		embodiedBy: loanStatusVO,
	});

	// Credit Decisioning does not subscribe to ApplicationSubmitted at all: it is
	// called. Lending's own policy hears the event and sends the application
	// through RequestDecision, which is the crossing. The consumption that used to
	// sit here named `Decide` as the subscriber so that the partnership would show
	// traffic both ways; a partnership needs traffic in one direction only
	// (`partnership-backed`), an operation is issued rather than woken
	// (`consumption-by-reactor`), and the dependency it claimed was never real
	// (card 98).
	const requestDecision = lendingApp.provides("RequestDecision", {
		description: "Send a submitted application to Credit Decisioning",
		type: "operation",
		internal: true,
	});

	lendingBC
		.addPolicy("Decide on submission", {
			description: "Every submitted application is sent for a decision",
		})
		.on(applicationSubmitted)
		.issues(requestDecision);
	const recordDecisionPolicy = lendingBC
		.addPolicy("Record decision", {
			description: "The outcome and reasons are stored on the application",
		})
		.issues(recordDecision);
	return {
		applicationCustomerIdAttr,
		applicationRequestedAttr,
		loanAccountIdAttr,
		loanPrincipalAttr,
		installmentAmountAttr,
		applicationSubmittedSchemaCustomerIdAttr,
		applicationSubmittedSchemaRequestedAttr,
		loanEventSchemaAccountIdAttr,
		loanEventSchemaAmountAttr,
		recordDecisionPolicy,
		lendingApp,
		postDisbursement,
		submitApplication,
		requestDecision,
		lendingBC,
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
		applicationCustomerIdAttr,
		applicationRequestedAttr,
		loanAccountIdAttr,
		loanPrincipalAttr,
		installmentAmountAttr,
		applicationSubmittedSchemaCustomerIdAttr,
		applicationSubmittedSchemaRequestedAttr,
		loanEventSchemaAccountIdAttr,
		loanEventSchemaAmountAttr,
		recordDecisionPolicy,
		lendingApp,
		postDisbursement,
		submitApplication,
		requestDecision,
		lendingBC,
	} = own;
	const accounts = foreign<AccountsSurface>(set, "accounts.json");
	const account = accounts.entity(
		"#/boundedcontexts/accounts/aggregates/account/entities/account",
	);
	const coreBanking = foreign<CoreBankingSurface>(set, "core_banking.json");
	const applicationMoney = coreBanking.valueobject(
		"#/boundedcontexts/ledger/valueobjects/money",
	);
	const loanMoney = coreBanking.valueobject(
		"#/boundedcontexts/ledger/valueobjects/money",
	);
	const postEntry = coreBanking.consumable(
		"#/boundedcontexts/ledger/services/ledger_app/provides/post_entry",
	);
	const ledgerBC = coreBanking.context("#/boundedcontexts/ledger");
	const creditRisk = foreign<CreditRiskSurface>(set, "credit_risk.json");
	const decide = creditRisk.consumable(
		"#/boundedcontexts/credit_decisioning/services/decisioning_app/provides/decide",
	);
	const decisionMade = creditRisk.consumable(
		"#/boundedcontexts/credit_decisioning/aggregates/credit_decision/provides/decision_made",
	);
	const decisioningBC = creditRisk.context(
		"#/boundedcontexts/credit_decisioning",
	);
	const customerPlatform = foreign<CustomerPlatformSurface>(
		set,
		"customer_platform.json",
	);
	const customer = customerPlatform.entity(
		"#/boundedcontexts/customer_&_kyc/aggregates/customer/entities/customer",
	);
	const getCustomer = customerPlatform.consumable(
		"#/boundedcontexts/customer_&_kyc/services/onboarding_app/provides/get_customer",
	);
	const customerBC = customerPlatform.context(
		"#/boundedcontexts/customer_&_kyc",
	);

	applicationCustomerIdAttr.identifies = customer;
	applicationRequestedAttr.valueobject = applicationMoney;
	loanAccountIdAttr.identifies = account;
	loanPrincipalAttr.valueobject = loanMoney;
	installmentAmountAttr.valueobject = loanMoney;
	applicationSubmittedSchemaCustomerIdAttr.identifies = customer;
	applicationSubmittedSchemaRequestedAttr.valueobject = applicationMoney;
	loanEventSchemaAccountIdAttr.identifies = account;
	loanEventSchemaAmountAttr.valueobject = loanMoney;

	lendingApp.consumes(postEntry, {
		pattern: "anti-corruption-layer",
		by: [postDisbursement],
	});

	lendingApp.consumes(getCustomer, {
		pattern: "anti-corruption-layer",
		by: [submitApplication],
	});

	// Partnership: one planning board, so Lending conforms rather than translates.
	// RequestDecision is the one operation of LendingApp that makes the call.
	lendingApp.consumes(decide, {
		pattern: "conformist",
		by: [requestDecision],
	});
	lendingApp.consumes(decisionMade, { pattern: "conformist" });

	recordDecisionPolicy.on(decisionMade);

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: customerBC,
		downstream: lendingBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
	});

	ws.addRelationship({
		type: "customer-supplier",
		upstream: ledgerBC,
		downstream: lendingBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
	});

	// Partnership: one planning board, joint releases, no translation.
	lendingBC.partnerOf(decisioningBC, {
		description:
			"Origination and decisioning release together; a scorecard change is an application-form change",
	});
}
