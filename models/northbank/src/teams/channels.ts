import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as AccountsSurface } from "./accounts.ts";
import type { Published as CardsSurface } from "./cards.ts";
import type { Published as CreditRiskSurface } from "./credit_risk.ts";
import type { Published as CustomerPlatformSurface } from "./customer_platform.ts";
import type { Published as DigitalPlatformSurface } from "./digital_platform.ts";
import { foreign } from "./foreign.ts";

/** This team's file in the NorthBank set. */
export const FILE = "channels.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Channels",
	attributes: {
		id: "northbank_channels",
		description:
			"NorthBank's Channels Team: branch and contact centre tooling.",
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
	const channelsTeam = ws.addTeam("Channels Team", {
		description: "Branch and contact centre tooling",
	});

	const channelsBC = ws.addBoundedContext("Branch & Contact Centre", {
		description: "Service requests raised in branches and on the phone",
		team: channelsTeam,
	});

	// BRANCH & CONTACT CENTRE
	// DISCOVERY: Channels lead. Authenticate before acting; notes never edited;
	// suppress marketing the same day; the quick-quote button.
	const requestAgg = channelsBC.addAggregate("ServiceRequest", {
		description:
			"A customer asking for something through a channel, with notes",
	});
	const request = requestAgg.addRootEntity("ServiceRequest", {
		description: "One ask, one outcome",
	});
	const note = requestAgg.addEntity("Note", {
		description: "What an agent recorded; added, never edited",
	});
	const channelVO = channelsBC.addValueObject("Channel", {
		description: "branch, phone or chat",
	});
	channelVO.addAttribute("value", { type: "'branch' | 'phone' | 'chat'" });
	const requestStatusVO = channelsBC.addValueObject("RequestStatus", {
		description: "open, resolved",
	});
	requestStatusVO.addAttribute("value", { type: "'open' | 'resolved'" });
	request.addAttribute("requestId", { type: "string", identity: true });
	const requestCustomerIdAttr = request.addAttribute("customerId", {
		type: "string",
	});
	request.addAttribute("authenticated", { type: "boolean" });
	note.addAttribute("noteId", { type: "string", identity: true });
	note.addAttribute("author", { type: "string" });
	note.addAttribute("text", { type: "string" });
	note.addAttribute("at", { type: "date-time" });
	request.includes(note, "annotated-by", "*");
	request.addAttribute("channel", { type: "Channel", valueobject: channelVO });
	request.addAttribute("status", {
		type: "RequestStatus",
		valueobject: requestStatusVO,
	});
	request.uses(channelVO, "through", "1");
	request.uses(requestStatusVO, "has-status", "1");
	// Customer lives in Customer & KYC: `customerId` above is the only thing that
	// crosses the boundary.
	requestAgg
		.addInvariant("AuthenticatedBeforeAction", {
			description:
				"Nothing is done on a request until the customer is authenticated",
		})
		.constrains(request);
	requestAgg
		.addInvariant("NoteImmutable", {
			description: "Notes are added, never edited or deleted",
		})
		.constrains(note);

	const requestRaised = requestAgg.provides("ServiceRequestRaised", {
		description: "A customer asked for something",
		type: "event",
		internal: true,
	});
	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	const channelsApp = channelsBC.addService("ChannelsApp", {
		description:
			"The branch and contact centre application service: the boundary agents raise requests through",
		type: "application",
	});
	const raiseRequest = channelsApp
		.provides("RaiseRequest", {
			description: "Open a request in a branch or on the phone",
			type: "operation",
			pattern: "open-host-service",
		})
		.raises(requestRaised);
	const suppressMarketing = requestAgg.provides("SuppressMarketing", {
		description: "Stop every outbound contact for the customer the same day",
		type: "operation",
		internal: true,
	});

	const suppressMarketingOnWithdrawalPolicy = channelsBC
		.addPolicy("Suppress marketing on withdrawal", {
			description:
				"A withdrawn marketing consent stops outbound contact the same day; the fix for the fine",
		})
		.issues(suppressMarketing);

	channelsBC.addTerm("Request", {
		definition: "One customer ask tracked to an outcome",
		aliases: ["Ticket"],
		embodiedBy: requestAgg,
	});
	// The branches' own words, defined where they are spoken rather than only
	// as aliases on another context's terms.
	channelsBC.addTerm("Member", {
		definition:
			"What branch staff call a customer, from the mutual days. The same record as Customer & KYC's Customer, read through GetCustomer",
		aliases: ["Customer"],
		embodiedBy: request.attributes.get("customerId")!,
	});
	channelsBC.addTerm("Balance", {
		definition:
			"What the screen shows: the available balance as returned by GetAvailableBalance at the moment of the call, never recomputed here",
		embodiedBy: requestAgg,
	});
	channelsBC.addTerm("Returned payment", {
		definition:
			"A payment sent back by the payee's bank. Not a regulatory return",
		embodiedBy: request,
	});
	return {
		channelsBC,
		requestCustomerIdAttr,
		suppressMarketingOnWithdrawalPolicy,
		channelsApp,
		raiseRequest,
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
		channelsBC,
		requestCustomerIdAttr,
		suppressMarketingOnWithdrawalPolicy,
		channelsApp,
		raiseRequest,
	} = own;
	const accounts = foreign<AccountsSurface>(set, "accounts.json");
	const getAvailableBalance = accounts.consumable(
		"#/boundedcontexts/accounts/services/account_servicing/provides/get_available_balance",
	);
	const accountsBC = accounts.context("#/boundedcontexts/accounts");
	const cards = foreign<CardsSurface>(set, "cards.json");
	const blockCard = cards.consumable(
		"#/boundedcontexts/cards/services/cards_app/provides/block_card",
	);
	const cardsBC = cards.context("#/boundedcontexts/cards");
	const creditRisk = foreign<CreditRiskSurface>(set, "credit_risk.json");
	const decide = creditRisk.consumable(
		"#/boundedcontexts/credit_decisioning/services/decisioning_app/provides/decide",
	);
	const decisioningBC = creditRisk.context(
		"#/boundedcontexts/credit_decisioning",
	);
	const customerPlatform = foreign<CustomerPlatformSurface>(
		set,
		"customer_platform.json",
	);
	const channelsSD = customerPlatform.subdomain(
		"#/domains/customer/subdomains/branch_&_contact_centre",
	);
	const customer = customerPlatform.entity(
		"#/boundedcontexts/customer_&_kyc/aggregates/customer/entities/customer",
	);
	const getCustomer = customerPlatform.consumable(
		"#/boundedcontexts/customer_&_kyc/services/onboarding_app/provides/get_customer",
	);
	const consentWithdrawn = customerPlatform.consumable(
		"#/boundedcontexts/customer_&_kyc/aggregates/consent/provides/consent_withdrawn",
	);
	const customerBC = customerPlatform.context(
		"#/boundedcontexts/customer_&_kyc",
	);
	const digitalPlatform = foreign<DigitalPlatformSurface>(
		set,
		"digital_platform.json",
	);
	const authenticateCustomer = digitalPlatform.consumable(
		"#/boundedcontexts/identity_&_access/services/identity_app/provides/authenticate_customer",
	);
	const identityBC = digitalPlatform.context(
		"#/boundedcontexts/identity_&_access",
	);

	channelsBC.serves(channelsSD);
	requestCustomerIdAttr.identifies = customer;

	// RaiseRequest is the whole of ChannelsApp's outward surface: an agent opens a
	// request and the screen fills from the four systems behind it, so every one of
	// these calls is made by that operation and by nothing else.
	channelsApp.consumes(getCustomer, {
		pattern: "conformist",
		by: [raiseRequest],
	});
	channelsApp.consumes(getAvailableBalance, {
		pattern: "conformist",
		by: [raiseRequest],
	});
	channelsApp.consumes(blockCard, {
		pattern: "conformist",
		by: [raiseRequest],
	});
	channelsApp.consumes(consentWithdrawn, { pattern: "conformist" });
	// DELIBERATE (separate-ways): the quick-quote button. Front-line staff may
	// not influence a credit decision, and the relationship below says so; this
	// consumption contradicts it.
	channelsApp.consumes(decide, {
		pattern: "anti-corruption-layer",
		by: [raiseRequest],
	});

	suppressMarketingOnWithdrawalPolicy.on(consentWithdrawn);

	channelsApp.consumes(authenticateCustomer, {
		pattern: "conformist",
		by: [raiseRequest],
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: customerBC,
		downstream: channelsBC,
		upstreamRoles: ["open-host-service", "published-language"],
		downstreamRoles: ["conformist"],
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: accountsBC,
		downstream: channelsBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["conformist"],
	});
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: cardsBC,
		downstream: channelsBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["conformist"],
	});
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: identityBC,
		downstream: channelsBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["conformist"],
	});

	// Separate ways: conduct policy. Front-line staff may not influence a credit decision.
	channelsBC.separateWaysFrom(decisioningBC, {
		description:
			"No integration by policy; the quick-quote consumption above contradicts this and is under investigation",
		disposition: "refactor",
		comments: [
			{
				text: "The map says separate ways but Channels calls the quick-quote endpoint directly; one of the two has to go.",
				link: {
					kind: "code",
					url: "https://github.com/example/northbank/blob/main/channels/quote/QuickQuoteClient.ts",
					label: "channels/quote/QuickQuoteClient.ts",
				},
			},
			{
				text: "Conduct policy is explicit that front-line staff may not influence a credit decision.",
				link: {
					kind: "adr",
					url: "https://github.com/example/northbank/blob/main/docs/adr/021-conduct-separation.md",
					label: "ADR-021 Conduct separation",
				},
			},
		],
	});
}
