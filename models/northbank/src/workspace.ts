import { type Attribute, Workspace } from "@open-domain-specification/core";

/**
 * NorthBank: a fictional mid-sized retail bank.
 *
 * The business: NorthBank's edge is credit judgement, the account as the
 * relationship, and fraud losses kept low; everything else must be perfect
 * and is not unique. Hence accounts, lending, credit decisioning and fraud
 * are core; onboarding, consent, the ledger, payments, reporting and the
 * branches are supporting; sanctions lists, scheme connectivity, cards and
 * identity are generic.
 *
 * The emphasis is on invariants and value objects: Money, IBAN, PAN, Consent,
 * a balanced journal entry, a loan schedule. Stress-test features: seventeen
 * contexts, two of them external (CardCo and the screening vendor), a shared
 * kernel (a Shared Kernel context, borrowed from by
 * Accounts, Ledger, Payments, Cards, Lending and Reporting), a partnership
 * (lending and decisioning), a separate-ways pair (branches and
 * decisioning), a legacy mainframe big ball of mud, and three deliberate
 * mistakes (marked DELIBERATE) that trigger separate-ways,
 * context-serves-subdomain and consumable-kind.
 *
 * Provenance: BRIEF.md and DISCOVERY.md. Comments "DISCOVERY: <who>" point at
 * the interview an element came from.
 */
export const workspace = new Workspace("NorthBank", {
	id: "northbank",
	odsVersion: "1.0.0",
	description:
		"A fictional retail bank: onboarding and KYC, consent, accounts and ledger, payments and schemes, cards, lending and credit decisioning, fraud, sanctions, regulatory reporting, branches and contact centre, and a legacy core.",
	version: "1.0.0",
	primaryColor: "#1d4ed8",
});

/* =======================
   DOMAINS & SUBDOMAINS
   DISCOVERY section 5 has the reasoning.
   ======================= */

