import {
	type Attribute,
	type BoundedContext,
	Workspace,
} from "@open-domain-specification/core";

/**
 * NorthBank's Money, declared once in each context that carries an amount:
 * a value object belongs to the context's language, and every aggregate in
 * that context holds the same one. Accounts' Money is the shared kernel's,
 * and Ledger holds that one rather than a copy.
 */
const money = (boundedcontext: BoundedContext) => {
	const vo = boundedcontext.addValueObject("Money", {
		description:
			"Minor units and an ISO 4217 code. Never a float; the shared kernel library is the one implementation",
	});
	vo.addAttribute("amountMinor", { type: "int64" });
	vo.addAttribute("currency", { type: "ISO 4217 code" });
	return vo;
};

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
 * a balanced journal entry, a loan schedule. Stress-test features: fourteen
 * contexts, a shared kernel (accounts and ledger), a partnership (lending and
 * decisioning), a separate-ways pair (branches and decisioning), a legacy
 * mainframe big ball of mud, and three deliberate mistakes (marked
 * DELIBERATE) that trigger separate-ways, context-serves-subdomain and
 * consumable-kind.
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
	description:
		"The account platform; co-owns the Money library with Core Banking",
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
consentSchema.addAttribute("customerId", { type: "string" });
consentSchema.addAttribute("purpose", {
	type: "ConsentPurpose",
	valueobject: purposeVO,
});

