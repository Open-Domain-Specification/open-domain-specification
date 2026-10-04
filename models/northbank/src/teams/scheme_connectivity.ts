import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import { foreign } from "./foreign.ts";
import type { Published as PaymentsSurface } from "./payments.ts";

/** This team's file in the NorthBank set. */
export const FILE = "scheme_connectivity.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Scheme Connectivity",
	attributes: {
		id: "northbank_scheme_connectivity",
		description:
			"NorthBank's Scheme Connectivity Team: gateways to the payment schemes, and the scheme they submit to.",
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
		"#/boundedcontexts/scheme_gateway/aggregates/scheme_message/provides/scheme_accepted",
		"#/boundedcontexts/scheme_gateway/aggregates/scheme_message/provides/scheme_declined",
		"#/boundedcontexts/scheme_gateway/services/scheme_gateway_app/provides/submit_to_scheme",
	],
	contexts: ["#/boundedcontexts/scheme_gateway"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const schemeTeam = ws.addTeam("Scheme Connectivity Team", {
		description: "Gateways to the schemes",
	});

	const schemeBC = ws.addBoundedContext("Scheme Gateway", {
		description: "ISO 20022 messages to and from the schemes",
		team: schemeTeam,
	});

	// DISCOVERY: Scheme Connectivity lead. "We turn a submission into a scheme
	// message and send it. The scheme confirms or rejects." The confirmation is
	// the scheme's fact, not the gateway's, and until card 95 the model credited
	// SubmitToScheme with raising both of them and never declared the scheme at
	// all -- the one system in the whole payment path nobody had written down.
	const paymentSchemeBC = ws.addBoundedContext("Payment Scheme", {
		description:
			"The clearing scheme the bank submits to: it settles or refuses, in ISO 20022 and on its own timings. Not the bank's",
		external: true,
	});

	// SCHEME GATEWAY
	// DISCOVERY: Scheme Connectivity lead. ISO 20022; the hub takes the format as it is.
	const schemeMessageAgg = schemeBC.addAggregate("SchemeMessage", {
		description: "One message to or from a scheme",
	});
	const schemeMessage = schemeMessageAgg.addRootEntity("SchemeMessage", {
		description: "A submission or a response",
	});
	const schemeFormatVO = schemeBC.addValueObject("SchemeFormat", {
		description: "The ISO 20022 message type",
	});
	schemeFormatVO.addAttribute("messageType", {
		type: "'pacs.008' | 'pacs.002' | 'pain.001'",
	});
	schemeMessage.addAttribute("messageId", { type: "string", identity: true });
	schemeMessage.addAttribute("schemeRef", { type: "string" });
	schemeMessage.addAttribute("direction", { type: "'outbound' | 'inbound'" });
	schemeMessage.addAttribute("format", {
		type: "SchemeFormat",
		valueobject: schemeFormatVO,
	});
	schemeMessage.uses(schemeFormatVO, "formatted-as", "1");

	const submissionSchema = schemeBC.addSchema("SchemeSubmission", {
		description: "The scheme's format, not the bank's",
	});
	const submissionSchemaInstructionIdAttr = submissionSchema.addAttribute(
		"instructionId",
		{
			type: "string",
			identity: true,
		},
	);
	submissionSchema.addAttribute("messageType", {
		type: "SchemeFormat",
		valueobject: schemeFormatVO,
	});
	// The scheme's own answers, published by the scheme. They carry the scheme's
	// shape, as CardCo's authorisation message carries CardCo's: what arrives is a
	// pacs.002 with the reference the gateway sent in it, and the gateway is what
	// takes it in (decision 28).
	const schemeResponseSchema = paymentSchemeBC.addSchema("SchemeResponse", {
		description: "The scheme's status report, as it arrives on the wire",
	});
	schemeResponseSchema.addAttribute("originalInstructionId", {
		type: "string",
	});
	schemeResponseSchema.addAttribute("schemeRef", { type: "string" });
	schemeResponseSchema.addAttribute("statusReason", {
		type: "string",
		optional: true,
	});
	const schemeRail = paymentSchemeBC.addService("Scheme Rail", {
		description: "The scheme's inbound leg, and all the bank can see of it",
		type: "application",
	});
	const schemeSettlementConfirmed = schemeRail.provides(
		"SchemeSettlementConfirmed",
		{
			description: "The scheme settled the payment",
			type: "event",
			pattern: "published-language",
			schema: schemeResponseSchema,
		},
	);
	const schemeRejected = schemeRail.provides("SchemeRejected", {
		description: "The scheme refused the message",
		type: "event",
		pattern: "published-language",
		schema: schemeResponseSchema,
	});
	// The scheme's own inbound wire format, distinct from the gateway's own
	// SchemeSubmission above: two contexts, two shapes, translated at the
	// boundary, which is what the anti-corruption layer is for. RiverMart's
	// ProviderRequest is the acquirer's own shape the same way (decision 28;
	// card 107).
	const schemeSubmissionSchema = paymentSchemeBC.addSchema(
		"SubmissionMessage",
		{
			description:
				"The scheme's own wire format for an inbound submission, as it receives it",
		},
	);
	schemeSubmissionSchema.addAttribute("instructionId", { type: "string" });
	schemeSubmissionSchema.addAttribute("messageType", { type: "string" });
	// The scheme's own documented contract, published beside the answers it
	// raises: RiverMart's acquirer publishes HoldFunds, TakeFunds and
	// ReturnFunds the same way, an external context stating what it offers and
	// not how (decision 28; card 107). The gateway calls this, not the other
	// way round, so the causal walk runs through the call instead of joining
	// only at the process (card 110).
	const schemeSubmit = schemeRail
		.provides("Submit", {
			description:
				"Accept a submission in the scheme's format; the scheme confirms or rejects later, on its own timings, as SchemeSettlementConfirmed or SchemeRejected",
			type: "operation",
			pattern: "open-host-service",
			schema: schemeSubmissionSchema,
		})
		.raises(schemeSettlementConfirmed, schemeRejected);
	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	const schemeApp = schemeBC.addService("SchemeGatewayApp", {
		description:
			"The gateway's application service: the boundary the hub submits messages through",
		type: "application",
	});
	// "We turn a submission into a scheme message and send it. The scheme
	// confirms or rejects" (Scheme Connectivity lead) is two acts, not one: the
	// send is the gateway's, and the confirming or rejecting is the scheme's,
	// on its own timings. Card 95 gave the send an answer to wait on --
	// SubmitToScheme `returns`/`rejects` -- which drew the exchange as a single
	// synchronous call while the surrounding text said the scheme answers later;
	// the two disconnected chains that made are what card 105 closed.
	// SubmitToScheme is returns-less, the honest shape for a send with no
	// answer of its own (decision 13, note of 2026-09-10); the answer is the
	// scheme's own event, consumed through the gateway's anti-corruption layer
	// below, not awaited by the send itself. Card 110 gives it something to call:
	// the scheme's own Submit, through the same layer that carries the answer
	// back, so the reaction walk runs through the call rather than joining only
	// at the process. Card 109's reversion tried this and got two `reaction-cycle`
	// warnings for it; card 108 taught the rule that a ring with one process and
	// one translating policy is the process's lifecycle through the layer, not a
	// cycle, which is why this is now safe to wire honestly.
	const submitToScheme = schemeApp.provides("SubmitToScheme", {
		description:
			"Send a submission in the scheme's format; the scheme confirms or rejects later, on its own timings, as SchemeSettlementConfirmed or SchemeRejected",
		type: "operation",
		pattern: "open-host-service",
		schema: submissionSchema,
	});

	// The bank's own translated facts, in the bank's own words, once the scheme
	// has answered. Card 105 took these out when it made SubmitToScheme
	// returns-less and let Payments Hub hear the scheme's own events directly;
	// that closed one gap (a call that isn't waiting has no answer to wait for)
	// and opened another (decision 15: reacting to an outside event by
	// publishing an inside one is not boilerplate to skip, and an
	// anti-corruption layer is exactly where a reader wants that translation
	// named). Card 109 puts it back, this time honestly asynchronous: nothing
	// here waits, the gateway just republishes what the scheme told it.
	const schemeAcceptedSchema = schemeBC.addSchema("SchemeAccepted", {
		description:
			"The scheme settled: which instruction, and the scheme's own reference, in the gateway's own words",
	});
	const schemeAcceptedSchemaInstructionIdAttr =
		schemeAcceptedSchema.addAttribute("instructionId", {
			type: "string",
			identity: true,
		});
	schemeAcceptedSchema.addAttribute("schemeRef", { type: "string" });
	const schemeDeclinedSchema = schemeBC.addSchema("SchemeDeclined", {
		description:
			"The scheme refused: which instruction, and the scheme's status reason passed through untranslated, because you do not negotiate with a scheme",
	});
	const schemeDeclinedSchemaInstructionIdAttr =
		schemeDeclinedSchema.addAttribute("instructionId", {
			type: "string",
			identity: true,
		});
	schemeDeclinedSchema.addAttribute("schemeRef", { type: "string" });
	schemeDeclinedSchema.addAttribute("reason", { type: "string" });
	const schemeAccepted = schemeMessageAgg.provides("SchemeAccepted", {
		description:
			"The gateway's own settlement fact, translated from the scheme's SchemeSettlementConfirmed",
		type: "event",
		pattern: "published-language",
		schema: schemeAcceptedSchema,
	});
	const schemeDeclined = schemeMessageAgg.provides("SchemeDeclined", {
		description:
			"The gateway's own refusal fact, translated from the scheme's SchemeRejected",
		type: "event",
		pattern: "published-language",
		schema: schemeDeclinedSchema,
	});
	// The translation itself is behaviour with a name, which is the whole point
	// of an anti-corruption layer (decision 15): matching the scheme's answer to
	// the message it quotes and republishing it is not the same operation for
	// the confirming and the refusing case, because a settlement and a refusal
	// carry different bank-side facts.
	const recordSchemeAcceptance = schemeMessageAgg
		.provides("RecordSchemeAcceptance", {
			description:
				"Match the scheme's confirmation to the message it answers and republish it as the gateway's own settlement fact",
			type: "operation",
			internal: true,
		})
		.raises(schemeAccepted);
	const recordSchemeRejection = schemeMessageAgg
		.provides("RecordSchemeRejection", {
			description:
				"Match the scheme's rejection to the message it answers and republish it as the gateway's own refusal fact",
			type: "operation",
			internal: true,
		})
		.raises(schemeDeclined);
	// The gateway's own anti-corruption layer: it hears the scheme's two answers
	// and republishes the bank's own events, which is what lets Payments Hub
	// depend on the gateway's language instead of the scheme's (decision 28).
	const translateSchemeAnswer = schemeBC
		.addPolicy("Translate the scheme's answer", {
			description:
				"Either answer the scheme gives -- a settlement or a rejection -- is republished as the gateway's own fact, so the hub depends on the gateway's language and not the scheme's",
		})
		.on(schemeSettlementConfirmed, schemeRejected)
		.issues(recordSchemeAcceptance, recordSchemeRejection);
	return {
		schemeBC,
		submissionSchemaInstructionIdAttr,
		schemeAcceptedSchemaInstructionIdAttr,
		schemeDeclinedSchemaInstructionIdAttr,
		schemeApp,
		schemeSubmit,
		submitToScheme,
		schemeSettlementConfirmed,
		translateSchemeAnswer,
		schemeRejected,
		paymentSchemeBC,
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
		schemeBC,
		submissionSchemaInstructionIdAttr,
		schemeAcceptedSchemaInstructionIdAttr,
		schemeDeclinedSchemaInstructionIdAttr,
		schemeApp,
		schemeSubmit,
		submitToScheme,
		schemeSettlementConfirmed,
		translateSchemeAnswer,
		schemeRejected,
		paymentSchemeBC,
	} = own;
	const payments = foreign<PaymentsSurface>(set, "payments.json");
	const schemesSD = payments.subdomain(
		"#/domains/money_movement/subdomains/scheme_connectivity",
	);
	const instruction = payments.entity(
		"#/boundedcontexts/payments_hub/aggregates/payment_instruction/entities/payment_instruction",
	);

	schemeBC.serves(schemesSD);
	submissionSchemaInstructionIdAttr.identifies = instruction;

	schemeApp.consumes(schemeSubmit, {
		pattern: "anti-corruption-layer",
		by: [submitToScheme],
	});

	schemeAcceptedSchemaInstructionIdAttr.identifies = instruction;
	schemeDeclinedSchemaInstructionIdAttr.identifies = instruction;

	// A single-operation consumer's one operation is not the caller here -- the
	// policy above is -- so the caller is named rather than inferred (decision
	// 21, note of 2026-09-09).
	schemeApp.consumes(schemeSettlementConfirmed, {
		pattern: "anti-corruption-layer",
		by: [translateSchemeAnswer],
	});
	schemeApp.consumes(schemeRejected, {
		pattern: "anti-corruption-layer",
		by: [translateSchemeAnswer],
	});
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: paymentSchemeBC,
		downstream: schemeBC,
		description:
			"ISO 20022 as the scheme publishes it; the gateway takes the format as it is and translates at the edge",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
	});
}
