import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as CustomerPlatformSurface } from "./customer_platform.ts";
import { foreign } from "./foreign.ts";
import type { Published as LendingSurface } from "./lending.ts";

/** This team's file in the NorthBank set. */
export const FILE = "credit_risk.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Credit Risk",
	attributes: {
		id: "northbank_credit_risk",
		description:
			"NorthBank's Credit Risk Team: credit decisioning, the scorecard, affordability and the bureau it pulls reports from.",
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
		"#/boundedcontexts/credit_decisioning/aggregates/credit_decision/provides/decision_made",
		"#/boundedcontexts/credit_decisioning/services/decisioning_app/provides/decide",
	],
	contexts: ["#/boundedcontexts/credit_decisioning"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const creditRiskTeam = ws.addTeam("Credit Risk Team", {
		description: "Decisioning, scorecards, affordability",
	});

	const decisioningBC = ws.addBoundedContext("Credit Decisioning", {
		description: "Bureau data, the scorecard and affordability",
		team: creditRiskTeam,
	});

	// DISCOVERY: Head of Credit Risk. "We take the application and the customer
	// record, pull a bureau report no older than thirty days, run the scorecard,
	// and check affordability." Those words never say who pulls the report, and
	// until card 119 the model had a `BureauReport` value object and a freshness
	// invariant with no bureau anywhere: a fact appearing from nowhere, which
	// decision 28 refuses. The bureau is a system the bank buys a file from, not
	// one it runs, so it is declared here and Decide pulls from it at the
	// boundary (card 119).
	const creditBureauBC = ws.addBoundedContext("Credit Bureau", {
		description:
			"The credit reference agency: it holds the credit file and answers a pull with a report at a point in time. Not the bank's",
		external: true,
	});

	// CREDIT DECISIONING
	// DISCOVERY: Head of Credit Risk. Bureau report no older than thirty days;
	// affordability at most forty-five percent; every decision carries reasons.
	const creditDecisionAgg = decisioningBC.addAggregate("CreditDecision", {
		description:
			"One decision and the evidence behind it, kept so it can be explained",
	});
	const creditDecision = creditDecisionAgg.addRootEntity("CreditDecision", {
		description: "The outcome for one application",
	});
	const bureauVO = decisioningBC.addValueObject("BureauReport", {
		description: "The external credit file at a moment in time",
	});
	bureauVO.addAttribute("bureau", { type: "string" });
	bureauVO.addAttribute("score", { type: "int" });
	bureauVO.addAttribute("pulledAt", { type: "date-time" });
	const affordabilityVO = decisioningBC.addValueObject("Affordability", {
		description: "Monthly income, commitments and their ratio",
	});
	affordabilityVO.addAttribute("monthlyIncomeMinor", { type: "int64" });
	affordabilityVO.addAttribute("monthlyCommitmentsMinor", { type: "int64" });
	affordabilityVO.addAttribute("ratio", { type: "decimal" });
	const creditScoreVO = decisioningBC.addValueObject("CreditScore", {
		description: "The scorecard's output with the reason codes",
	});
	creditScoreVO.addAttribute("value", { type: "int" });
	creditScoreVO.addAttribute("reasonCodes", { type: "string[]" });
	creditDecision.addAttribute("decisionId", { type: "string", identity: true });
	// The application it decides on lives in Lending, another bounded context: a
	// relation never crosses one, so this is the only thing that crosses.
	const creditDecisionApplicationIdAttr = creditDecision.addAttribute(
		"applicationId",
		{
			type: "string",
		},
	);
	creditDecision.addAttribute("outcome", { type: "'approved' | 'declined'" });
	creditDecision.addAttribute("bureauReport", {
		type: "BureauReport",
		valueobject: bureauVO,
	});
	creditDecision.addAttribute("affordability", {
		type: "Affordability",
		valueobject: affordabilityVO,
	});
	creditDecision.addAttribute("score", {
		type: "CreditScore",
		valueobject: creditScoreVO,
	});
	creditDecision.uses(bureauVO, "based-on", "1");
	creditDecision.uses(affordabilityVO, "assessed", "1");
	creditDecision.uses(creditScoreVO, "scored", "1");

	creditDecisionAgg
		.addInvariant("AffordabilityRatioCap", {
			description:
				"Commitments over income at most forty-five percent for an approval",
		})
		.constrains(affordabilityVO);
	creditDecisionAgg
		.addInvariant("DecisionExplained", {
			description:
				"Every decision carries reason codes; the customer is entitled to them",
		})
		.constrains(creditScoreVO);
	creditDecisionAgg
		.addInvariant("BureauReportFresh", {
			description: "The bureau report is no older than thirty days",
		})
		.constrains(bureauVO);

	const decisionRequestSchema = decisioningBC.addSchema("DecisionRequest");
	const decisionRequestSchemaApplicationIdAttr =
		decisionRequestSchema.addAttribute("applicationId", {
			type: "string",
			identity: true,
		});
	const decisionRequestSchemaCustomerIdAttr =
		decisionRequestSchema.addAttribute("customerId", {
			type: "string",
		});
	decisionRequestSchema.addAttribute("requestedMinor", { type: "int64" });
	decisionRequestSchema.addAttribute("termMonths", { type: "int" });
	const decisionMadeSchema = decisioningBC.addSchema("DecisionMade");
	const decisionMadeSchemaApplicationIdAttr = decisionMadeSchema.addAttribute(
		"applicationId",
		{
			type: "string",
			identity: true,
		},
	);
	decisionMadeSchema.addAttribute("outcome", {
		type: "'approved' | 'declined'",
	});
	decisionMadeSchema.addAttribute("score", {
		type: "CreditScore",
		valueobject: creditScoreVO,
	});

	const decisionMade = creditDecisionAgg.provides("DecisionMade", {
		description: "Yes or no, with reasons",
		type: "event",
		pattern: "published-language",
		schema: decisionMadeSchema,
	});
	// DISCOVERY: Head of Credit Risk, "pull a bureau report no older than thirty
	// days" -- the words say the report is pulled, not who pulls it. The bureau
	// is bought, not run, so it is declared where the vendor and the scheme are:
	// an external context, providing the one thing it publishes, a pull that
	// answers with its own report shape (decision 28; card 119). The
	// `BureauReport` value object above is unchanged -- it is what the decision
	// keeps once pulled -- and this is the wire the bureau hands back.
	const bureauReportSchema = creditBureauBC.addSchema("BureauReport", {
		description:
			"The bureau's own report format for one customer, at the moment it is pulled",
	});
	bureauReportSchema.addAttribute("bureau", { type: "string" });
	bureauReportSchema.addAttribute("score", { type: "int" });
	bureauReportSchema.addAttribute("pulledAt", { type: "date-time" });
	const bureauPullRequestSchema = creditBureauBC.addSchema(
		"BureauPullRequest",
		{
			description: "Who to pull the file for",
		},
	);
	const bureauPullRequestSchemaCustomerIdAttr =
		bureauPullRequestSchema.addAttribute("customerId", {
			type: "string",
		});
	const bureauApi = creditBureauBC.addService("Bureau API", {
		description: "The bureau's documented interface, and all the bank can see",
		type: "application",
	});
	const pullBureauReport = bureauApi.provides("PullBureauReport", {
		description: "Pull a fresh credit file for a customer",
		type: "operation",
		pattern: "open-host-service",
		schema: bureauPullRequestSchema,
		returns: bureauReportSchema,
	});
	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	const decisioningApp = decisioningBC.addService("DecisioningApp", {
		description:
			"Credit Decisioning's application service: the boundary Lending and the channels ask for a decision through",
		type: "application",
	});
	const decide = decisioningApp
		.provides("Decide", {
			description:
				"Pull the bureau report and hand it to the scorecard, run it, then check affordability",
			type: "operation",
			pattern: "open-host-service",
			schema: decisionRequestSchema,
		})
		.raises(decisionMade);

	const scorecard = decisioningBC.addService("Scorecard", {
		description:
			"The bank's own model; a domain service because it is tuned across the whole book",
		type: "domain",
	});
	const scoreApplication = scorecard.provides("ScoreApplication", {
		description: "Run the scorecard over an application and its bureau report",
		type: "operation",
		internal: true,
	});

	decisioningBC.addTerm("Scorecard", {
		definition: "The bank's own credit model",
		embodiedBy: scorecard,
	});
	decisioningBC.addTerm("Decline reason", {
		definition: "A code the customer is entitled to see when refused",
		embodiedBy: creditScoreVO,
	});
	return {
		decisioningBC,
		creditDecisionApplicationIdAttr,
		decisionRequestSchemaApplicationIdAttr,
		decisionRequestSchemaCustomerIdAttr,
		decisionMadeSchemaApplicationIdAttr,
		bureauPullRequestSchemaCustomerIdAttr,
		decisioningApp,
		pullBureauReport,
		decide,
		creditBureauBC,
		scoreApplication,
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
		decisioningBC,
		creditDecisionApplicationIdAttr,
		decisionRequestSchemaApplicationIdAttr,
		decisionRequestSchemaCustomerIdAttr,
		decisionMadeSchemaApplicationIdAttr,
		bureauPullRequestSchemaCustomerIdAttr,
		decisioningApp,
		pullBureauReport,
		decide,
		creditBureauBC,
		scoreApplication,
	} = own;
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
	const lending = foreign<LendingSurface>(set, "lending.json");
	const decisioningSD = lending.subdomain(
		"#/domains/credit/subdomains/credit_decisioning",
	);
	const application = lending.entity(
		"#/boundedcontexts/lending/aggregates/loan_application/entities/loan_application",
	);

	decisioningBC.serves(decisioningSD);
	creditDecisionApplicationIdAttr.identifies = application;
	decisionRequestSchemaApplicationIdAttr.identifies = application;
	decisionRequestSchemaCustomerIdAttr.identifies = customer;
	decisionMadeSchemaApplicationIdAttr.identifies = application;
	bureauPullRequestSchemaCustomerIdAttr.identifies = customer;

	decisioningApp.consumes(pullBureauReport, {
		pattern: "anti-corruption-layer",
		by: [decide],
	});
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: creditBureauBC,
		downstream: decisioningBC,
		description:
			"The bureau's pull is the bureau's; Credit Decisioning takes the report at the edge and keeps its own BureauReport once pulled",
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
	});

	// `Decide` runs the scorecard once it holds the bureau report: the interview's
	// "pull a bureau report, run the scorecard, and check affordability". The
	// front makes the call (decision 17: a domain service holds no outbound port
	// and is called by its own context's front). No contract is invented: the
	// source says the scorecard is run, not what it hands back, so the call
	// carries no schema and no `returns` (card 158).
	decisioningApp.consumes(scoreApplication, { by: [decide] });
	decisioningApp.consumes(getCustomer, {
		pattern: "anti-corruption-layer",
		by: [decide],
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: customerBC,
		downstream: decisioningBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
	});
}