const onboardingStarted = customerAgg.provides("OnboardingStarted", {
	description: "A prospective customer gave their details",
	type: "event",
	internal: true,
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
customerAgg
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
onboardingApp
	.provides("StartOnboarding", {
		description: "Begin with name, date of birth, address and a document",
		type: "operation",
		pattern: "open-host-service",
	})
	.raises(onboardingStarted);
const getCustomer = onboardingApp.provides("GetCustomer", {
	description:
		"Asked with a CustomerRef, answers with the customer's verified details",
	type: "operation",
	pattern: "open-host-service",
	schema: customerRefSchema,
	returns: customerDetailsSchema,
});

const kycScreening = customerBC.addService("KycScreening", {
	description:
		"Runs sanctions and document checks; a domain service because it spans the customer and the screening result",
	type: "domain",
});
const screenCustomer = kycScreening.provides("ScreenCustomer", {
	description: "Screen the prospective customer against sanctions lists",
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
screening.addAttribute("partyName", { type: "string" });
screening.addAttribute("score", {
	type: "MatchScore",
	valueobject: matchScoreVO,
});
screening.uses(matchScoreVO, "scored", "1");

const screenPartySchema = sanctionsBC.addSchema("ScreenParty");
screenPartySchema.addAttribute("name", { type: "string" });
screenPartySchema.addAttribute("dateOfBirth", { type: "date" });
screenPartySchema.addAttribute("country", { type: "ISO 3166 code" });
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
const screenParty = screeningApp
	.provides("ScreenParty", {
		description: "Check a name, date of birth and country against the lists",
		type: "operation",
		pattern: "open-host-service",
		schema: screenPartySchema,
	})
	.raises(partyMatched);

kycScreening.consumes(screenParty, { pattern: "anti-corruption-layer" });
customerAgg.consumes(partyMatched, { pattern: "anti-corruption-layer" });
customerBC
	.addPolicy("Screen on onboarding", {
		description: "Every prospective customer is screened before anything else",
	})
	.on(onboardingStarted)
	.then(screenCustomer);
customerBC
	.addPolicy("Hold on sanctions match", {
		description: "A match holds onboarding until Financial Crime clears it",
	})
	.on(partyMatched)
	.then(holdOnboarding);

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
const ibanVO = accountsBC.addValueObject("IBAN", {
	description:
		"Country, check digits, bank and account identifiers; valid only if the mod-97 checksum holds",
});
ibanVO.addAttribute("value", { type: "string (ISO 13616)" });
const accountNumberVO = accountsBC.addValueObject("AccountNumber", {
	description:
		"Sort code and eight-digit number; part of the shared kernel library",
});
accountNumberVO.addAttribute("sortCode", { type: "string" });
accountNumberVO.addAttribute("number", { type: "string" });
const accountMoney = money(accountsBC);
const overdraftVO = accountsBC.addValueObject("OverdraftLimit", {
	description: "How far below zero the available balance may go",
});
overdraftVO.addAttribute("limit", { type: "Money", valueobject: accountMoney });
overdraftVO.uses(accountMoney, "limited-to", "1");
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
account.uses(ibanVO, "identified-by", "1");
account.uses(accountNumberVO, "numbered", "1");
account.uses(accountMoney, "balance", "1");
account.uses(overdraftVO, "overdraft", "1");
account.uses(accountStatusVO, "has-status", "1");
// Customer lives in Customer & KYC: a relation never crosses a bounded
// context, so the mandate holds `customerId` and nothing more.

accountAgg
	.addInvariant("IbanChecksumValid", {
		description:
			"The IBAN's mod-97 checksum holds, or the account does not exist",
	})
	.constrains(ibanVO);
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
const accountOpenedSchema = accountsBC.addSchema("AccountOpened", {
	description: "What reporting and the ledger learn about a new account",
});
accountOpenedSchema.addAttribute("accountId", {
	type: "string",
	identity: true,
});
accountOpenedSchema.addAttribute("iban", { type: "IBAN", valueobject: ibanVO });
accountOpenedSchema.addAttribute("customerId", { type: "string" });
accountOpenedSchema.addAttribute("productCode", { type: "'current'" });
const openAccountSchema = accountsBC.addSchema("OpenAccount");
openAccountSchema.addAttribute("customerId", { type: "string" });
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

accountAgg.consumes(customerVerified, { pattern: "conformist" });

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
// Money and AccountNumber are the shared kernel Accounts and Ledger keep
// between them, so the ledger holds Accounts' own value objects rather than a
// copy of each. A relation may not cross a context boundary, so the link is
// the attribute's `valueobject` and nothing else.
const ledgerMoney = accountMoney;
const ledgerAccountNumberVO = accountNumberVO;
// A posting goes to a ledger account, not to an Accounts product: a customer's
// account number or a nominal such as the loan book or scheme suspense.
// Otherwise a disbursement (debit loan book, credit customer) could not balance.
const ledgerAccountVO = ledgerBC.addValueObject("LedgerAccount", {
	description:
		"Where a posting lands: a customer account by its AccountNumber, or a nominal from the chart of accounts (loan book, scheme suspense, fee income)",
});
ledgerAccountVO.addAttribute("kind", { type: "'customer' | 'nominal'" });
ledgerAccountVO.addAttribute("accountNumber", {
	type: "AccountNumber",
	valueobject: ledgerAccountNumberVO,
	description: "Set when kind is customer",
});
ledgerAccountVO.addAttribute("nominalCode", {
	type: "string",
	description: "Set when kind is nominal, e.g. LOAN-BOOK, SCHEME-SUSPENSE",
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
	// Money itself is Accounts', held here over the shared kernel; the rule
	// belongs to the posting amount inside this aggregate.
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
accountAgg.consumes(entryPosted, { pattern: "conformist" });
accountsBC
	.addPolicy("Update balance on posting", {
		description: "Every posting to an account recomputes its available balance",
	})
	.on(entryPosted)
	.then(updateBalance);

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
payeeVO.addAttribute("iban", { type: "string (ISO 13616)" });
const paymentMoney = money(paymentsBC);
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
instruction.uses(paymentMoney, "of", "1");
instruction.uses(executionDateVO, "on", "1");
instruction.uses(paymentStatusVO, "has-status", "1");
// Account lives in Accounts: `payerAccountId` above is the only thing that
// crosses the boundary.

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
// A rule across instructions, not inside one: the hub checks it when it
// creates the instruction, over the account's instructions for the day.
instructionAgg
	.addInvariant("DailyLimit", {
		description:
			"Instructions from one account never exceed the daily limit in total; checked at initiation over the day's instructions for the payer account, since no single instruction can know the others",
	})
	.constrains(paymentAmount);
// DISCOVERY: Payments Hub lead. "The account has to cover it."
instructionAgg
	.addInvariant("FundsAvailableAtInitiation", {
		description:
			"An instruction is created only if the payer's available balance, read through AccountServicing, covers the amount; the overdraft itself is Accounts' rule at posting",
	})
	.constrains(paymentAmount);
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
initiatePaymentSchema.addAttribute("payerAccountId", { type: "string" });
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
const paymentEventSchema = paymentsBC.addSchema("PaymentEvent", {
	description: "Instruction id, amount and payee; shared by the payment events",
});
paymentEventSchema.addAttribute("instructionId", {
	type: "string",
	identity: true,
});
paymentEventSchema.addAttribute("payerAccountId", { type: "string" });
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
paymentsApp
	.provides("InitiatePayment", {
		description:
			"Create an instruction from a channel, once AccountServicing confirms the available balance covers it and the daily limit holds",
		type: "operation",
		pattern: "open-host-service",
		schema: initiatePaymentSchema,
	})
	.raises(paymentInitiated);
// The funds check is a read of Accounts' documented API, translated: the hub
// keeps its own notion of "covered" rather than Accounts' balance model.
instructionAgg.consumes(getAvailableBalance, {
	pattern: "anti-corruption-layer",
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
});
submissionSchema.addAttribute("messageType", {
	type: "SchemeFormat",
	valueobject: schemeFormatVO,
});
const settlementSchema = schemeBC.addSchema("SchemeSettlement");
settlementSchema.addAttribute("instructionId", {
	type: "string",
	identity: true,
});
settlementSchema.addAttribute("schemeRef", { type: "string" });

const schemeSettlementConfirmed = schemeMessageAgg.provides(
	"SchemeSettlementConfirmed",
	{
		description: "The scheme settled the payment",
		type: "event",
		pattern: "published-language",
		schema: settlementSchema,
	},
);
const schemeRejected = schemeMessageAgg.provides("SchemeRejected", {
	description: "The scheme refused the message",
	type: "event",
	pattern: "published-language",
	schema: settlementSchema,
});
// What a context offers outward leaves an application service; an
// aggregate's operations are its own context's (decision 17).
const schemeApp = schemeBC.addService("SchemeGatewayApp", {
	description:
		"The gateway's application service: the boundary the hub submits messages through",
	type: "application",
});
const submitToScheme = schemeApp
	.provides("SubmitToScheme", {
		description: "Send a submission and await the response",
		type: "operation",
		pattern: "open-host-service",
		schema: submissionSchema,
	})
	.raises(schemeSettlementConfirmed, schemeRejected);

paymentsApp.consumes(submitToScheme, { pattern: "conformist" });
instructionAgg.consumes(schemeSettlementConfirmed, { pattern: "conformist" });
instructionAgg.consumes(schemeRejected, { pattern: "conformist" });
paymentsApp.consumes(postEntry, { pattern: "anti-corruption-layer" });
// A policy names operations of its own context, so each step that reaches
// another context is an operation of the hub's own app service (decision 17).
const sendToScheme = paymentsApp.provides("SendToScheme", {
	description:
		"Hand a submitted instruction to the gateway, by calling SubmitToScheme",
	type: "operation",
	internal: true,
});
paymentsBC
	.addPolicy("Submit to scheme", {
		description: "A submitted instruction goes to the gateway",
	})
	.on(paymentSubmitted)
	.then(sendToScheme);
paymentsBC
	.addPolicy("Confirm settlement", {
		description: "The scheme's confirmation settles the instruction",
	})
	.on(schemeSettlementConfirmed)
	.then(confirmSettlement);
paymentsBC
	.addPolicy("Reject on scheme refusal", {
		description: "A refused message rejects the instruction",
	})
	.on(schemeRejected)
	.then(rejectPayment);
const postSettlement = paymentsApp.provides("PostSettlement", {
	description:
		"Post the settled instruction to the ledger, through the ACL over PostEntry",
	type: "operation",
	internal: true,
});
paymentsBC
	.addPolicy("Post on settlement", {
		description: "A settled instruction posts to the ledger",
	})
	.on(paymentSettled)
	.then(postSettlement);

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
riskScoreVO.addAttribute("reasons", { type: "string[]" });
const caseStatusVO = fraudBC.addValueObject("CaseStatus", {
	description: "open, confirmed, dismissed",
});
caseStatusVO.addAttribute("value", {
	type: "'open' | 'confirmed' | 'dismissed'",
});
fraudCase.addAttribute("caseId", { type: "string", identity: true });
fraudCase.addAttribute("customerId", { type: "string" });
fraudCase.addAttribute("accountId", { type: "string" });
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
fraudCaseAgg
	.addInvariant("ScoreExplained", {
		description:
			"A score carries its reasons, because the customer may be entitled to them",
	})
	.constrains(riskScoreVO);

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
const transactionVerdictSchema = fraudBC.addSchema("TransactionVerdict", {
	description: "Shared by flagged and cleared",
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

// The verdicts belong to the scorer, not the case: a cleared transaction
// opens no case, so the FraudCase aggregate cannot be what raises it.
const transactionScorer = fraudBC.addService("TransactionScorer", {
	description:
		"The bank's own model; a domain service because it reads across every customer's history",
	type: "domain",
});
const transactionFlagged = transactionScorer.provides("TransactionFlagged", {
	description: "Above threshold; the caller stops the transaction",
	type: "event",
	pattern: "published-language",
	schema: transactionVerdictSchema,
});
const transactionCleared = transactionScorer.provides("TransactionCleared", {
	description: "Below threshold; the caller proceeds",
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
		description: "Score synchronously; callers wait on the verdict",
		type: "operation",
		pattern: "open-host-service",
		schema: scoreTransactionSchema,
	})
	.raises(transactionFlagged, transactionCleared);

fraudBC
	.addPolicy("Open case on flag", {
		description: "Every flag becomes a case with the alert attached",
	})
	.on(transactionFlagged)
	.then(openCase);

fraudBC.addTerm("Alert", {
	definition: "One flagged transaction and its score",
	embodiedBy: alert,
});
fraudBC.addTerm("APP scam", {
	definition:
		"An authorised push payment the customer was tricked into making; reimbursable, so every missed flag costs the bank",
	embodiedBy: transactionScorer,
});

// Payments waits on the scorer; flags reject, clears submit.
paymentsApp.consumes(scoreTransaction, { pattern: "anti-corruption-layer" });
instructionAgg.consumes(transactionFlagged, {
	pattern: "anti-corruption-layer",
});
instructionAgg.consumes(transactionCleared, {
	pattern: "anti-corruption-layer",
});
const scoreInstruction = paymentsApp.provides("ScoreInstruction", {
	description:
		"Send an initiated instruction to Fraud for a verdict, through the ACL",
	type: "operation",
	internal: true,
});
paymentsBC
	.addPolicy("Score on initiation", {
		description: "Every instruction is scored before it goes anywhere",
	})
	.on(paymentInitiated)
	.then(scoreInstruction);
paymentsBC
	.addPolicy("Submit on clear", {
		description: "A cleared instruction is submitted",
	})
	.on(transactionCleared)
	.then(submitPayment);
paymentsBC
	.addPolicy("Reject on flag", {
		description: "A flagged instruction is rejected, never submitted",
	})
	.on(transactionFlagged)
	.then(rejectPayment);
// Accounts freezes when a case opens.
accountAgg.consumes(fraudCaseOpened, { pattern: "anti-corruption-layer" });
accountsBC
	.addPolicy("Freeze on fraud case", {
		description: "An opened case freezes the account the same second",
	})
	.on(fraudCaseOpened)
	.then(freezeAccount);

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
const cardMoney = money(cardsBC);
card.addAttribute("cardId", { type: "string", identity: true });
card.addAttribute("accountId", { type: "string", identifies: account });
card.addAttribute("pan", { type: "PAN", valueobject: panVO });
card.addAttribute("expiry", { type: "Expiry", valueobject: expiryVO });
card.addAttribute("status", { type: "CardStatus", valueobject: cardStatusVO });
cardAuthorisation.addAttribute("authorisationId", {
	type: "string",
	identity: true,
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
cardAuthorisation.uses(cardMoney, "of", "1");
// Account lives in Accounts: `accountId` above is the only thing that crosses
// the boundary.

// A construction rule: the stored value is a token and four digits, on which
// Luhn cannot be run, so the check happens once, before tokenisation.
cardAgg
	.addInvariant("PanLuhnValid", {
		description:
			"A PAN value is only ever created from a full number that passed the Luhn check; the token and last four are never re-checked because they cannot be",
	})
	.constrains(panVO);
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
cardAgg
	.addInvariant("AuthWithinAvailableBalance", {
		description:
			"An authorisation is approved only if the available balance read from AccountServicing at that moment covers it; Accounts then holds the amount",
	})
	.constrains(cardAuthorisation);

const cardAuthRequestSchema = cardsBC.addSchema("CardAuthorisationRequest", {
	description: "CardCo's format, translated on the way in",
});
cardAuthRequestSchema.addAttribute("panToken", { type: "string" });
cardAuthRequestSchema.addAttribute("merchant", { type: "string" });
cardAuthRequestSchema.addAttribute("amount", {
	type: "Money",
	valueobject: cardMoney,
});
const cardEventSchema = cardsBC.addSchema("CardEvent", {
	description: "Card and account; shared by the card events",
});
cardEventSchema.addAttribute("cardId", { type: "string", identity: true });
cardEventSchema.addAttribute("accountId", { type: "string" });
const cardAuthorisedSchema = cardsBC.addSchema("CardAuthorised", {
	description:
		"Card, account and the authorised amount; Accounts needs the amount to place the hold",
});
cardAuthorisedSchema.addAttribute("cardId", { type: "string", identity: true });
cardAuthorisedSchema.addAttribute("accountId", { type: "string" });
cardAuthorisedSchema.addAttribute("authorisationId", { type: "string" });
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
cardsApp
	.provides("AuthoriseCard", {
		description: "Approve or decline a merchant's request from CardCo",
		type: "operation",
		pattern: "open-host-service",
		schema: cardAuthRequestSchema,
	})
	.raises(cardAuthorised);
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

cardAgg.consumes(getAvailableBalance, { pattern: "anti-corruption-layer" });
cardAgg.consumes(scoreTransaction, { pattern: "anti-corruption-layer" });
cardAgg.consumes(transactionFlagged, { pattern: "anti-corruption-layer" });
cardsBC
	.addPolicy("Block on flagged card transaction", {
		description: "A flag on a card-channel transaction blocks the card",
	})
	.on(transactionFlagged)
	.then(blockCard);
fraudCaseAgg.consumes(cardAuthorised, { pattern: "anti-corruption-layer" });
// DISCOVERY: Accounts Team lead. "Our balance is ledger balance less pending
// card authorisations": Accounts must hear every authorisation to hold it.
accountAgg.consumes(cardAuthorised, { pattern: "anti-corruption-layer" });
accountsBC
	.addPolicy("Hold on card authorisation", {
		description:
			"Every approved authorisation places a hold on its account the same second, so the available balance is what the merchant has not yet captured",
	})
	.on(cardAuthorised)
	.then(placeHold);

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
const applicationMoney = money(lendingBC);
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
	description: "Set once Credit Decisioning has answered",
});
application.uses(applicationMoney, "requests", "1");
application.uses(termVO, "over", "1");
application.uses(decisionVO, "decided", "0..1");
// Customer lives in Customer & KYC: `customerId` above is the only thing that
// crosses the boundary.
// A rule across applications, so it is checked when SubmitApplication runs,
// over the customer's applications; one instance cannot see the others.
applicationAgg
	.addInvariant("OneOpenApplicationPerCustomer", {
		description:
			"A customer has at most one open application; SubmitApplication refuses a second while one is open",
	})
	.constrains(application);

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
// Lending's Money is the context's, declared with the application above.
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
loan.uses(loanMoney, "principal", "1");
loan.uses(aprVO, "charged-at", "1");
loan.uses(loanStatusVO, "has-status", "1");
installment.uses(loanMoney, "of", "1");
loan.references(application, "from-application", "1");
// The account the loan is disbursed to lives in Accounts: `accountId` above is
// the only thing that crosses the boundary. The application it came from is in
// Lending too, so that one stays a relation.

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
applicationSubmittedSchema.addAttribute("customerId", { type: "string" });
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
loanEventSchema.addAttribute("accountId", { type: "string" });
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
lendingApp
	.provides("SubmitApplication", {
		description: "Ask for an amount over a term",
		type: "operation",
		pattern: "open-host-service",
		schema: applicationSubmittedSchema,
	})
	.raises(applicationSubmitted);
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
	.then(arrearsNoticeIssued);

lendingBC
	.addPolicy("Disburse on signature", {
		description: "A signed agreement is disbursed",
	})
	.on(agreementSigned)
	.then(disburse);
lendingApp.consumes(postEntry, { pattern: "anti-corruption-layer" });
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
	.then(postDisbursement);
applicationAgg.consumes(getCustomer, { pattern: "anti-corruption-layer" });

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
creditDecision.addAttribute("applicationId", { type: "string" });
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
});
decisionRequestSchema.addAttribute("customerId", { type: "string" });
decisionRequestSchema.addAttribute("requestedMinor", { type: "int64" });
decisionRequestSchema.addAttribute("termMonths", { type: "int" });
const decisionMadeSchema = decisioningBC.addSchema("DecisionMade");
decisionMadeSchema.addAttribute("applicationId", {
	type: "string",
	identity: true,
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
creditDecisionAgg.consumes(getCustomer, { pattern: "anti-corruption-layer" });

// Partnership: one planning board, so Lending conforms rather than translates.
lendingApp.consumes(decide, { pattern: "conformist" });
// And the other way, which the model already described and never wired up:
// ApplicationSubmitted's schema is named "What decisioning receives" and the
// event says "decisioning runs". Without this consumption the partnership had
// traffic one way only, and a partnership is a two-way dependency.
creditDecisionAgg.consumes(applicationSubmitted, { pattern: "conformist" });
const requestDecision = lendingApp.provides("RequestDecision", {
	description: "Send a submitted application to Credit Decisioning",
	type: "operation",
	internal: true,
});
applicationAgg.consumes(decisionMade, { pattern: "conformist" });
lendingBC
	.addPolicy("Decide on submission", {
		description: "Every submitted application is sent for a decision",
	})
	.on(applicationSubmitted)
	.then(requestDecision);
lendingBC
	.addPolicy("Record decision", {
		description: "The outcome and reasons are stored on the application",
	})
	.on(decisionMade)
	.then(recordDecision);

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
const reportMoney = money(reportingBC);
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
reportLine.uses(reportMoney, "of", "1");

// The ledger is another context, so this is a precondition of filing: a
// reconciliation run before FileReturn, not a rule one line can hold alone.
returnAgg
	.addInvariant("LinesReconcileToLedger", {
		description:
			"A return is filed only when every line has been reconciled to the ledger postings for its period; FileReturn refuses an unreconciled line",
	})
	.constrains(reportLine, regReturn);
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
returnAgg
	.provides("FileReturn", {
		description: "File a closed period's return",
		type: "operation",
		internal: true,
	})
	.raises(returnFiled);

returnAgg.consumes(entryPosted, { pattern: "conformist" });
returnAgg.consumes(accountOpened, { pattern: "conformist" });
returnAgg.consumes(loanDisbursed, { pattern: "conformist" });
reportingBC
	.addPolicy("Accumulate on posting", {
		description:
			"Ledger postings, account openings and disbursements each add to a line as they happen",
	})
	.on(entryPosted, accountOpened, loanDisbursed)
	.then(accumulateLine);

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
channelsApp
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

requestAgg.consumes(getCustomer, { pattern: "conformist" });
requestAgg.consumes(getAvailableBalance, { pattern: "conformist" });
requestAgg.consumes(blockCard, { pattern: "conformist" });
requestAgg.consumes(consentWithdrawn, { pattern: "conformist" });
// DELIBERATE (separate-ways): the quick-quote button. Front-line staff may
// not influence a credit decision, and the relationship below says so; this
// consumption contradicts it.
requestAgg.consumes(decide, { pattern: "anti-corruption-layer" });
channelsBC
	.addPolicy("Suppress marketing on withdrawal", {
		description:
			"A withdrawn marketing consent stops outbound contact the same day; the fix for the fine",
	})
	.on(consentWithdrawn)
	.then(suppressMarketing);

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

entryAgg.consumes(nightlyBatchCompleted, { pattern: "anti-corruption-layer" });
ledgerBC
	.addPolicy("Import nightly batch", {
		description: "Each line of the batch file becomes a ledger entry",
	})
	.on(nightlyBatchCompleted)
	.then(importBatch);
returnAgg.consumes(nightlyBatchCompleted, { pattern: "anti-corruption-layer" });

/* =======================
   IDENTITY & ACCESS
   ======================= */

const credentialAgg = identityBC.addAggregate("Credential", {
	description: "A customer's login",
});
const credential = credentialAgg.addRootEntity("Credential", {
	description: "Username and step-up factors for one customer",
});
credential.addAttribute("customerId", { type: "string", identity: true });
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
requestAgg.consumes(authenticateCustomer, { pattern: "conformist" });

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

// Shared kernel: the Money and AccountNumber library, changed and released together.
accountsBC.sharesKernelWith(ledgerBC, {
	description: "Money and AccountNumber are one library owned by both teams",
	comments: [
		{
			text: "Money and AccountNumber live in @northbank/money; both services compile against the same version.",
			link: {
				kind: "code",
				url: "https://github.com/example/northbank/blob/main/packages/money/src/Money.ts",
				label: "packages/money/src/Money.ts",
			},
		},
		{
			text: "Kept deliberately tiny: two value objects and their parsers, changed only by agreement of both teams.",
			link: {
				kind: "adr",
				url: "https://github.com/example/northbank/blob/main/docs/adr/006-money-kernel.md",
				label: "ADR-006 The money kernel",
			},
		},
	],
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
