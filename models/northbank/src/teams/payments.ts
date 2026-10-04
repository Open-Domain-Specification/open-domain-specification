import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as AccountsSurface } from "./accounts.ts";
import type { Published as CoreBankingSurface } from "./core_banking.ts";
import type { Published as FinancialCrimeSurface } from "./financial_crime.ts";
import { foreign } from "./foreign.ts";
import type { Published as SchemeConnectivitySurface } from "./scheme_connectivity.ts";

/** This team's file in the NorthBank set. */
export const FILE = "payments.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Payments",
	attributes: {
		id: "northbank_payments",
		description:
			"NorthBank's Payments Team: the payments hub, the ISO 13616 standard it conforms to, and the Money Movement domain.",
		version: "1.0.0",
		primaryColor: "#1d4ed8",
	},
} as const;

/**
 * What other teams may name in this file. A team's `link` reaches into another
 * team's workspace only through these refs, type-checked against this list.
 */
export const published = {
	contexts: ["#/boundedcontexts/iso_13616"],
	entities: [
		"#/boundedcontexts/payments_hub/aggregates/payment_instruction/entities/payment_instruction",
	],
	subdomains: ["#/domains/money_movement/subdomains/scheme_connectivity"],
	valueobjects: ["#/boundedcontexts/iso_13616/valueobjects/iban"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const moneyMovement = ws.addDomain("Money Movement", {
		description: "Instructions in, settlements out",
	});
	const paymentsSD = moneyMovement.addSubdomain("Payments", {
		type: "supporting",
		description: "The hub between customers and the schemes",
	});
	moneyMovement.addSubdomain("Scheme Connectivity", {
		type: "generic",
		description: "Gateways in the schemes' formats",
	});

	const paymentsTeam = ws.addTeam("Payments Team", {
		description: "The payments hub",
	});

	const paymentsBC = paymentsSD.addBoundedcontext("Payments Hub", {
		description: "Instructions scored, submitted, settled and posted",
		team: paymentsTeam,
	});

	// A standards body is an external context too, and the honest place for a
	// value nobody here owns. The IBAN was Accounts', and Payments wrote its own
	// `string (ISO 13616)` beside it: one definition of the account number every
	// bank in Europe uses, held twice, in two contexts, either of which could have
	// drifted. It is not the bank's to change and not Accounts' to lend — it is
	// the standard's, and both contexts conform to it (decision 28, third
	// amendment; card 100). The body provides nothing to consume: what it
	// publishes is the shape, which is what a conformist borrows.
	const isoBC = ws.addBoundedContext("ISO 13616", {
		description:
			"The international bank account number standard. Published, not run by anyone here; the bank conforms to it wherever it names an account outside its own walls",
		external: true,
	});
	const ibanVO = isoBC.addValueObject("IBAN", {
		description:
			"Country, check digits, bank and account identifiers; valid only if the mod-97 checksum holds",
	});
	const ibanValue = ibanVO.addAttribute("value", {
		type: "string (ISO 13616)",
	});
	// A value's own rule, and one this model may state about a system it does not
	// own, because the standard publishes it: an IBAN whose mod-97 checksum fails
	// is not a badly configured IBAN, it is not an IBAN, so the rule holds by
	// construction and needs no aggregate to save it (decision 27's 2026-09-08
	// amendment; decision 28's third).
	ibanVO
		.addInvariant("IbanChecksumValid", {
			description:
				"The IBAN's mod-97 checksum holds, or the value is not an IBAN at all",
		})
		.constrains(ibanValue);

	// PAYMENTS HUB
	// DISCOVERY: Payments Hub lead. Payer is not payee; positive; daily limit;
	// cut-off; flagged is never submitted; the scheme's format exactly.
	const instructionAgg = paymentsBC.addAggregate("PaymentInstruction", {
		description:
			"A customer telling the bank to pay a payee an amount on a date",
	});
	const instruction = instructionAgg.addRootEntity("PaymentInstruction", {
		description: "One instruction, from initiation to settlement or rejection",
	});
	const payeeVO = paymentsBC.addValueObject("Payee", {
		description:
			"Name and IBAN of who gets paid; a value because the same details are the same payee",
	});
	payeeVO.addAttribute("name", { type: "string" });
	// The same IBAN Accounts holds, and the same one every other bank holds: the
	// standard's, borrowed by reference rather than spelled out again in this
	// context's own words (decision 28, third amendment).
	payeeVO.addAttribute("iban", { type: "IBAN", valueobject: ibanVO });

	const executionDateVO = paymentsBC.addValueObject("ExecutionDate", {
		description: "When to send it; today means before the scheme cut-off",
	});
	executionDateVO.addAttribute("value", { type: "date" });
	const paymentStatusVO = paymentsBC.addValueObject("PaymentStatus", {
		description: "initiated, cleared, flagged, submitted, settled, rejected",
	});
	paymentStatusVO.addAttribute("value", {
		type: "'initiated' | 'cleared' | 'flagged' | 'submitted' | 'settled' | 'rejected'",
	});
	instruction.addAttribute("instructionId", { type: "string", identity: true });
	const instructionPayerAccountIdAttr = instruction.addAttribute(
		"payerAccountId",
		{
			type: "string",
		},
	);
	const paymentAmount = instruction.addAttribute("amount", {
		type: "Money",
	});
	instruction.addAttribute("status", {
		type: "PaymentStatus",
		valueobject: paymentStatusVO,
	});
	instruction.addAttribute("payee", { type: "Payee", valueobject: payeeVO });
	instruction.addAttribute("executionDate", {
		type: "ExecutionDate",
		valueobject: executionDateVO,
	});
	instruction.uses(payeeVO, "to", "1");
	instruction.uses(executionDateVO, "on", "1");
	instruction.uses(paymentStatusVO, "has-status", "1");
	// Account lives in Accounts: `payerAccountId` above is the only thing that
	// crosses the boundary. Money is borrowed from Ledger, so it is typed by
	// `valueobject` reference only, with no `uses` relation to cross with it.
	instructionAgg
		.addInvariant("PayerNotPayee", {
			description: "The payer and payee accounts differ",
		})
		.constrains(payeeVO);
	instructionAgg
		.addInvariant("AmountPositive", {
			description: "The amount is greater than zero",
		})
		.constrains(paymentAmount);
	// DISCOVERY: Payments Hub lead. "The account has to cover it." A precondition
	// is checked at the moment of the call, and the call is InitiatePayment on
	// PaymentsApp, so the invariant names it further down where that operation
	// exists (decision 19, amended).
	instructionAgg
		.addInvariant("CutOffRespected", {
			description:
				"A same-day instruction is initiated before the scheme cut-off",
		})
		.constrains(executionDateVO);
	instructionAgg
		.addInvariant("FlaggedNeverSubmitted", {
			description:
				"A flagged instruction is rejected; it never reaches a scheme",
		})
		.constrains(paymentStatusVO);

	const initiatePaymentSchema = paymentsBC.addSchema("InitiatePayment");
	const initiatePaymentSchemaPayerAccountIdAttr =
		initiatePaymentSchema.addAttribute("payerAccountId", {
			type: "string",
		});
	initiatePaymentSchema.addAttribute("payee", {
		type: "Payee",
		valueobject: payeeVO,
	});
	const initiatePaymentSchemaAmountAttr = initiatePaymentSchema.addAttribute(
		"amount",
		{
			type: "Money",
		},
	);
	initiatePaymentSchema.addAttribute("executionDate", {
		type: "ExecutionDate",
		valueobject: executionDateVO,
	});
	// A rejection shape: what InitiatePayment answers with when it will not create
	// the instruction. No payment exists, so there is no payment event to raise;
	// the channel is told which rule stopped it (decision 25).
	const instructionRefusedSchema = paymentsBC.addSchema("InstructionRefused", {
		description:
			"Why an instruction was not created: over the daily limit, not covered, or past the cut-off",
	});
	instructionRefusedSchema.addAttribute("reason", { type: "string" });
	const instructionRefusedSchemaPayerAccountIdAttr =
		instructionRefusedSchema.addAttribute("payerAccountId", {
			type: "string",
		});
	const instructionRefusedSchemaRemainingTodayAttr =
		instructionRefusedSchema.addAttribute("remainingToday", {
			type: "Money",
			optional: true,
		});
	const paymentEventSchema = paymentsBC.addSchema("PaymentEvent", {
		description:
			"Instruction id, amount and payee; shared by the payment events",
	});
	paymentEventSchema.addAttribute("instructionId", {
		type: "string",
		identity: true,
	});
	const paymentEventSchemaPayerAccountIdAttr = paymentEventSchema.addAttribute(
		"payerAccountId",
		{
			type: "string",
		},
	);
	const paymentEventSchemaAmountAttr = paymentEventSchema.addAttribute(
		"amount",
		{
			type: "Money",
		},
	);
	paymentEventSchema.addAttribute("payee", {
		type: "Payee",
		valueobject: payeeVO,
	});

	const paymentInitiated = instructionAgg.provides("PaymentInitiated", {
		description: "A customer asked to pay; fraud scores it next",
		type: "event",
		pattern: "published-language",
		schema: paymentEventSchema,
	});
	const paymentSubmitted = instructionAgg.provides("PaymentSubmitted", {
		description: "Cleared and ready for the scheme",
		type: "event",
		internal: true,
	});
	const paymentSettled = instructionAgg.provides("PaymentSettled", {
		description: "The scheme confirmed; the ledger posts",
		type: "event",
		pattern: "published-language",
		schema: paymentEventSchema,
	});
	const paymentRejected = instructionAgg.provides("PaymentRejected", {
		description: "Flagged or refused by the scheme",
		type: "event",
		pattern: "published-language",
		schema: paymentEventSchema,
	});
	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	const paymentsApp = paymentsBC.addService("PaymentsApp", {
		description:
			"The hub's application service: the boundary channels initiate payments through, and the one that calls the scheme, the ledger and fraud",
		type: "application",
	});
	const initiatePayment = paymentsApp
		.provides("InitiatePayment", {
			description:
				"Create an instruction from a channel, once AccountServicing confirms the available balance covers it and the daily limit holds",
			type: "operation",
			pattern: "open-host-service",
			schema: initiatePaymentSchema,
			rejects: [instructionRefusedSchema],
		})
		.raises(paymentInitiated);
	// A rule across instructions, not inside one: the context holds it and
	// InitiatePayment checks it, summing the day's instructions for the payer
	// account, since no single instruction can know the others (decision 27).
	// A check and nothing else. Card 94 wrote it as still true after
	// InitiatePayment, on the argument that everything it counts is this context's
	// own to read, and that is exactly what a count across instances cannot
	// promise: two instructions in the same second both pass the sum and the day's
	// total is over. What the model says is where the check is made
	// (`context-invariant-is-checked`, decision 27's second amendment of
	// 2026-09-09).
	paymentsBC
		.addInvariant("DailyLimit", {
			description:
				"InitiatePayment refuses an instruction that would take the payer account over its daily limit, summing the day's instructions for that account before it acts. Checked, not held: no single instruction can see the others, so two arriving together can both pass the sum",
		})
		.constrains(paymentAmount, initiatePayment);
	// DISCOVERY: Payments Hub lead. "The account has to cover it." A rule about one
	// instruction, so it is the aggregate's; checked before the instruction exists,
	// so what upholds it is InitiatePayment, the application service operation the
	// channel calls (decision 19, amended). The guard was in prose until card 90.
	instructionAgg
		.addInvariant("FundsAvailableAtInitiation", {
			description:
				"An instruction is created only if the payer's available balance, read through AccountServicing, covers the amount; the overdraft itself is Accounts' rule at posting",
			// The balance is Accounts' to move, so the cover holds at initiation and
			// nothing here re-establishes it afterwards (card 94).
			precondition: true,
		})
		.constrains(paymentAmount, initiatePayment);

	const submitPayment = instructionAgg
		.provides("SubmitPayment", {
			description: "Mark cleared and hand to the gateway",
			type: "operation",
			internal: true,
		})
		.raises(paymentSubmitted);
	const confirmSettlement = instructionAgg
		.provides("ConfirmSettlement", {
			description: "Record the scheme's confirmation",
			type: "operation",
			internal: true,
		})
		.raises(paymentSettled);
	const rejectPayment = instructionAgg
		.provides("RejectPayment", {
			description: "Reject a flagged or scheme-refused instruction",
			type: "operation",
			internal: true,
		})
		.raises(paymentRejected);

	paymentsBC.addTerm("Instruction", {
		definition:
			"A customer's request to pay. Cards say payment and mean a card transaction; branches say transfer",
		aliases: ["Payment", "Transfer"],
		embodiedBy: instructionAgg,
	});
	paymentsBC.addTerm("Payee", {
		definition: "Who gets paid: a name and an IBAN",
		aliases: ["Beneficiary"],
		embodiedBy: payeeVO,
	});
	// The hub's own word for the customer: the same record Customer & KYC verifies.
	paymentsBC.addTerm("Party", {
		definition:
			"Either side of an instruction, payer or payee. The payer is a Customer & KYC customer; the payee may be anyone with an IBAN",
		embodiedBy: instruction,
	});
	paymentsBC.addTerm("Settlement", {
		definition: "The scheme's confirmation that the money moved",
		embodiedBy: paymentSettled,
	});

	// A policy names operations of its own context, so each step that reaches
	// another context is an operation of the hub's own app service (decision 17).
	const sendToScheme = paymentsApp.provides("SendToScheme", {
		description:
			"Hand a submitted instruction to the gateway, by calling SubmitToScheme",
		type: "operation",
		internal: true,
	});
	const postSettlement = paymentsApp.provides("PostSettlement", {
		description:
			"Post the settled instruction to the ledger, through the ACL over PostEntry",
		type: "operation",
		internal: true,
	});

	// The hub lead described one instruction going from initiated to settled, and
	// the model used to spell it as seven policies. It is one process: it holds
	// the instruction while the scorer and then the scheme answer, and each step
	// it takes is an operation of the hub's own boundary (decisions 17 and 23).
	// What it waits for from Fraud is joined further down, where that answer is
	// declared.
	const instructionLifecycle = paymentsBC
		.addProcess("Instruction lifecycle", {
			description:
				"From an instruction being initiated to the money having moved. It scores every instruction with Fraud and waits for the verdict to come back: above the threshold it rejects the instruction and never submits it, below it submits to the scheme through the gateway, in the scheme's own format, and the process then waits again, this time for the gateway to republish the scheme's own confirmation or rejection as its own settlement or refusal fact, once the scheme has answered on its own timings. A settlement settles the instruction and posts it to the ledger; a refusal rejects it. Correlation is by instructionId, which the scorer's verdict and the gateway's republished fact both carry; an instruction the scheme never answers stays open for the operations team, because the scheme's own timings are not the bank's to model",
		})
		.starts(paymentInitiated)
		.issues(sendToScheme, confirmSettlement, rejectPayment, postSettlement)
		.ends(paymentSettled, paymentRejected);

	// Payments waits on the scorer: it calls and holds the instruction until the
	// verdict comes back, and what it does then — reject on a flag, submit on a
	// clearance — is the process's own business (decisions 15 and 23).
	const scoreInstruction = paymentsApp.provides("ScoreInstruction", {
		description:
			"Send an initiated instruction to Fraud for a verdict, through the ACL",
		type: "operation",
		internal: true,
	});

	// The first half of the instruction lifecycle above: scoring, and what the
	// verdict does. It is written here because Fraud's shapes are declared in this
	// section. The process waits on the answer to the call it made, named by that
	// call, which is what "synchronous scoring" means and what it could not say
	// before card 92.
	const gen = instructionLifecycle.issues(scoreInstruction, submitPayment);
	return {
		instructionPayerAccountIdAttr,
		paymentAmount,
		initiatePaymentSchemaPayerAccountIdAttr,
		initiatePaymentSchemaAmountAttr,
		instructionRefusedSchemaPayerAccountIdAttr,
		instructionRefusedSchemaRemainingTodayAttr,
		paymentEventSchemaPayerAccountIdAttr,
		paymentEventSchemaAmountAttr,
		instructionLifecycle,
		gen,
		paymentsApp,
		initiatePayment,
		sendToScheme,
		postSettlement,
		scoreInstruction,
		paymentsBC,
		isoBC,
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
		instructionPayerAccountIdAttr,
		paymentAmount,
		initiatePaymentSchemaPayerAccountIdAttr,
		initiatePaymentSchemaAmountAttr,
		instructionRefusedSchemaPayerAccountIdAttr,
		instructionRefusedSchemaRemainingTodayAttr,
		paymentEventSchemaPayerAccountIdAttr,
		paymentEventSchemaAmountAttr,
		instructionLifecycle,
		gen,
		paymentsApp,
		initiatePayment,
		sendToScheme,
		postSettlement,
		scoreInstruction,
		paymentsBC,
		isoBC,
	} = own;
	const accounts = foreign<AccountsSurface>(set, "accounts.json");
	const account = accounts.entity(
		"#/boundedcontexts/accounts/aggregates/account/entities/account",
	);
	const getAvailableBalance = accounts.consumable(
		"#/boundedcontexts/accounts/services/account_servicing/provides/get_available_balance",
	);
	const accountsBC = accounts.context("#/boundedcontexts/accounts");
	const coreBanking = foreign<CoreBankingSurface>(set, "core_banking.json");
	const paymentMoney = coreBanking.valueobject(
		"#/boundedcontexts/ledger/valueobjects/money",
	);
	const postEntry = coreBanking.consumable(
		"#/boundedcontexts/ledger/services/ledger_app/provides/post_entry",
	);
	const ledgerBC = coreBanking.context("#/boundedcontexts/ledger");
	const financialCrime = foreign<FinancialCrimeSurface>(
		set,
		"financial_crime.json",
	);
	const scoreTransaction = financialCrime.consumable(
		"#/boundedcontexts/fraud/services/fraud_app/provides/score_transaction",
	);
	const fraudBC = financialCrime.context("#/boundedcontexts/fraud");
	const schemeConnectivity = foreign<SchemeConnectivitySurface>(
		set,
		"scheme_connectivity.json",
	);
	const submitToScheme = schemeConnectivity.consumable(
		"#/boundedcontexts/scheme_gateway/services/scheme_gateway_app/provides/submit_to_scheme",
	);
	const schemeAccepted = schemeConnectivity.consumable(
		"#/boundedcontexts/scheme_gateway/aggregates/scheme_message/provides/scheme_accepted",
	);
	const schemeDeclined = schemeConnectivity.consumable(
		"#/boundedcontexts/scheme_gateway/aggregates/scheme_message/provides/scheme_declined",
	);
	const schemeBC = schemeConnectivity.context(
		"#/boundedcontexts/scheme_gateway",
	);

	instructionPayerAccountIdAttr.identifies = account;
	paymentAmount.valueobject = paymentMoney;
	initiatePaymentSchemaPayerAccountIdAttr.identifies = account;
	initiatePaymentSchemaAmountAttr.valueobject = paymentMoney;
	instructionRefusedSchemaPayerAccountIdAttr.identifies = account;
	instructionRefusedSchemaRemainingTodayAttr.valueobject = paymentMoney;
	paymentEventSchemaPayerAccountIdAttr.identifies = account;
	paymentEventSchemaAmountAttr.valueobject = paymentMoney;

	// The funds check is a read of Accounts' documented API, translated: the hub
	// keeps its own notion of "covered" rather than Accounts' balance model.
	paymentsApp.consumes(getAvailableBalance, {
		pattern: "anti-corruption-layer",
		by: [initiatePayment],
	});

	// PaymentsApp offers four operations and only one of them makes each of these
	// calls, so the chain from an initiated instruction to the scheme's answer and
	// on to the ledger runs through `by` rather than stopping at the boundary
	// (decision 21, third amendment).
	paymentsApp.consumes(submitToScheme, {
		pattern: "conformist",
		by: [sendToScheme],
	});
	paymentsApp.consumes(postEntry, {
		pattern: "anti-corruption-layer",
		by: [postSettlement],
	});

	instructionLifecycle.on(schemeAccepted, schemeDeclined);
	// The scheme answers "on its own timings", so the process that made the call
	// waits on a fact, not on an answer SubmitToScheme does not have (decision
	// 13, note of 2026-09-10; decision 23's fourth amendment: the process issued
	// the call, through SendToScheme, so it is the one entitled to wait on what
	// comes back). That fact is the gateway's own, republished by its
	// anti-corruption layer above -- "we submit to the scheme through the
	// gateway" is what the hub lead said, and the hub now hears the gateway
	// rather than reaching past it to the scheme's own wire format.
	paymentsApp.consumes(schemeAccepted, {
		pattern: "conformist",
		by: [instructionLifecycle],
	});
	paymentsApp.consumes(schemeDeclined, {
		pattern: "conformist",
		by: [instructionLifecycle],
	});

	paymentsApp.consumes(scoreTransaction, {
		pattern: "anti-corruption-layer",
		by: [scoreInstruction],
	});

	gen.on(scoreTransaction.returned());

	ws.addRelationship({
		type: "customer-supplier",
		upstream: ledgerBC,
		downstream: paymentsBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
		description:
			"Payments posts through the ledger API and is consulted on changes",
	});

	ws.addRelationship({
		type: "customer-supplier",
		upstream: fraudBC,
		downstream: paymentsBC,
		upstreamRoles: ["open-host-service", "published-language"],
		downstreamRoles: ["anti-corruption-layer"],
		description:
			"Payments waits on the scorer and is consulted on its contract",
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: schemeBC,
		downstream: paymentsBC,
		upstreamRoles: ["open-host-service", "published-language"],
		downstreamRoles: ["conformist"],
		description: "You don't negotiate with a scheme",
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: accountsBC,
		downstream: paymentsBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
		description: "The funds check before an instruction exists",
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: isoBC,
		downstream: paymentsBC,
		description:
			"A payee is named by an IBAN, in the standard's form; the hub validates it before an instruction exists",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
	});
}