const customerDomain = workspace.addDomain("Customer", {
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
const channelsSD = customerDomain.addSubdomain("Branch & Contact Centre", {
	type: "supporting",
	description: "Face-to-face and phone service",
});

const products = workspace.addDomain("Banking Products", {
	description: "Accounts, the ledger beneath them, and cards",
});
const accountsSD = products.addSubdomain("Current & Savings Accounts", {
	type: "core",
	description:
		"The account is the relationship; where the Fair Treatment Rules bite",
});
const ledgerSD = products.addSubdomain("Ledger", {
	type: "supporting",
	description: "Double-entry postings. Must be perfect; not unique",
});
const cardsSD = products.addSubdomain("Cards", {
	type: "generic",
	description:
		'Issuing and authorisation. "We would outsource it if the contract allowed"',
});

const moneyMovement = workspace.addDomain("Money Movement", {
	description: "Instructions in, settlements out",
});
const paymentsSD = moneyMovement.addSubdomain("Payments", {
	type: "supporting",
	description: "The hub between customers and the schemes",
});
const schemesSD = moneyMovement.addSubdomain("Scheme Connectivity", {
	type: "generic",
	description: "Gateways in the schemes' formats",
});

const credit = workspace.addDomain("Credit", {
	description: "Lending the bank's money well",
});
const lendingSD = credit.addSubdomain("Lending", {
	type: "core",
	description:
		"Origination and servicing. A below-market loss rate for fifteen years",
});
const decisioningSD = credit.addSubdomain("Credit Decisioning", {
	type: "core",
	description: "The bank's own scorecard and affordability rules",
});

const riskDomain = workspace.addDomain("Risk & Compliance", {
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
const reportingSD = riskDomain.addSubdomain("Regulatory Reporting", {
	type: "supporting",
	description: "Returns to the PCA, reconciled to the ledger",
});

const platform = workspace.addDomain("Platform", {
	description: "Shared technical capabilities",
});
platform.addSubdomain("Identity & Access", {
	type: "generic",
	description:
		"Login and step-up authentication. Vendor built; never placed on the capability map",
});

/* =======================
   TEAMS
   ======================= */

const customerPlatformTeam = workspace.addTeam("Customer Platform Team", {
	description: "Onboarding, KYC, consent",
});
const financialCrimeTeam = workspace.addTeam("Financial Crime Team", {
	description: "Sanctions screening, fraud scoring, cases",
});
const accountsTeam = workspace.addTeam("Accounts Team", {
	description: "The account platform",
});
const coreBankingTeam = workspace.addTeam("Core Banking Team", {
	description: "The ledger, and Sovereign",
});
const cardsTeam = workspace.addTeam("Cards Team", {
	description: "Issuing and the CardCo integration",
});
const paymentsTeam = workspace.addTeam("Payments Team", {
	description: "The payments hub",
});
const schemeTeam = workspace.addTeam("Scheme Connectivity Team", {
	description: "Gateways to the schemes",
});
const lendingTeam = workspace.addTeam("Lending Team", {
	description: "Origination and servicing; one planning board with Credit Risk",
});
const creditRiskTeam = workspace.addTeam("Credit Risk Team", {
	description: "Decisioning, scorecards, affordability",
});
const financeSystemsTeam = workspace.addTeam("Finance Systems Team", {
	description: "Regulatory reporting",
});
const channelsTeam = workspace.addTeam("Channels Team", {
	description: "Branch and contact centre tooling",
});
const digitalPlatformTeam = workspace.addTeam("Digital Platform Team", {
	description: "Identity and access",
});
const sharedKernelTeam = workspace.addTeam("Shared Kernel Team", {
	description:
		"Owns Money and AccountNumber; changes only by agreement of the teams that borrow them",
});

/* =======================
   BOUNDED CONTEXTS
   ======================= */

// One context serves two subdomains: the customer record and their consents
// are one platform, owned by one team, with one meaning of "customer".
const customerBC = workspace.addBoundedContext("Customer & KYC", {
	description: "Verified customers, their documents and their consents",
	subdomains: [kycSD, consentSD],
	team: customerPlatformTeam,
});
const sanctionsBC = sanctionsSD.addBoundedcontext("Sanctions Screening", {
	description: "Names against lists, with a match score",
	team: financialCrimeTeam,
});
// The new platform holds current accounts; savings are still on Sovereign
// (below, in the same subdomain) until the hollowing-out moves them across.
const accountsBC = accountsSD.addBoundedcontext("Accounts", {
	description:
		"Current accounts on the 2019 platform: mandates, overdrafts, holds, status. Savings remain on Sovereign",
	team: accountsTeam,
});
const ledgerBC = ledgerSD.addBoundedcontext("Ledger", {
	description: "Balanced, immutable journal entries",
	team: coreBankingTeam,
});
const paymentsBC = paymentsSD.addBoundedcontext("Payments Hub", {
	description: "Instructions scored, submitted, settled and posted",
	team: paymentsTeam,
});
const schemeBC = schemesSD.addBoundedcontext("Scheme Gateway", {
	description: "ISO 20022 messages to and from the schemes",
	team: schemeTeam,
});
const cardsBC = cardsSD.addBoundedcontext("Cards", {
	description: "Issued cards and their authorisations, via CardCo",
	team: cardsTeam,
});
const lendingBC = lendingSD.addBoundedcontext("Lending", {
	description: "Applications, agreements, loans and schedules",
	team: lendingTeam,
});
const decisioningBC = decisioningSD.addBoundedcontext("Credit Decisioning", {
	description: "Bureau data, the scorecard and affordability",
	team: creditRiskTeam,
});
const fraudBC = fraudSD.addBoundedcontext("Fraud", {
	description: "The transaction scorer and fraud cases",
	team: financialCrimeTeam,
});
const reportingBC = reportingSD.addBoundedcontext("Regulatory Reporting", {
	description: "Returns assembled from events and reconciled to the ledger",
	team: financeSystemsTeam,
});
const channelsBC = channelsSD.addBoundedcontext("Branch & Contact Centre", {
	description: "Service requests raised in branches and on the phone",
	team: channelsTeam,
});
// DISCOVERY: Core Banking lead. "Nobody touches Sovereign's tables. It is what it is."
const sovereignBC = accountsSD.addBoundedcontext("Sovereign Core (legacy)", {
	description:
		"The 1989 COBOL core that still holds savings accounts and runs the nightly batch. Modelled at its edge only",
	bigBallOfMud: true,
	team: coreBankingTeam,
});
// DELIBERATE (context-serves-subdomain): the vendor-built login platform was
// never placed on the capability map, so it serves no subdomain here.
const identityBC = workspace.addBoundedContext("Identity & Access", {
	description: "Usernames, credentials, step-up authentication",
	team: digitalPlatformTeam,
});
// Six contexts carry an amount or a ledger account, so the library is a
// context of its own rather than fifteen pairwise agreements (decision 16's
// amendment): each sharer declares one shared-kernel relationship with this
// one and borrows what it needs.
//
// It serves no subdomain of its own, and until card 95 it had one: a supporting
// "Shared Financial Primitives" invented so that `context-serves-subdomain`
// would stop asking, on a capability map that has no such capability and that
// no customer journey runs through. What the kernel serves is whatever its
// sharers serve. The rule now exempts a context whose relationships are all
// shared kernel with two or more sharers, and the invented row is gone; the
// team that owns Money and AccountNumber stays, because somebody does own them.
const sharedKernelBC = workspace.addBoundedContext("Shared Kernel", {
	description:
		"The shared library the bank's contexts compile against: Money and AccountNumber, and nothing else. Not a product; nobody's customer journey runs through it",
	team: sharedKernelTeam,
});

// The three systems the bank integrates with and does not run: the screening
// vendor behind Sanctions Screening ("the lists are bought; the screening
// engine is bought"), CardCo, which sends the authorisation requests Cards
// answers, and the payment scheme the gateway submits to. None has a subdomain
// or a team here, and none has aggregates, because what happens inside
// somebody else's machine is not ours to state (decision 28).
const screeningVendorBC = workspace.addBoundedContext("Screening Vendor", {
	description:
		"The bought sanctions lists and the bought screening engine, behind a documented API. Not the bank's",
	external: true,
});
const cardCoBC = workspace.addBoundedContext("CardCo", {
	description:
		"The outsourced card processor: it sends the authorisation requests and takes the answers, in its own format",
	external: true,
});
// DISCOVERY: Scheme Connectivity lead. "We turn a submission into a scheme
// message and send it. The scheme confirms or rejects." The confirmation is
// the scheme's fact, not the gateway's, and until card 95 the model credited
// SubmitToScheme with raising both of them and never declared the scheme at
// all -- the one system in the whole payment path nobody had written down.
const paymentSchemeBC = workspace.addBoundedContext("Payment Scheme", {
	description:
		"The clearing scheme the bank submits to: it settles or refuses, in ISO 20022 and on its own timings. Not the bank's",
	external: true,
});
// A standards body is an external context too, and the honest place for a
// value nobody here owns. The IBAN was Accounts', and Payments wrote its own
// `string (ISO 13616)` beside it: one definition of the account number every
// bank in Europe uses, held twice, in two contexts, either of which could have
// drifted. It is not the bank's to change and not Accounts' to lend — it is
// the standard's, and both contexts conform to it (decision 28, third
// amendment; card 100). The body provides nothing to consume: what it
// publishes is the shape, which is what a conformist borrows.
const isoBC = workspace.addBoundedContext("ISO 13616", {
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

/* =======================
   CUSTOMER & KYC
   DISCOVERY: Head of Customer Platform. Eighteen or over; a document on file;
   consent withdrawn is final; open banking consents expire within a year.
   ======================= */

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
kycStatusVO.addAttribute("value", { type: "'pending' | 'held' | 'verified'" });
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
const withdrawnAt = consent.addAttribute("withdrawnAt", { type: "date-time" });
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
const getCustomer = onboardingApp.provides("GetCustomer", {
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

/* =======================
   SANCTIONS SCREENING
   DISCOVERY: Financial Crime lead. Bought lists, bought engine, documented API.
   ======================= */

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
partyMatchedSchema.addAttribute("resultId", { type: "string", identity: true });
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

screeningApp.consumes(matchAgainstLists, {
	pattern: "conformist",
	by: [screenParty],
});
screeningVendorBC.upstreamOf(sanctionsBC, {
	description:
		"The engine's API is the vendor's; Screening calls it as documented and reshapes nothing",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
});

onboardingApp.consumes(screenParty, {
	pattern: "anti-corruption-layer",
	by: [screenCustomer],
});
onboardingApp.consumes(partyMatched, { pattern: "anti-corruption-layer" });
// Onboarding is a process, not two policies: it holds the prospective
// customer from the moment their details arrive until KYC passes, and a
// sanctions match keeps that same instance alive rather than ending it.
customerBC
	.addProcess("Customer onboarding", {
		description:
			"From a prospective customer's details to a verified one. Everyone is screened before anything else, and the process then waits on the engine's verdict: a match holds the onboarding until Financial Crime clears it by hand, which is why there is no timeout; a clean screening lets KYC verify the customer. Correlation is by customerId, which the screening event carries back; the instance ends when KYC passes and accounts may be opened",
	})
	.starts(startOnboarding)
	.on(partyMatched)
	.issues(screenCustomer, holdOnboarding, verifyCustomer)
	.ends(customerVerified);

/* =======================
   SHARED KERNEL
   DISCOVERY: card 56. Money and AccountNumber are declared once here and
   borrowed, over a shared-kernel relationship, by every context that carries
   an amount or a ledger account. Neither is typed by a `uses` relation from
   the borrower: a relation never crosses a context boundary (decision 15),
   so the attribute's `valueobject` reference is the only link, exactly as
   decision 16's amendment describes.
   ======================= */

const kernelMoneyVO = sharedKernelBC.addValueObject("Money", {
	description:
		"Minor units and an ISO 4217 code. Never a float; @northbank/money is the one implementation",
});
kernelMoneyVO.addAttribute("amountMinor", { type: "int64" });
kernelMoneyVO.addAttribute("currency", { type: "ISO 4217 code" });
const kernelAccountNumberVO = sharedKernelBC.addValueObject("AccountNumber", {
	description:
		"Sort code and eight-digit number, from the same library as Money",
});
kernelAccountNumberVO.addAttribute("sortCode", { type: "string" });
kernelAccountNumberVO.addAttribute("number", { type: "string" });

/* =======================
   ACCOUNTS
   DISCOVERY: Accounts Team lead. IBAN checksum; balance within overdraft;
   frozen accepts no debits; closed has zero balance; mandates are verified customers.
   ======================= */

const accountAgg = accountsBC.addAggregate("Account", {
	description:
		"One product with its mandates, limit and status; the rules about balance and status are checked here",
});
const account = accountAgg.addRootEntity("Account", {
	description:
		"A current account on the new platform. Savings accounts are Sovereign rows until they are migrated",
});
const mandate = accountAgg.addEntity("Mandate", {
	description:
		"A customer's authority to operate the account; an entity because it is granted and revoked over time",
});
// IBAN is ISO 13616's, and AccountNumber and Money are the Shared Kernel's;
// all three are borrowed by reference, not declared here (decision 16's
// amendment, decision 28's third).
const accountNumberVO = kernelAccountNumberVO;
const accountMoney = kernelMoneyVO;
const overdraftVO = accountsBC.addValueObject("OverdraftLimit", {
	description: "How far below zero the available balance may go",
});
overdraftVO.addAttribute("limit", { type: "Money", valueobject: accountMoney });
const accountStatusVO = accountsBC.addValueObject("AccountStatus", {
	description: "open, frozen or closed",
});
accountStatusVO.addAttribute("value", { type: "'open' | 'frozen' | 'closed'" });
account.addAttribute("accountId", { type: "string", identity: true });
account.addAttribute("productCode", {
	type: "'current'",
	description:
		"Only current accounts live here; savings stay on Sovereign until the hollowing-out moves them",
});
account.addAttribute("iban", { type: "IBAN", valueobject: ibanVO });
account.addAttribute("accountNumber", {
	type: "AccountNumber",
	valueobject: accountNumberVO,
});
account.addAttribute("postedBalance", {
	type: "Money",
	valueobject: accountMoney,
	description: "What the ledger has posted to this account",
});
const pendingAuthorisations = account.addAttribute("pendingAuthorisations", {
	type: "Money",
	valueobject: accountMoney,
	description:
		"Card authorisations approved but not yet captured; a hold placed on CardAuthorised and released when the capture posts",
});
const availableBalance = account.addAttribute("availableBalance", {
	type: "Money",
	valueobject: accountMoney,
	description: "Posted balance less pending card authorisations",
});
account.addAttribute("status", {
	type: "AccountStatus",
	valueobject: accountStatusVO,
});
mandate.addAttribute("customerId", {
	type: "string",
	identity: true,
	identifies: customer,
});
mandate.addAttribute("powers", { type: "'sole' | 'joint' | 'view-only'" });
account.includes(mandate, "operated-under", "1..*");
account.addAttribute("overdraft", {
	type: "OverdraftLimit",
	valueobject: overdraftVO,
});
account.uses(overdraftVO, "overdraft", "1");
account.uses(accountStatusVO, "has-status", "1");
// Customer lives in Customer & KYC: a relation never crosses a bounded
// context, so the mandate holds `customerId` and nothing more. AccountNumber
// and Money are the Shared Kernel's and IBAN is ISO 13616's, so all three are
// typed by `valueobject` reference only; a relation never crosses a context
// boundary either.

accountAgg
	.addInvariant("BalanceWithinOverdraft", {
		description:
			"The available balance never falls below minus the overdraft limit",
	})
	.constrains(availableBalance, overdraftVO);
accountAgg
	.addInvariant("AvailableIsPostedLessHolds", {
		description:
			"Available balance equals posted balance less pending authorisations, always; the three are updated as one",
	})
	.constrains(availableBalance, pendingAuthorisations);
accountAgg
	.addInvariant("FrozenAcceptsNoDebits", {
		description:
			"A frozen account accepts no debits until Financial Crime unfreezes it",
	})
	.constrains(accountStatusVO);
accountAgg
	.addInvariant("ClosedHasZeroBalance", {
		description: "An account closes only at a zero balance",
	})
	.constrains(accountStatusVO, availableBalance);
accountAgg
	.addInvariant("MandateHolderIsVerified", {
		description: "Every mandate holder is a verified customer",
	})
	.constrains(mandate);

const accountRefSchema = accountsBC.addSchema("AccountRef");
accountRefSchema.addAttribute("accountId", { type: "string", identity: true });
// A returned shape: what GetAvailableBalance answers with.
const availableBalanceSchema = accountsBC.addSchema("AvailableBalance", {
	description:
		"Posted balance less pending authorisations, at the moment of the call",
});
availableBalanceSchema.addAttribute("amount", {
	type: "Money",
	valueobject: accountMoney,
});
const accountOpenedSchema = accountsBC.addSchema("AccountOpened", {
	description: "What reporting and the ledger learn about a new account",
});
accountOpenedSchema.addAttribute("accountId", {
	type: "string",
	identity: true,
});
accountOpenedSchema.addAttribute("iban", { type: "IBAN", valueobject: ibanVO });
accountOpenedSchema.addAttribute("customerId", {
	type: "string",
	identifies: customer,
});
accountOpenedSchema.addAttribute("productCode", { type: "'current'" });
const openAccountSchema = accountsBC.addSchema("OpenAccount");
openAccountSchema.addAttribute("customerId", {
	type: "string",
	identifies: customer,
});
openAccountSchema.addAttribute("productCode", { type: "'current'" });

const accountOpened = accountAgg.provides("AccountOpened", {
	description: "A product exists for a verified customer",
	type: "event",
	pattern: "published-language",
	schema: accountOpenedSchema,
});
const accountFrozen = accountAgg.provides("AccountFrozen", {
	description: "Debits are blocked pending a fraud case",
	type: "event",
	pattern: "published-language",
	schema: accountRefSchema,
});
const accountClosed = accountAgg.provides("AccountClosed", {
	description: "The account is closed at zero balance",
	type: "event",
	pattern: "published-language",
	schema: accountRefSchema,
});
accountAgg
	.provides("CloseAccount", {
		description: "Close at zero balance",
		type: "operation",
		internal: true,
	})
	.raises(accountClosed);
const updateBalance = accountAgg.provides("UpdateBalance", {
	description:
		"Recompute posted and available balances from a ledger posting, releasing the hold the posting captures",
	type: "operation",
	internal: true,
});
const placeHold = accountAgg.provides("PlaceHold", {
	description:
		"Add an approved card authorisation to pending authorisations, so the available balance drops before the capture posts",
	type: "operation",
	internal: true,
});

const accountServicing = accountsBC.addService("AccountServicing", {
	description: "The documented account API for channels, cards and lending",
	type: "application",
});
accountServicing
	.provides("OpenAccount", {
		description: "Open a product for a verified customer",
		type: "operation",
		pattern: "open-host-service",
		schema: openAccountSchema,
	})
	.raises(accountOpened);
const getAvailableBalance = accountServicing.provides("GetAvailableBalance", {
	description: "Posted balance less pending authorisations",
	type: "operation",
	pattern: "open-host-service",
	schema: accountRefSchema,
	returns: availableBalanceSchema,
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const freezeAccount = accountServicing
	.provides("FreezeAccount", {
		description: "Block debits; issued when Financial Crime opens a case",
		type: "operation",
		pattern: "open-host-service",
		schema: accountRefSchema,
	})
	.raises(accountFrozen);

// DISCOVERY: Head of Customer Platform, "only then can an account be opened",
// and the Accounts lead's "mandates saying which verified customers can operate
// it". No account opens by itself, so what Accounts does when it hears the
// verification is remember it, and `OpenAccount` reads that when a channel asks
// for a product. The reaction is what the subscription names: an operation is
// issued rather than woken (`consumption-by-reactor`, card 98).
const recordVerifiedCustomer = accountServicing.provides(
	"RecordVerifiedCustomer",
	{
		description:
			"Note that a customer has passed KYC, so a product may be opened for them and a mandate may name them",
		type: "operation",
		internal: true,
	},
);
const noteVerification = accountsBC
	.addPolicy("Note a verified customer", {
		description:
			"A verified customer is one Accounts may open a product for; nothing opens by itself",
	})
	.on(customerVerified)
	.issues(recordVerifiedCustomer);
accountServicing.consumes(customerVerified, {
	pattern: "conformist",
	by: [noteVerification],
});

accountsBC.addTerm("Account", {
	definition:
		"A current or savings product held by one or more verified customers",
	embodiedBy: accountAgg,
});
accountsBC.addTerm("Balance", {
	definition:
		"The available balance: posted balance less pending card authorisations. The ledger's balance is the posted one; the contact centre's is whatever the screen shows",
	aliases: ["Available balance"],
	embodiedBy: availableBalance,
});
accountsBC.addTerm("Mandate", {
	definition:
		"A customer's authority to operate an account. Not a card authorisation",
	embodiedBy: mandate,
});

/* =======================
   LEDGER
   DISCOVERY: Core Banking lead. Debits equal credits; one currency; never
   changed once posted; the nightly batch is translated line by line.
   ======================= */

const entryAgg = ledgerBC.addAggregate("JournalEntry", {
	description: "Postings that balance; the whole entry posts or nothing does",
});
const entry = entryAgg.addRootEntity("JournalEntry", {
	description: "One balanced movement of money",
});
const posting = entryAgg.addEntity("Posting", {
	description: "A debit or credit of an amount to one ledger account",
});
// Money and AccountNumber are the Shared Kernel's, borrowed here just as
// Accounts borrows them, rather than a copy of each. A relation may not cross
// a context boundary, so the link is the attribute's `valueobject` and
// nothing else.
const ledgerMoney = kernelMoneyVO;
const ledgerAccountNumberVO = kernelAccountNumberVO;
// A posting goes to a ledger account, not to an Accounts product: a customer's
// account number or a nominal such as the loan book or scheme suspense.
// Otherwise a disbursement (debit loan book, credit customer) could not balance.
const ledgerAccountVO = ledgerBC.addValueObject("LedgerAccount", {
	description:
		"Where a posting lands. No posting lands on a LedgerAccount as such: every one of them is a customer account or a nominal, and the two are named differently",
});
// DISCOVERY: Core Banking lead, "a ledger account is a customer's account
// number or a nominal: the loan book, scheme suspense, fee income". The two
// hold different things, so they are kinds of LedgerAccount rather than one
// value with a `kind` flag beside two fields each set only sometimes
// (decision 22).
const customerLedgerAccountVO = ledgerBC.addValueObject(
	"CustomerLedgerAccount",
	{
		description: "A customer's account, named by its account number",
		specialises: ledgerAccountVO,
	},
);
customerLedgerAccountVO.addAttribute("accountNumber", {
	type: "AccountNumber",
	valueobject: ledgerAccountNumberVO,
});
const nominalLedgerAccountVO = ledgerBC.addValueObject("NominalLedgerAccount", {
	description:
		"An account of the bank's own chart rather than a customer's: the loan book, scheme suspense, fee income",
	specialises: ledgerAccountVO,
});
nominalLedgerAccountVO.addAttribute("nominalCode", {
	type: "string",
	description: "From the chart of accounts, e.g. LOAN-BOOK, SCHEME-SUSPENSE",
});
const directionVO = ledgerBC.addValueObject("PostingDirection", {
	description: "debit or credit",
});
directionVO.addAttribute("value", { type: "'debit' | 'credit'" });
const valueDateVO = ledgerBC.addValueObject("ValueDate", {
	description:
		"The date the money counts from, which may differ from the posting date",
});
valueDateVO.addAttribute("value", { type: "date" });
entry.addAttribute("entryId", { type: "string", identity: true });
entry.addAttribute("postedAt", { type: "date-time" });
entry.addAttribute("reversalOf", {
	type: "string",
	optional: true,
	description: "The entry this one reverses, if any",
});
posting.addAttribute("postingId", { type: "string", identity: true });
posting.addAttribute("ledgerAccount", {
	type: "LedgerAccount",
	valueobject: ledgerAccountVO,
});
posting.addAttribute("amount", { type: "Money", valueobject: ledgerMoney });
posting.addAttribute("direction", {
	type: "PostingDirection",
	valueobject: directionVO,
});
entry.includes(posting, "made-of", "1..*");
entry.addAttribute("valueDate", {
	type: "ValueDate",
	valueobject: valueDateVO,
});
entry.uses(valueDateVO, "valued-on", "1");
posting.uses(directionVO, "as", "1");
posting.uses(ledgerAccountVO, "to", "1");

entryAgg
	.addInvariant("EntryBalances", {
		description:
			"The debits of an entry equal its credits, or it does not post",
	})
	.constrains(posting);
entryAgg
	.addInvariant("AtLeastTwoPostings", {
		description: "An entry has at least two postings",
	})
	.constrains(entry);
entryAgg
	.addInvariant("SingleCurrencyPerEntry", {
		description: "Every posting in an entry shares one currency",
	})
	// Money itself is the Shared Kernel's, held here over that relationship;
	// the rule belongs to the posting amount inside this aggregate.
	.constrains(posting.attributes.get("amount") as Attribute);
entryAgg
	.addInvariant("ImmutableOncePosted", {
		description:
			"A posted entry is never changed; it is reversed by another entry",
	})
	.constrains(entry);

// One shape inside two payloads: the request and the fact carry the same
// posting line, so it is a schema of its own rather than a type string
// written out twice.
const postingLineSchema = ledgerBC.addSchema("PostingLine", {
	description: "One side of a double entry, as a payload carries it",
});
postingLineSchema.addAttribute("ledgerAccount", { type: "string" });
postingLineSchema.addAttribute("amount", { type: "Money" });
postingLineSchema.addAttribute("direction", { type: "'debit' | 'credit'" });

const postEntrySchema = ledgerBC.addSchema("PostEntry", {
	description: "The postings a caller wants made, as one balanced entry",
});
postEntrySchema.addAttribute("postings", {
	type: "PostingLine[]",
	schema: postingLineSchema,
});
postEntrySchema.addAttribute("valueDate", {
	type: "ValueDate",
	valueobject: valueDateVO,
});
const entryPostedSchema = ledgerBC.addSchema("EntryPosted");
entryPostedSchema.addAttribute("entryId", { type: "string", identity: true });
entryPostedSchema.addAttribute("postings", {
	type: "PostingLine[]",
	schema: postingLineSchema,
});

const entryPosted = entryAgg.provides("EntryPosted", {
	description: "Money moved; balances and reports follow",
	type: "event",
	pattern: "published-language",
	schema: entryPostedSchema,
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const ledgerApp = ledgerBC.addService("LedgerApp", {
	description:
		"The ledger's application service: the documented posting API every other context uses",
	type: "application",
});
const postEntry = ledgerApp
	.provides("PostEntry", {
		description: "Post a balanced entry",
		type: "operation",
		pattern: "open-host-service",
		schema: postEntrySchema,
	})
	.raises(entryPosted);
ledgerApp
	.provides("ReverseEntry", {
		description: "Post the opposite entry against an earlier one",
		type: "operation",
		pattern: "open-host-service",
		schema: postEntrySchema,
	})
	.raises(entryPosted);
const importBatch = entryAgg
	.provides("ImportBatchPostings", {
		description: "Translate each line of Sovereign's batch file into an entry",
		type: "operation",
		internal: true,
	})
	.raises(entryPosted);

ledgerBC.addTerm("Posting", {
	definition: "One side of a movement: a debit or credit to one ledger account",
	embodiedBy: posting,
});
// "Account" means something different here from the Accounts platform's product.
ledgerBC.addTerm("Account", {
	definition:
		"A ledger account: a customer's account number or a nominal such as the loan book or scheme suspense. Not the Accounts platform's product, which is one kind of it",
	aliases: ["Ledger account", "Nominal"],
	embodiedBy: ledgerAccountVO,
});
ledgerBC.addTerm("Posted balance", {
	definition:
		"The sum of postings to an account. What the ledger means by balance; Accounts subtracts holds from it to get the available one",
	aliases: ["Balance"],
	embodiedBy: posting,
});
ledgerBC.addTerm("Entry", {
	definition:
		"A balanced set of postings. Lending calls the disbursement one a drawdown",
	aliases: ["Journal"],
	embodiedBy: entryAgg,
});
ledgerBC.addTerm("Value date", {
	definition:
		"The date money counts from, which may differ from when it was posted",
	embodiedBy: valueDateVO,
});

// Shared kernel: same library, so Accounts takes ledger events as published.
accountServicing.consumes(entryPosted, { pattern: "conformist" });
accountsBC
	.addPolicy("Update balance on posting", {
		description: "Every posting to an account recomputes its available balance",
	})
	.on(entryPosted)
	.issues(updateBalance);

/* =======================
   PAYMENTS HUB
   DISCOVERY: Payments Hub lead. Payer is not payee; positive; daily limit;
   cut-off; flagged is never submitted; the scheme's format exactly.
   ======================= */

const instructionAgg = paymentsBC.addAggregate("PaymentInstruction", {
	description: "A customer telling the bank to pay a payee an amount on a date",
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
// Money is the Shared Kernel's, borrowed by reference (decision 16's amendment).
const paymentMoney = kernelMoneyVO;
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
instruction.addAttribute("payerAccountId", {
	type: "string",
	identifies: account,
});
const paymentAmount = instruction.addAttribute("amount", {
	type: "Money",
	valueobject: paymentMoney,
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
// crosses the boundary. Money is the Shared Kernel's, so it is typed by
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
		description: "A flagged instruction is rejected; it never reaches a scheme",
	})
	.constrains(paymentStatusVO);

const initiatePaymentSchema = paymentsBC.addSchema("InitiatePayment");
initiatePaymentSchema.addAttribute("payerAccountId", {
	type: "string",
	identifies: account,
});
initiatePaymentSchema.addAttribute("payee", {
	type: "Payee",
	valueobject: payeeVO,
});
initiatePaymentSchema.addAttribute("amount", {
	type: "Money",
	valueobject: paymentMoney,
});
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
instructionRefusedSchema.addAttribute("payerAccountId", {
	type: "string",
	identifies: account,
});
instructionRefusedSchema.addAttribute("remainingToday", {
	type: "Money",
	optional: true,
	valueobject: paymentMoney,
});
const paymentEventSchema = paymentsBC.addSchema("PaymentEvent", {
	description: "Instruction id, amount and payee; shared by the payment events",
});
paymentEventSchema.addAttribute("instructionId", {
	type: "string",
	identity: true,
});
paymentEventSchema.addAttribute("payerAccountId", {
	type: "string",
	identifies: account,
});
paymentEventSchema.addAttribute("amount", {
	type: "Money",
	valueobject: paymentMoney,
});
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
// The funds check is a read of Accounts' documented API, translated: the hub
// keeps its own notion of "covered" rather than Accounts' balance model.
paymentsApp.consumes(getAvailableBalance, {
	pattern: "anti-corruption-layer",
	by: [initiatePayment],
});
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

/* =======================
   SCHEME GATEWAY
   DISCOVERY: Scheme Connectivity lead. ISO 20022; the hub takes the format as it is.
   ======================= */

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
submissionSchema.addAttribute("instructionId", {
	type: "string",
	identity: true,
	identifies: instruction,
});
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
schemeResponseSchema.addAttribute("originalInstructionId", { type: "string" });
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
// below, not awaited by the send itself.
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
schemeAcceptedSchema.addAttribute("instructionId", {
	type: "string",
	identity: true,
	identifies: instruction,
});
schemeAcceptedSchema.addAttribute("schemeRef", { type: "string" });
const schemeDeclinedSchema = schemeBC.addSchema("SchemeDeclined", {
	description:
		"The scheme refused: which instruction, and the scheme's status reason passed through untranslated, because you do not negotiate with a scheme",
});
schemeDeclinedSchema.addAttribute("instructionId", {
	type: "string",
	identity: true,
	identifies: instruction,
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
paymentSchemeBC.upstreamOf(schemeBC, {
	description:
		"ISO 20022 as the scheme publishes it; the gateway takes the format as it is and translates at the edge",
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
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
	.on(schemeAccepted, schemeDeclined)
	.issues(sendToScheme, confirmSettlement, rejectPayment, postSettlement)
	.ends(paymentSettled, paymentRejected);
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
// The pair already has its one relationship, declared below where the
// context map is drawn (`paymentsBC.downstreamOf(schemeBC, ...)`): its
// upstream roles already carry `published-language` beside `open-host-
// service`, which is what SchemeAccepted and SchemeDeclined need and what
// SubmitToScheme already had (decision 15's "one relationship per pair and
// direction").

/* =======================
   FRAUD
   DISCOVERY: Financial Crime lead. Synchronous scoring; a flag opens a case;
   a case always has an alert; a score always has reasons.
   ======================= */

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
fraudCase.addAttribute("customerId", { type: "string", identifies: customer });
fraudCase.addAttribute("accountId", { type: "string", identifies: account });
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
scoreTransactionSchema.addAttribute("channel", { type: "'payment' | 'card'" });
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
		description: "Open a case with the flagged transaction as its first alert",
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
const scoreTransaction = fraudApp
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

// Payments waits on the scorer: it calls and holds the instruction until the
// verdict comes back, and what it does then — reject on a flag, submit on a
// clearance — is the process's own business (decisions 15 and 23).
const scoreInstruction = paymentsApp.provides("ScoreInstruction", {
	description:
		"Send an initiated instruction to Fraud for a verdict, through the ACL",
	type: "operation",
	internal: true,
});
paymentsApp.consumes(scoreTransaction, {
	pattern: "anti-corruption-layer",
	by: [scoreInstruction],
});
// The first half of the instruction lifecycle above: scoring, and what the
// verdict does. It is written here because Fraud's shapes are declared in this
// section. The process waits on the answer to the call it made, named by that
// call, which is what "synchronous scoring" means and what it could not say
// before card 92.
instructionLifecycle
	.on(scoreTransaction.returned())
	.issues(scoreInstruction, submitPayment);
// Accounts freezes when a case opens.
accountServicing.consumes(fraudCaseOpened, {
	pattern: "anti-corruption-layer",
});
accountsBC
	.addPolicy("Freeze on fraud case", {
		description: "An opened case freezes the account the same second",
	})
	.on(fraudCaseOpened)
	.issues(freezeAccount);

/* =======================
   CARDS
   DISCOVERY: Cards Team lead. Tokenised PAN passing Luhn; nothing on a
   blocked or expired card; within available balance; CardCo's format translated.
   ======================= */

const cardAgg = cardsBC.addAggregate("Card", {
	description:
		"An issued card and its authorisations; the checks on a card need both",
});
const card = cardAgg.addRootEntity("Card", {
	description: "One physical or virtual card on one account",
});
const cardAuthorisation = cardAgg.addEntity("Authorisation", {
	description:
		"A merchant's approved request to take an amount; an entity because it is later captured or expires",
});
const panVO = cardsBC.addValueObject("PAN", {
	description:
		"The card number, held as a token plus last four; the full number passes Luhn",
});
panVO.addAttribute("token", { type: "string" });
panVO.addAttribute("lastFour", { type: "string" });
// A construction rule, and so the value's own: the stored value is a token and
// four digits, on which Luhn cannot be run, so the check happens once, before
// tokenisation, and a value that failed it is never made at all. It names the
// value rather than either attribute, because the number it checked is neither
// of them (decision 27's 2026-09-08 amendment).
panVO
	.addInvariant("PanLuhnValid", {
		description:
			"A PAN value is only ever created from a full number that passed the Luhn check; the token and last four are never re-checked because they cannot be",
	})
	.constrains(panVO);
const expiryVO = cardsBC.addValueObject("Expiry", {
	description: "Month and year after which nothing authorises",
});
expiryVO.addAttribute("month", { type: "int 1..12" });
expiryVO.addAttribute("year", { type: "int" });
const cardStatusVO = cardsBC.addValueObject("CardStatus", {
	description: "active, blocked, expired",
});
cardStatusVO.addAttribute("value", {
	type: "'active' | 'blocked' | 'expired'",
});
// Money is the Shared Kernel's, borrowed by reference (decision 16's amendment).
const cardMoney = kernelMoneyVO;
card.addAttribute("cardId", { type: "string", identity: true });
card.addAttribute("accountId", { type: "string", identifies: account });
card.addAttribute("pan", { type: "PAN", valueobject: panVO });
card.addAttribute("expiry", { type: "Expiry", valueobject: expiryVO });
card.addAttribute("status", { type: "CardStatus", valueobject: cardStatusVO });
cardAuthorisation.addAttribute("authorisationId", {
	type: "string",
	identity: true,
});
// CardCo's own reference for the same authorisation, quoted back on every
// message. CardCo is a system the bank does not model inside, so the id names
// the processor rather than an entity of theirs (decision 28, card 81).
cardAuthorisation.addAttribute("cardCoRef", {
	type: "string",
	identifies: cardCoBC,
});
cardAuthorisation.addAttribute("merchant", { type: "string" });
cardAuthorisation.addAttribute("amount", {
	type: "Money",
	valueobject: cardMoney,
});
cardAuthorisation.addAttribute("at", { type: "date-time" });
card.includes(cardAuthorisation, "authorised", "*");
card.uses(panVO, "numbered", "1");
card.uses(expiryVO, "expires", "1");
card.uses(cardStatusVO, "has-status", "1");
// Account lives in Accounts: `accountId` above is the only thing that crosses
// the boundary. Money is the Shared Kernel's, so it is typed by
// `valueobject` reference only, with no `uses` relation to cross with it.

cardAgg
	.addInvariant("NoAuthOnBlockedCard", {
		description: "A blocked card authorises nothing",
	})
	.constrains(cardStatusVO, cardAuthorisation);
cardAgg
	.addInvariant("ExpiredCardNoAuth", {
		description: "Past expiry, nothing authorises",
	})
	.constrains(expiryVO, cardAuthorisation);
// The balance lives in Accounts, so this is a check at authorisation time
// through the ACL (GetAvailableBalance), not a rule Cards can hold on its own.
// The operation that makes the check is AuthoriseCard on CardsApp, so the
// invariant is declared further down where that operation exists and names it
// (decision 19, amended; card 90).

// DISCOVERY: Cards Team lead. "CardCo sends us the authorisation request in
// their format and we translate it." CardCo dictates the language, so it is
// upstream however much of the traffic runs the other way, and the shape at
// the boundary is CardCo's own with the translation behind it (decision 03,
// 2026-09-09). It is declared here because AuthoriseCard below carries it.
const cardCoMessageSchema = cardCoBC.addSchema("CardCoAuthorisationMessage", {
	description: "CardCo's wire format, as it arrives",
});
cardCoMessageSchema.addAttribute("panToken", { type: "string" });
cardCoMessageSchema.addAttribute("merchant", { type: "string" });
cardCoMessageSchema.addAttribute("amountMinorUnits", { type: "int64" });
cardCoMessageSchema.addAttribute("currency", { type: "ISO 4217 code" });
const cardEventSchema = cardsBC.addSchema("CardEvent", {
	description: "Card and account; shared by the card events",
});
cardEventSchema.addAttribute("cardId", { type: "string", identity: true });
cardEventSchema.addAttribute("accountId", {
	type: "string",
	identifies: account,
});
const cardAuthorisedSchema = cardsBC.addSchema("CardAuthorised", {
	description:
		"Card, account and the authorised amount; Accounts needs the amount to place the hold",
});
cardAuthorisedSchema.addAttribute("cardId", { type: "string", identity: true });
cardAuthorisedSchema.addAttribute("accountId", {
	type: "string",
	identifies: account,
});
cardAuthorisedSchema.addAttribute("authorisationId", {
	type: "string",
	identifies: cardAuthorisation,
});
cardAuthorisedSchema.addAttribute("amount", {
	type: "Money",
	valueobject: cardMoney,
});

const cardAuthorised = cardAgg.provides("CardAuthorised", {
	description:
		"A merchant's request was approved; Accounts holds the amount and Fraud monitors",
	type: "event",
	pattern: "published-language",
	schema: cardAuthorisedSchema,
});
const cardBlocked = cardAgg.provides("CardBlocked", {
	description: "The card authorises nothing until unblocked",
	type: "event",
	pattern: "published-language",
	schema: cardEventSchema,
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const cardsApp = cardsBC.addService("CardsApp", {
	description:
		"Cards' application service: the boundary CardCo authorises against and channels block cards through",
	type: "application",
});
// DISCOVERY: Cards Team lead. "CardCo sends us the authorisation request in
// their format and we translate it", and Cards answers in the same terms:
// CardCo waits on the call, and what comes back is an approval or a decline.
// The model said the operation approved or declined and named neither answer,
// so the decline -- the outcome three of Cards' own rules produce -- existed
// nowhere (decisions 13 and 25; card 95).
const cardApprovalSchema = cardsBC.addSchema("CardAuthorisationApproved", {
	description:
		"What CardCo is answered with when the request is approved: the authorisation and the amount now held",
});
cardApprovalSchema.addAttribute("authorisationId", {
	type: "string",
	identity: true,
	identifies: cardAuthorisation,
});
cardApprovalSchema.addAttribute("amount", {
	type: "Money",
	valueobject: cardMoney,
});
const cardDeclineSchema = cardsBC.addSchema("CardAuthorisationDeclined", {
	description:
		"Why the request was declined: the card is blocked, the card has expired, or the available balance does not cover it. No authorisation exists, so there is no card event to raise",
});
cardDeclineSchema.addAttribute("cardId", { type: "string", identifies: card });
cardDeclineSchema.addAttribute("reason", {
	type: "'blocked' | 'expired' | 'insufficient-funds'",
});
// The call CardCo makes, in CardCo's own words. Until card 98 the model
// inverted it -- CardCo published an `AuthorisationRequested` event that Cards
// consumed -- because `schema-context` refused a consumable carrying another
// context's schema, so the truthful shape was unwritable and nothing consumed
// AuthoriseCard at all. Upstream is who dictates the model, not who provides
// the consumable: the bank offers the operation and translates the caller's
// format behind an anti-corruption layer, and that is what the one
// relationship below says.
const authoriseCard = cardsApp
	.provides("AuthoriseCard", {
		description:
			"Approve or decline a merchant's request from CardCo, in the message CardCo sends; the caller waits, and is answered with the authorisation or with the rule that stopped it",
		type: "operation",
		pattern: "open-host-service",
		schema: cardCoMessageSchema,
		returns: cardApprovalSchema,
		rejects: [cardDeclineSchema],
	})
	.raises(cardAuthorised);
const cardCoFeed = cardCoBC.addService("CardCo Authorisation Feed", {
	description:
		"The processor's authorisation side, and all the bank can see of it: it takes the merchant's request and calls the issuer",
	type: "application",
});
// What the bank sees of CardCo is the call arriving, and nothing else about
// the processor is ours to state (decision 28): a merchant asking CardCo to
// take an amount, and CardCo in turn asking the issuer, are steps inside
// somebody else's machine. `RequestAuthorisation` named that inside step so
// the consumption below had an operation to put in `by`, which is the model
// inventing CardCo's own vocabulary for it. The feed provides nothing, so
// nothing names the caller: a consumption with no `by` is what a consumer
// with no operations of its own looks like (card 105).
cardCoFeed.consumes(authoriseCard, {});
// No downstream role on the consumption: CardCo is the upstream here, and a
// consumption carries only a downstream one. Card 98 wrote "conformist" to
// quieten `role-coherence`, which read the roles from the call rather than
// from the relationship, and it said the opposite of the truth -- a conformist
// takes the other side's model as it stands, and CardCo is the side whose
// model is taken. The rule now reads the declared direction and asks nothing
// of either end here (decision 03, note of 2026-09-09; card 99).
// One relationship, not two. Card 98 declared a second, `cardsBC.upstreamOf(
// cardCoBC)`, because `relationship-declared` was satisfied only by an arrow
// pointing the way the call ran, so the truthful relationship did not answer
// it. The direction is the author's strategic claim about who dictates the
// model, and either arrow answers the question a crossing raises, so the
// second one -- which said the processor conforms to the bank -- comes out.
cardCoBC.upstreamOf(cardsBC, {
	description:
		"CardCo's format is CardCo's: it dictates the message every authorisation arrives in, and Cards translates it at its own boundary rather than adopting it. The bank provides the operation and offers it as an open host; who provides is not who is upstream",
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
const blockCard = cardsApp
	.provides("BlockCard", {
		description:
			"Block a card; issued by fraud or by a customer through a channel",
		type: "operation",
		pattern: "open-host-service",
		schema: cardEventSchema,
	})
	.raises(cardBlocked);
cardAgg.provides("IssueCard", {
	description: "Issue a card on an account",
	type: "operation",
	internal: true,
});

cardsApp.consumes(getAvailableBalance, {
	pattern: "anti-corruption-layer",
	by: [authoriseCard],
});
// A guarantee about the answer, not a check on the way in: AuthoriseCard's
// approval carries the amount now held, and what the rule promises is that
// figure, not the request. FundsAvailableAtInitiation reads the same balance
// but InitiatePayment returns nothing, so there is no answer to promise
// anything about and the rule stays a precondition there; here the operation
// answers with the amount it approved, so the rule is a postcondition on it
// (decision 19, third amendment; card 101).
cardAgg
	.addInvariant("AuthWithinAvailableBalance", {
		description:
			"Every authorisation AuthoriseCard approves carries an amount within the available balance AccountServicing reported at that moment. The balance moves next door the second after, so the promise is about the moment the answer was given, not about the balance since (card 94)",
		postcondition: true,
	})
	.constrains(cardApprovalSchema.attributes.get("amount")!, authoriseCard);
cardsApp.consumes(scoreTransaction, {
	pattern: "anti-corruption-layer",
	by: [authoriseCard],
});
cardsApp.consumes(transactionFlagged, { pattern: "anti-corruption-layer" });
cardsBC
	.addPolicy("Block on flagged card transaction", {
		description: "A flag on a card-channel transaction blocks the card",
	})
	.on(transactionFlagged)
	.issues(blockCard);
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
	.on(cardAuthorised)
	.issues(recordAuthorisation);
fraudApp.consumes(cardAuthorised, {
	pattern: "anti-corruption-layer",
	by: [fileCardAuthorisation],
});
// DISCOVERY: Accounts Team lead. "Our balance is ledger balance less pending
// card authorisations": Accounts must hear every authorisation to hold it.
accountServicing.consumes(cardAuthorised, { pattern: "anti-corruption-layer" });
accountsBC
	.addPolicy("Hold on card authorisation", {
		description:
			"Every approved authorisation places a hold on its account the same second, so the available balance is what the merchant has not yet captured",
	})
	.on(cardAuthorised)
	.issues(placeHold);

cardsBC.addTerm("PAN", {
	definition: "The card number; held as a token and the last four digits",
	embodiedBy: panVO,
});
cardsBC.addTerm("Authorisation", {
	definition: "A merchant's approved request to take an amount. Not a mandate",
	embodiedBy: cardAuthorisation,
});
cardsBC.addTerm("Payment", {
	definition:
		"A card transaction. The Payments Hub's payment is an instruction to a payee",
	embodiedBy: cardAuthorisation,
});

/* =======================
   LENDING
   DISCOVERY: Head of Lending. One open application; nothing before signature;
   APR within cap; installments sum to principal plus interest; arrears on a miss.
   ======================= */

const applicationAgg = lendingBC.addAggregate("LoanApplication", {
	description:
		"A customer asking for an amount over a term, and the decision on it",
});
const application = applicationAgg.addRootEntity("LoanApplication", {
	description: "One request for credit",
});
// Money is the Shared Kernel's, borrowed by reference (decision 16's amendment).
const applicationMoney = kernelMoneyVO;
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
application.addAttribute("customerId", {
	type: "string",
	identifies: customer,
});
application.addAttribute("requested", {
	type: "Money",
	valueobject: applicationMoney,
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
// crosses the boundary. Money is the Shared Kernel's, so it is typed by
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
// Lending's Money is the Shared Kernel's, borrowed with the application above.
const loanMoney = applicationMoney;
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
loan.addAttribute("accountId", {
	type: "string",
	description:
		"Identity of the Account the loan is disbursed to, in Accounts; only the id crosses the boundary",
	identifies: account,
});
loan.addAttribute("principal", { type: "Money", valueobject: loanMoney });
loan.addAttribute("apr", { type: "InterestRate", valueobject: aprVO });
loan.addAttribute("status", { type: "LoanStatus", valueobject: loanStatusVO });
schedule.addAttribute("scheduleId", { type: "string", identity: true });
installment.addAttribute("dueOn", { type: "date", identity: true });
installment.addAttribute("amount", { type: "Money", valueobject: loanMoney });
installment.addAttribute("paid", { type: "boolean" });
loan.includes(schedule, "repaid-under", "1");
schedule.includes(installment, "due", "1..*");
loan.uses(aprVO, "charged-at", "1");
loan.uses(loanStatusVO, "has-status", "1");
loan.references(application, "from-application", "1");
// The account the loan is disbursed to lives in Accounts: `accountId` above is
// the only thing that crosses the boundary. The application it came from is in
// Lending too, so that one stays a relation. Money is the Shared Kernel's, so
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

const applicationSubmittedSchema = lendingBC.addSchema("ApplicationSubmitted", {
	description: "What decisioning receives",
});
applicationSubmittedSchema.addAttribute("applicationId", {
	type: "string",
	identity: true,
});
applicationSubmittedSchema.addAttribute("customerId", {
	type: "string",
	identifies: customer,
});
applicationSubmittedSchema.addAttribute("requested", {
	type: "Money",
	valueobject: applicationMoney,
});
applicationSubmittedSchema.addAttribute("term", {
	type: "Term",
	valueobject: termVO,
});
const loanEventSchema = lendingBC.addSchema("LoanEvent", {
	description: "Loan, account and amount; shared by the loan events",
});
loanEventSchema.addAttribute("loanId", { type: "string", identity: true });
loanEventSchema.addAttribute("accountId", {
	type: "string",
	identifies: account,
});
loanEventSchema.addAttribute("amount", {
	type: "Money",
	valueobject: loanMoney,
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
lendingApp.consumes(postEntry, {
	pattern: "anti-corruption-layer",
	by: [postDisbursement],
});
lendingBC
	.addPolicy("Post disbursement", {
		description:
			"Disbursement is a ledger entry: debit loan book, credit the account",
	})
	.on(loanDisbursed)
	.issues(postDisbursement);
lendingApp.consumes(getCustomer, {
	pattern: "anti-corruption-layer",
	by: [submitApplication],
});

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

/* =======================
   CREDIT DECISIONING
   DISCOVERY: Head of Credit Risk. Bureau report no older than thirty days;
   affordability at most forty-five percent; every decision carries reasons.
   ======================= */

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
creditDecision.addAttribute("applicationId", {
	type: "string",
	identifies: application,
});
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
decisionRequestSchema.addAttribute("applicationId", {
	type: "string",
	identity: true,
	identifies: application,
});
decisionRequestSchema.addAttribute("customerId", {
	type: "string",
	identifies: customer,
});
decisionRequestSchema.addAttribute("requestedMinor", { type: "int64" });
decisionRequestSchema.addAttribute("termMonths", { type: "int" });
const decisionMadeSchema = decisioningBC.addSchema("DecisionMade");
decisionMadeSchema.addAttribute("applicationId", {
	type: "string",
	identity: true,
	identifies: application,
});
decisionMadeSchema.addAttribute("outcome", { type: "'approved' | 'declined'" });
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
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const decisioningApp = decisioningBC.addService("DecisioningApp", {
	description:
		"Credit Decisioning's application service: the boundary Lending and the channels ask for a decision through",
	type: "application",
});
const decide = decisioningApp
	.provides("Decide", {
		description: "Pull the bureau, run the scorecard, check affordability",
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
scorecard.provides("ScoreApplication", {
	description: "Run the scorecard over an application and its bureau report",
	type: "operation",
	internal: true,
});
decisioningApp.consumes(getCustomer, {
	pattern: "anti-corruption-layer",
	by: [decide],
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
// Partnership: one planning board, so Lending conforms rather than translates.
// RequestDecision is the one operation of LendingApp that makes the call.
lendingApp.consumes(decide, {
	pattern: "conformist",
	by: [requestDecision],
});
lendingApp.consumes(decisionMade, { pattern: "conformist" });
lendingBC
	.addPolicy("Decide on submission", {
		description: "Every submitted application is sent for a decision",
	})
	.on(applicationSubmitted)
	.issues(requestDecision);
lendingBC
	.addPolicy("Record decision", {
		description: "The outcome and reasons are stored on the application",
	})
	.on(decisionMade)
	.issues(recordDecision);

decisioningBC.addTerm("Scorecard", {
	definition: "The bank's own credit model",
	embodiedBy: scorecard,
});
decisioningBC.addTerm("Decline reason", {
	definition: "A code the customer is entitled to see when refused",
	embodiedBy: creditScoreVO,
});

/* =======================
   REGULATORY REPORTING
   DISCOVERY: Finance Systems lead. Lines reconcile to the ledger; period closed
   before filing; filed once; events taken as published.
   ======================= */

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
// Money is the Shared Kernel's, borrowed by reference (decision 16's amendment).
const reportMoney = kernelMoneyVO;
regReturn.addAttribute("returnId", { type: "string", identity: true });
regReturn.addAttribute("reportCode", { type: "string" });
regReturn.addAttribute("filedAt", { type: "date-time" });
reportLine.addAttribute("lineCode", { type: "string", identity: true });
reportLine.addAttribute("amount", { type: "Money", valueobject: reportMoney });
regReturn.includes(reportLine, "made-of", "1..*");
regReturn.addAttribute("period", {
	type: "ReportingPeriod",
	valueobject: periodVO,
});
regReturn.uses(periodVO, "for-period", "1");
// Money is the Shared Kernel's, so it is typed by `valueobject` reference
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
reportingApp.consumes(entryPosted, { pattern: "conformist" });
reportingApp.consumes(accountOpened, { pattern: "conformist" });
reportingApp.consumes(loanDisbursed, { pattern: "conformist" });
const accumulateOnPosting = reportingBC
	.addPolicy("Accumulate on posting", {
		description:
			"Ledger postings, account openings and disbursements each add to a line as they happen, and Sovereign's nightly batch adds the savings movements",
	})
	.on(entryPosted, accountOpened, loanDisbursed)
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

/* =======================
   BRANCH & CONTACT CENTRE
   DISCOVERY: Channels lead. Authenticate before acting; notes never edited;
   suppress marketing the same day; the quick-quote button.
   ======================= */

const requestAgg = channelsBC.addAggregate("ServiceRequest", {
	description: "A customer asking for something through a channel, with notes",
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
request.addAttribute("customerId", { type: "string", identifies: customer });
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
channelsApp.consumes(blockCard, { pattern: "conformist", by: [raiseRequest] });
channelsApp.consumes(consentWithdrawn, { pattern: "conformist" });
// DELIBERATE (separate-ways): the quick-quote button. Front-line staff may
// not influence a credit decision, and the relationship below says so; this
// consumption contradicts it.
channelsApp.consumes(decide, {
	pattern: "anti-corruption-layer",
	by: [raiseRequest],
});
channelsBC
	.addPolicy("Suppress marketing on withdrawal", {
		description:
			"A withdrawn marketing consent stops outbound contact the same day; the fix for the fine",
	})
	.on(consentWithdrawn)
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

/* =======================
   SOVEREIGN CORE (legacy)
   ======================= */

const savingsRecordAgg = sovereignBC.addAggregate("SavingsAccountRecord", {
	description:
		"The mainframe's savings account row, as far as anyone can read it",
});
const savingsRecord = savingsRecordAgg.addRootEntity("SavingsAccountRecord", {
	description: "One savings account on Sovereign",
});
savingsRecord.addAttribute("accountNo", { type: "string", identity: true });
savingsRecord.addAttribute("productCode", { type: "string" });

const batchSchema = sovereignBC.addSchema("NightlyBatchCompleted", {
	description: "The batch file's header: date and the postings file location",
});
batchSchema.addAttribute("batchDate", { type: "date", identity: true });
batchSchema.addAttribute("postingsFile", { type: "string" });
const nightlyBatchCompleted = savingsRecordAgg.provides(
	"NightlyBatchCompleted",
	{
		description: "The day's savings movements are in the batch file",
		type: "event",
		pattern: "published-language",
		schema: batchSchema,
	},
);

// DISCOVERY: Core Banking lead, "runs the nightly batch". Card 81 turned that
// into a NightlyBatch service with a RunNightlyBatch operation so the event had
// a raiser, and nobody at NorthBank could have told you that: what the lead
// knows is that the file appears each night, not which of Sovereign's programs
// cuts it. A big ball of mud says what it emits without saying how, and
// `event-unraised` no longer asks it to (decision 28, second amendment; card
// 90). The service and its operation are gone.

ledgerApp.consumes(nightlyBatchCompleted, { pattern: "anti-corruption-layer" });
ledgerBC
	.addPolicy("Import nightly batch", {
		description: "Each line of the batch file becomes a ledger entry",
	})
	.on(nightlyBatchCompleted)
	.issues(importBatch);
// DISCOVERY: Finance Systems lead, "we accumulate lines from ledger postings,
// account openings and loan disbursements as they happen, and from Sovereign's
// batch for savings". The fourth event was consumed and never reacted to, so
// the model said Reporting depended on the batch and never what it did with it
// (`subscription-backed`, card 92). It is written here because the batch event
// is declared in this section.
reportingApp.consumes(nightlyBatchCompleted, {
	pattern: "anti-corruption-layer",
});
accumulateOnPosting.on(nightlyBatchCompleted);

/* =======================
   IDENTITY & ACCESS
   ======================= */

const credentialAgg = identityBC.addAggregate("Credential", {
	description: "A customer's login",
});
const credential = credentialAgg.addRootEntity("Credential", {
	description: "Username and step-up factors for one customer",
});
// The credential is identified by whose it is, and the Customer root is in
// Customer & KYC: the same id is this entity's identity and a foreign one.
credential.addAttribute("customerId", {
	type: "string",
	identity: true,
	identifies: customer,
});
credential.addAttribute("username", { type: "string" });
credential.addAttribute("stepUpEnrolled", { type: "boolean" });
const customerAuthenticated = credentialAgg.provides("CustomerAuthenticated", {
	description: "A customer proved who they are on a channel",
	type: "event",
	pattern: "published-language",
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const identityApp = identityBC.addService("IdentityApp", {
	description:
		"Identity & Access' application service: the boundary channels authenticate customers through",
	type: "application",
});
const authenticateCustomer = identityApp
	.provides("AuthenticateCustomer", {
		description: "Verify credentials and step-up",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(customerAuthenticated);
channelsApp.consumes(authenticateCustomer, {
	pattern: "conformist",
	by: [raiseRequest],
});

/* =======================
   CONTEXT RELATIONSHIPS
   DISCOVERY section 6.
   ======================= */

customerBC.downstreamOf(sanctionsBC, {
	upstreamRoles: ["open-host-service", "published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
accountsBC.downstreamOf(customerBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
lendingBC.downstreamOf(customerBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
});
decisioningBC.downstreamOf(customerBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
});
channelsBC.downstreamOf(customerBC, {
	upstreamRoles: ["open-host-service", "published-language"],
	downstreamRoles: ["conformist"],
});
paymentsBC.downstreamOf(ledgerBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description:
		"Payments posts through the ledger API and is consulted on changes",
});
lendingBC.downstreamOf(ledgerBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
});
accountsBC.downstreamOf(ledgerBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
	description:
		"Balances follow the ledger: Accounts takes EntryPosted as published, with no translation",
});
paymentsBC.downstreamOf(fraudBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service", "published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Payments waits on the scorer and is consulted on its contract",
});
cardsBC.downstreamOf(fraudBC, {
	type: "customer-supplier",
	upstreamRoles: ["open-host-service", "published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
fraudBC.downstreamOf(cardsBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Post-authorisation monitoring",
});
accountsBC.downstreamOf(fraudBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});
paymentsBC.downstreamOf(schemeBC, {
	upstreamRoles: ["open-host-service", "published-language"],
	downstreamRoles: ["conformist"],
	description: "You don't negotiate with a scheme",
});
cardsBC.downstreamOf(accountsBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "The balance check at authorisation time",
});
accountsBC.downstreamOf(cardsBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Every authorisation becomes a hold on the account",
});
paymentsBC.downstreamOf(accountsBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "The funds check before an instruction exists",
});
channelsBC.downstreamOf(accountsBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
});
channelsBC.downstreamOf(cardsBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
});
channelsBC.downstreamOf(identityBC, {
	upstreamRoles: ["open-host-service"],
	downstreamRoles: ["conformist"],
});
reportingBC.downstreamOf(ledgerBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
reportingBC.downstreamOf(accountsBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
reportingBC.downstreamOf(lendingBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
ledgerBC.downstreamOf(sovereignBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
	description: "Every line of the batch file is translated",
});
reportingBC.downstreamOf(sovereignBC, {
	upstreamRoles: ["published-language"],
	downstreamRoles: ["anti-corruption-layer"],
});

// Four identity-only relationships used to sit here: Lending on Accounts,
// Fraud on Customer & KYC, Fraud on Accounts, Identity & Access on Customer &
// KYC. Each was joined by nothing but an identity attribute naming the other
// context's entity, so neither end played a role, both lists were empty, and
// the description said in words that nothing is exchanged. That is a shape DDD
// does not have, and the model already had the record it needed: the context
// map draws an identity crossing as an implied «id» edge. `relationship-
// declared` no longer asks for a relationship on top of one (decision 14's
// amendment of 2026-09-09; card 100), and the four are gone. The dependencies
// are not: they read on the map, from the attributes that hold them.
//
// Scheme Gateway had been dropped from that list earlier, for the instruction
// id its SchemeSubmission and SchemeSettlement payloads carry. An id echoed in
// a payload is not a dependency at all: the gateway writes the instruction id
// into the message so that Payments can recognise the answer, and it stores
// nothing and asks Payments for nothing (decision 14, second amendment;
// card 90).

// Shared kernel: six contexts compile against one Money/AccountNumber
// library, so each declares one relationship with the kernel context rather
// than fifteen pairwise agreements among themselves (decision 16's
// amendment). Accounts and Ledger also borrow AccountNumber; the rest borrow
// Money only.
accountsBC.sharesKernelWith(sharedKernelBC, {
	description: "Money and AccountNumber, from @northbank/money",
	comments: [
		{
			text: "Money and AccountNumber live in @northbank/money; every borrowing context compiles against the same version.",
			link: {
				kind: "code",
				url: "https://github.com/example/northbank/blob/main/packages/money/src/Money.ts",
				label: "packages/money/src/Money.ts",
			},
		},
		{
			text: "Kept deliberately tiny: two value objects and their parsers, changed only by agreement of the teams that borrow them.",
			link: {
				kind: "adr",
				url: "https://github.com/example/northbank/blob/main/docs/adr/006-money-kernel.md",
				label: "ADR-006 The money kernel",
			},
		},
	],
});
ledgerBC.sharesKernelWith(sharedKernelBC, {
	description: "Money and AccountNumber, from @northbank/money",
});
paymentsBC.sharesKernelWith(sharedKernelBC, {
	description: "Money, from @northbank/money",
});
cardsBC.sharesKernelWith(sharedKernelBC, {
	description: "Money, from @northbank/money",
});
lendingBC.sharesKernelWith(sharedKernelBC, {
	description: "Money, from @northbank/money",
});
reportingBC.sharesKernelWith(sharedKernelBC, {
	description: "Money, from @northbank/money",
});
// Both contexts that name an account outside the bank's own walls take the
// standard's IBAN as it stands: nobody here negotiates with ISO, and there is
// nothing to consume — what the body publishes is the shape (decision 28's
// amendment of 2026-09-09).
isoBC.upstreamOf(accountsBC, {
	description:
		"Accounts holds the IBAN of every current account and takes ISO 13616's definition of it, checksum and all",
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
isoBC.upstreamOf(paymentsBC, {
	description:
		"A payee is named by an IBAN, in the standard's form; the hub validates it before an instruction exists",
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
// Partnership: one planning board, joint releases, no translation.
lendingBC.partnerOf(decisioningBC, {
	description:
		"Origination and decisioning release together; a scorecard change is an application-form change",
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
