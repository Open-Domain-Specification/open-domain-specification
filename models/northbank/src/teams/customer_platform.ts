import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as FinancialCrimeSurface } from "./financial_crime.ts";
import { foreign } from "./foreign.ts";

/** This team's file in the NorthBank set. */
export const FILE = "customer_platform.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Customer Platform",
	attributes: {
		id: "northbank_customer_platform",
		description:
			"NorthBank's Customer Platform Team: onboarding, KYC and consent, and the Customer domain.",
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
		"#/boundedcontexts/customer_&_kyc/aggregates/consent/provides/consent_withdrawn",
		"#/boundedcontexts/customer_&_kyc/aggregates/customer/provides/customer_verified",
		"#/boundedcontexts/customer_&_kyc/services/onboarding_app/provides/get_customer",
	],
	contexts: ["#/boundedcontexts/customer_&_kyc"],
	entities: [
		"#/boundedcontexts/customer_&_kyc/aggregates/customer/entities/customer",
	],
	subdomains: ["#/domains/customer/subdomains/branch_&_contact_centre"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const customerDomain = ws.addDomain("Customer", {
		description:
			"Knowing who the customer is, what they agreed to, and serving them",
	});
	const kycSD = customerDomain.addSubdomain("Onboarding & KYC", {
		type: "supporting",
		description:
			"Verifying identity before anything else. Regulated and necessary",
	});
	const consentSD = customerDomain.addSubdomain("Consent", {
		type: "supporting",
		description:
			"Purpose, scope, expiry, withdrawal. A first-class thing since the 2022 fine",
	});
	customerDomain.addSubdomain("Branch & Contact Centre", {
		type: "supporting",
		description: "Face-to-face and phone service",
	});

	const customerPlatformTeam = ws.addTeam("Customer Platform Team", {
		description: "Onboarding, KYC, consent",
	});

	// One context serves two subdomains: the customer record and their consents
	// are one platform, owned by one team, with one meaning of "customer".
	const customerBC = ws.addBoundedContext("Customer & KYC", {
		description: "Verified customers, their documents and their consents",
		subdomains: [kycSD, consentSD],
		team: customerPlatformTeam,
	});

	// CUSTOMER & KYC
	// DISCOVERY: Head of Customer Platform. Eighteen or over; a document on file;
	// consent withdrawn is final; open banking consents expire within a year.
	const customerAgg = customerBC.addAggregate("Customer", {
		description: "A verified person and the documents that verify them",
	});
	const customer = customerAgg.addRootEntity("Customer", {
		description: "Someone the bank has verified",
	});
	const identityDocument = customerAgg.addEntity("IdentityDocument", {
		description:
			"A passport or licence checked during onboarding; kept for audit",
	});
	const dateOfBirthVO = customerBC.addValueObject("DateOfBirth", {
		description: "A date; the source of the age rule",
	});
	dateOfBirthVO.addAttribute("value", { type: "date" });
	const addressVO = customerBC.addValueObject("Address", {
		description: "Residential address, verified against the electoral roll",
	});
	addressVO.addAttribute("lines", { type: "string[]" });
	addressVO.addAttribute("postcode", { type: "string" });
	const kycStatusVO = customerBC.addValueObject("KycStatus", {
		description: "pending, held (sanctions match), verified",
	});
	kycStatusVO.addAttribute("value", {
		type: "'pending' | 'held' | 'verified'",
	});
	customer.addAttribute("customerId", { type: "string", identity: true });
	customer.addAttribute("legalName", { type: "string" });
	customer.addAttribute("dateOfBirth", {
		type: "DateOfBirth",
		valueobject: dateOfBirthVO,
	});
	customer.addAttribute("kycStatus", {
		type: "KycStatus",
		valueobject: kycStatusVO,
	});
	identityDocument.addAttribute("documentType", {
		type: "'passport' | 'driving-licence'",
	});
	identityDocument.addAttribute("number", { type: "string", identity: true });
	const documentExpiry = identityDocument.addAttribute("expiresOn", {
		type: "date",
	});
	customer.includes(identityDocument, "verified-by", "*");
	customer.addAttribute("address", {
		type: "Address",
		valueobject: addressVO,
	});
	customer.uses(dateOfBirthVO, "born-on", "1");
	customer.uses(addressVO, "lives-at", "1");
	customer.uses(kycStatusVO, "has-status", "1");

	// Constrains the Customer, not the date: a date of birth is not itself adult
	// or not; the rule is about the person on the day they are onboarded.
	customerAgg
		.addInvariant("AdultOnly", {
			description:
				"A customer is eighteen or over on the day onboarding starts, computed from the date of birth; no exceptions",
		})
		.constrains(customer);
	customerAgg
		.addInvariant("VerifiedNeedsDocument", {
			description:
				"A verified customer has at least one identity document on file",
		})
		.constrains(kycStatusVO, identityDocument);
	customerAgg
		.addInvariant("DocumentNotExpired", {
			description:
				"A document past its expiry does not count towards verification",
		})
		.constrains(documentExpiry);

	const consentAgg = customerBC.addAggregate("Consent", {
		description:
			"One permission with a purpose, a scope and a lifetime; its own aggregate because it changes independently of the customer record",
	});
	const consent = consentAgg.addRootEntity("Consent", {
		description: "A permission given, and possibly withdrawn, by a customer",
	});
	const purposeVO = customerBC.addValueObject("ConsentPurpose", {
		description:
			"marketing, data-sharing or open-banking; the purpose decides the rules",
	});
	purposeVO.addAttribute("value", {
		type: "'marketing' | 'data-sharing' | 'open-banking'",
	});
	const scopeVO = customerBC.addValueObject("ConsentScope", {
		description: "Channels and data categories the permission covers",
	});
	scopeVO.addAttribute("channels", { type: "string[]" });
	scopeVO.addAttribute("dataCategories", { type: "string[]" });
	consent.addAttribute("consentId", { type: "string", identity: true });
	consent.addAttribute("customerId", { type: "string" });
	consent.addAttribute("givenAt", { type: "date-time" });
	const withdrawnAt = consent.addAttribute("withdrawnAt", {
		type: "date-time",
	});
	const expiresAt = consent.addAttribute("expiresAt", { type: "date-time" });
	consent.addAttribute("purpose", {
		type: "ConsentPurpose",
		valueobject: purposeVO,
	});
	consent.addAttribute("scope", {
		type: "ConsentScope",
		valueobject: scopeVO,
	});
	consent.uses(purposeVO, "for", "1");
	consent.uses(scopeVO, "covers", "1");
	consent.references(customer, "given-by", "1");

	consentAgg
		.addInvariant("WithdrawnIsFinal", {
			description:
				"A withdrawn consent is never reinstated; a new consent is given instead",
		})
		.constrains(withdrawnAt);
	consentAgg
		.addInvariant("PurposeRequired", {
			description: "A consent without a purpose is not a consent",
		})
		.constrains(purposeVO);
	consentAgg
		.addInvariant("OpenBankingConsentExpires", {
			description:
				"An open banking consent expires within twelve months of being given",
		})
		.constrains(expiresAt, purposeVO);

	const customerRefSchema = customerBC.addSchema("CustomerRef");
	customerRefSchema.addAttribute("customerId", {
		type: "string",
		identity: true,
	});
	const customerVerifiedSchema = customerBC.addSchema("CustomerVerified");
	customerVerifiedSchema.addAttribute("customerId", {
		type: "string",
		identity: true,
	});
	customerVerifiedSchema.addAttribute("verifiedAt", { type: "date-time" });
	// A returned shape: GetCustomer is asked with a CustomerRef and answers with
	// this, so callers can see what they depend on without reading the aggregate.
	const customerDetailsSchema = customerBC.addSchema("CustomerDetails", {
		description: "The verified details GetCustomer answers with",
	});
	customerDetailsSchema.addAttribute("customerId", {
		type: "string",
		identity: true,
	});
	customerDetailsSchema.addAttribute("dateOfBirth", {
		type: "DateOfBirth",
		valueobject: dateOfBirthVO,
	});
	customerDetailsSchema.addAttribute("address", {
		type: "Address",
		valueobject: addressVO,
	});
	customerDetailsSchema.addAttribute("kycStatus", {
		type: "KycStatus",
		valueobject: kycStatusVO,
	});
	const consentSchema = customerBC.addSchema("ConsentChanged", {
		description:
			"Used by both consent events; the contact centre acts on it the same day",
	});
	consentSchema.addAttribute("consentId", { type: "string", identity: true });
	consentSchema.addAttribute("customerId", {
		type: "string",
		identifies: customer,
	});
	consentSchema.addAttribute("purpose", {
		type: "ConsentPurpose",
		valueobject: purposeVO,
	});

	const customerVerified = customerAgg.provides("CustomerVerified", {
		description: "KYC passed; accounts may be opened",
		type: "event",
		pattern: "published-language",
		schema: customerVerifiedSchema,
	});
	const consentGiven = consentAgg.provides("ConsentGiven", {
		description: "A permission now exists",
		type: "event",
		pattern: "published-language",
		schema: consentSchema,
	});
	const consentWithdrawn = consentAgg.provides("ConsentWithdrawn", {
		description: "A permission ended; published the same second",
		type: "event",
		pattern: "published-language",
		schema: consentSchema,
	});
	const verifyCustomer = customerAgg
		.provides("VerifyCustomer", {
			description: "Mark KYC as passed once documents and screening are clear",
			type: "operation",
			internal: true,
		})
		.raises(customerVerified);
	const holdOnboarding = customerAgg.provides("HoldOnboarding", {
		description: "Stop everything until Financial Crime clears the match",
		type: "operation",
		internal: true,
	});

	const onboardingApp = customerBC.addService("OnboardingApp", {
		description: "The onboarding journey and the customer read API",
		type: "application",
	});
	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	onboardingApp
		.provides("GiveConsent", {
			description: "Record a permission",
			type: "operation",
			pattern: "open-host-service",
			schema: consentSchema,
		})
		.raises(consentGiven);
	onboardingApp
		.provides("WithdrawConsent", {
			description: "End a permission, finally",
			type: "operation",
			pattern: "open-host-service",
			schema: consentSchema,
		})
		.raises(consentWithdrawn);
	// The command that creates an onboarding, named directly in the process's
	// `starts` below rather than through an invented event raised for no other
	// reason than to be heard: nothing but that process ever waited on one
	// (decision 23, third amendment; card 99).
	const startOnboarding = onboardingApp.provides("StartOnboarding", {
		description: "Begin with name, date of birth, address and a document",
		type: "operation",
		pattern: "open-host-service",
	});
	onboardingApp.provides("GetCustomer", {
		description:
			"Asked with a CustomerRef, answers with the customer's verified details",
		type: "operation",
		pattern: "open-host-service",
		schema: customerRefSchema,
		returns: customerDetailsSchema,
	});

	// DISCOVERY: Head of Customer Platform, "onboarding starts, we screen the name
	// against the sanctions lists". That is one step and it leaves the bank's
	// boundary, so it is an operation of the application service that makes the
	// call (decision 17). It was the KycScreening domain service's until card 92:
	// a domain service is the inside of the model, the same as an aggregate, and
	// that one held nothing else — no rule, no reading across aggregates, only the
	// call — so what is left of it is this operation.
	const screenCustomer = onboardingApp.provides("ScreenCustomer", {
		description:
			"Screen the prospective customer against the sanctions lists, through the ACL",
		type: "operation",
		internal: true,
	});

	customerBC.addTerm("Customer", {
		definition: "A verified person. Branches say member; payments say party",
		aliases: ["Member", "Party"],
		embodiedBy: customerAgg,
	});
	customerBC.addTerm("KYC", {
		definition:
			"Know your customer: the verification that must pass before any account opens",
		embodiedBy: kycStatusVO,
	});
	customerBC.addTerm("Consent", {
		definition:
			"A permission with a purpose, a scope and a lifetime; withdrawal is final",
		embodiedBy: consentAgg,
	});

	// Onboarding is a process, not two policies: it holds the prospective
	// customer from the moment their details arrive until KYC passes, and a
	// sanctions match keeps that same instance alive rather than ending it.
	const customerOnboardingProcess = customerBC
		.addProcess("Customer onboarding", {
			description:
				"From a prospective customer's details to a verified one. Everyone is screened before anything else, and the process then waits on the engine's verdict: a match holds the onboarding until Financial Crime clears it by hand, which is why there is no timeout; a clean screening lets KYC verify the customer. Correlation is by customerId, which the screening event carries back; the instance ends when KYC passes and accounts may be opened",
		})
		.starts(startOnboarding)
		.issues(screenCustomer, holdOnboarding, verifyCustomer)
		.ends(customerVerified);
	return {
		customerOnboardingProcess,
		onboardingApp,
		screenCustomer,
		customerBC,
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
		customerOnboardingProcess,
		onboardingApp,
		screenCustomer,
		customerBC,
	} = own;
	const financialCrime = foreign<FinancialCrimeSurface>(
		set,
		"financial_crime.json",
	);
	const screenParty = financialCrime.consumable(
		"#/boundedcontexts/sanctions_screening/services/screening_app/provides/screen_party",
	);
	const partyMatched = financialCrime.consumable(
		"#/boundedcontexts/sanctions_screening/aggregates/screening_result/provides/party_matched",
	);
	const sanctionsBC = financialCrime.context(
		"#/boundedcontexts/sanctions_screening",
	);

	onboardingApp.consumes(screenParty, {
		pattern: "anti-corruption-layer",
		by: [screenCustomer],
	});
	onboardingApp.consumes(partyMatched, { pattern: "anti-corruption-layer" });

	customerOnboardingProcess.on(partyMatched);

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: sanctionsBC,
		downstream: customerBC,
		upstreamRoles: ["open-host-service", "published-language"],
		downstreamRoles: ["anti-corruption-layer"],
	});
}
