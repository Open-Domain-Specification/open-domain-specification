import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as CardsSurface } from "./cards.ts";
import type { Published as CoreBankingSurface } from "./core_banking.ts";
import type { Published as CustomerPlatformSurface } from "./customer_platform.ts";
import type { Published as FinancialCrimeSurface } from "./financial_crime.ts";
import { foreign } from "./foreign.ts";
import type { Published as PaymentsSurface } from "./payments.ts";

/** This team's file in the NorthBank set. */
export const FILE = "accounts.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Accounts",
	attributes: {
		id: "northbank_accounts",
		description:
			"NorthBank's Accounts Team: the current-account platform, with its mandates, overdraft limits, holds and status.",
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
		"#/boundedcontexts/accounts/aggregates/account/provides/account_opened",
		"#/boundedcontexts/accounts/services/account_servicing/provides/get_available_balance",
	],
	contexts: ["#/boundedcontexts/accounts"],
	entities: ["#/boundedcontexts/accounts/aggregates/account/entities/account"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const accountsTeam = ws.addTeam("Accounts Team", {
		description: "The account platform",
	});

	// The new platform holds current accounts; savings are still on Sovereign
	// (below, in the same subdomain) until the hollowing-out moves them across.
	const accountsBC = ws.addBoundedContext("Accounts", {
		description:
			"Current accounts on the 2019 platform: mandates, overdrafts, holds, status. Savings remain on Sovereign",
		team: accountsTeam,
	});

	// ACCOUNTS
	// DISCOVERY: Accounts Team lead. IBAN checksum; balance within overdraft;
	// frozen accepts no debits; closed has zero balance; mandates are verified customers.
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

	const overdraftVO = accountsBC.addValueObject("OverdraftLimit", {
		description: "How far below zero the available balance may go",
	});
	const overdraftVOLimitAttr = overdraftVO.addAttribute("limit", {
		type: "Money",
	});
	const accountStatusVO = accountsBC.addValueObject("AccountStatus", {
		description: "open, frozen or closed",
	});
	accountStatusVO.addAttribute("value", {
		type: "'open' | 'frozen' | 'closed'",
	});
	account.addAttribute("accountId", { type: "string", identity: true });
	account.addAttribute("productCode", {
		type: "'current'",
		description:
			"Only current accounts live here; savings stay on Sovereign until the hollowing-out moves them",
	});
	const accountIbanAttr = account.addAttribute("iban", { type: "IBAN" });
	const accountAccountNumberAttr = account.addAttribute("accountNumber", {
		type: "AccountNumber",
	});
	const accountPostedBalanceAttr = account.addAttribute("postedBalance", {
		type: "Money",
		description: "What the ledger has posted to this account",
	});
	const pendingAuthorisations = account.addAttribute("pendingAuthorisations", {
		type: "Money",
		description:
			"Card authorisations approved but not yet captured; a hold placed on CardAuthorised and released when the capture posts",
	});
	const availableBalance = account.addAttribute("availableBalance", {
		type: "Money",
		description: "Posted balance less pending card authorisations",
	});
	account.addAttribute("status", {
		type: "AccountStatus",
		valueobject: accountStatusVO,
	});
	const mandateCustomerIdAttr = mandate.addAttribute("customerId", {
		type: "string",
		identity: true,
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
	// and Money are declared on Ledger's side of the kernel the two contexts share
	// and IBAN is ISO 13616's, so all three are
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
	accountRefSchema.addAttribute("accountId", {
		type: "string",
		identity: true,
	});
	// A returned shape: what GetAvailableBalance answers with.
	const availableBalanceSchema = accountsBC.addSchema("AvailableBalance", {
		description:
			"Posted balance less pending authorisations, at the moment of the call",
	});
	const availableBalanceSchemaAmountAttr = availableBalanceSchema.addAttribute(
		"amount",
		{
			type: "Money",
		},
	);
	const accountOpenedSchema = accountsBC.addSchema("AccountOpened", {
		description: "What reporting and the ledger learn about a new account",
	});
	accountOpenedSchema.addAttribute("accountId", {
		type: "string",
		identity: true,
	});
	const accountOpenedSchemaIbanAttr = accountOpenedSchema.addAttribute("iban", {
		type: "IBAN",
	});
	const accountOpenedSchemaCustomerIdAttr = accountOpenedSchema.addAttribute(
		"customerId",
		{
			type: "string",
		},
	);
	accountOpenedSchema.addAttribute("productCode", { type: "'current'" });
	const openAccountSchema = accountsBC.addSchema("OpenAccount");
	const openAccountSchemaCustomerIdAttr = openAccountSchema.addAttribute(
		"customerId",
		{
			type: "string",
		},
	);
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
	accountServicing.provides("GetAvailableBalance", {
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
		.issues(recordVerifiedCustomer);

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

	const updateBalanceOnPostingPolicy = accountsBC
		.addPolicy("Update balance on posting", {
			description:
				"Every posting to an account recomputes its available balance",
		})
		.issues(updateBalance);

	const freezeOnFraudCasePolicy = accountsBC
		.addPolicy("Freeze on fraud case", {
			description: "An opened case freezes the account the same second",
		})
		.issues(freezeAccount);

	const holdOnCardAuthorisationPolicy = accountsBC
		.addPolicy("Hold on card authorisation", {
			description:
				"Every approved authorisation places a hold on its account the same second, so the available balance is what the merchant has not yet captured",
		})
		.issues(placeHold);
	return {
		accountsBC,
		overdraftVOLimitAttr,
		accountIbanAttr,
		accountAccountNumberAttr,
		accountPostedBalanceAttr,
		pendingAuthorisations,
		availableBalance,
		mandateCustomerIdAttr,
		availableBalanceSchemaAmountAttr,
		accountOpenedSchemaIbanAttr,
		accountOpenedSchemaCustomerIdAttr,
		openAccountSchemaCustomerIdAttr,
		noteVerification,
		updateBalanceOnPostingPolicy,
		freezeOnFraudCasePolicy,
		holdOnCardAuthorisationPolicy,
		accountServicing,
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
		accountsBC,
		overdraftVOLimitAttr,
		accountIbanAttr,
		accountAccountNumberAttr,
		accountPostedBalanceAttr,
		pendingAuthorisations,
		availableBalance,
		mandateCustomerIdAttr,
		availableBalanceSchemaAmountAttr,
		accountOpenedSchemaIbanAttr,
		accountOpenedSchemaCustomerIdAttr,
		openAccountSchemaCustomerIdAttr,
		noteVerification,
		updateBalanceOnPostingPolicy,
		freezeOnFraudCasePolicy,
		holdOnCardAuthorisationPolicy,
		accountServicing,
	} = own;
	const cards = foreign<CardsSurface>(set, "cards.json");
	const cardAuthorised = cards.consumable(
		"#/boundedcontexts/cards/aggregates/card/provides/card_authorised",
	);
	const cardsBC = cards.context("#/boundedcontexts/cards");
	const coreBanking = foreign<CoreBankingSurface>(set, "core_banking.json");
	const accountsSD = coreBanking.subdomain(
		"#/domains/banking_products/subdomains/current_&_savings_accounts",
	);
	const accountMoney = coreBanking.valueobject(
		"#/boundedcontexts/ledger/valueobjects/money",
	);
	const accountNumberVO = coreBanking.valueobject(
		"#/boundedcontexts/ledger/valueobjects/account_number",
	);
	const entryPosted = coreBanking.consumable(
		"#/boundedcontexts/ledger/aggregates/journal_entry/provides/entry_posted",
	);
	const ledgerBC = coreBanking.context("#/boundedcontexts/ledger");
	const customerPlatform = foreign<CustomerPlatformSurface>(
		set,
		"customer_platform.json",
	);
	const customer = customerPlatform.entity(
		"#/boundedcontexts/customer_&_kyc/aggregates/customer/entities/customer",
	);
	const customerVerified = customerPlatform.consumable(
		"#/boundedcontexts/customer_&_kyc/aggregates/customer/provides/customer_verified",
	);
	const customerBC = customerPlatform.context(
		"#/boundedcontexts/customer_&_kyc",
	);
	const financialCrime = foreign<FinancialCrimeSurface>(
		set,
		"financial_crime.json",
	);
	const fraudCaseOpened = financialCrime.consumable(
		"#/boundedcontexts/fraud/aggregates/fraud_case/provides/fraud_case_opened",
	);
	const fraudBC = financialCrime.context("#/boundedcontexts/fraud");
	const payments = foreign<PaymentsSurface>(set, "payments.json");
	const ibanVO = payments.valueobject(
		"#/boundedcontexts/iso_13616/valueobjects/iban",
	);
	const isoBC = payments.context("#/boundedcontexts/iso_13616");

	accountsBC.serves(accountsSD);
	overdraftVOLimitAttr.valueobject = accountMoney;
	accountIbanAttr.valueobject = ibanVO;
	accountAccountNumberAttr.valueobject = accountNumberVO;
	accountPostedBalanceAttr.valueobject = accountMoney;
	pendingAuthorisations.valueobject = accountMoney;
	availableBalance.valueobject = accountMoney;
	mandateCustomerIdAttr.identifies = customer;
	availableBalanceSchemaAmountAttr.valueobject = accountMoney;
	accountOpenedSchemaIbanAttr.valueobject = ibanVO;
	accountOpenedSchemaCustomerIdAttr.identifies = customer;
	openAccountSchemaCustomerIdAttr.identifies = customer;
	noteVerification.on(customerVerified);
	accountServicing.consumes(customerVerified, {
		pattern: "conformist",
		by: [noteVerification],
	});

	// Accounts takes ledger events as published: it conforms to Ledger's
	// language, beside the Money and AccountNumber kernel the two co-own.
	accountServicing.consumes(entryPosted, { pattern: "conformist" });

	updateBalanceOnPostingPolicy.on(entryPosted);

	// Accounts freezes when a case opens.
	accountServicing.consumes(fraudCaseOpened, {
		pattern: "anti-corruption-layer",
	});

	freezeOnFraudCasePolicy.on(fraudCaseOpened);

	// DISCOVERY: Accounts Team lead. "Our balance is ledger balance less pending
	// card authorisations": Accounts must hear every authorisation to hold it.
	accountServicing.consumes(cardAuthorised, {
		pattern: "anti-corruption-layer",
	});

	holdOnCardAuthorisationPolicy.on(cardAuthorised);

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: customerBC,
		downstream: accountsBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: ledgerBC,
		downstream: accountsBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
		description:
			"Balances follow the ledger: Accounts takes EntryPosted as published, with no translation",
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: fraudBC,
		downstream: accountsBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: cardsBC,
		downstream: accountsBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
		description: "Every authorisation becomes a hold on the account",
	});

	// Shared kernel: Accounts and Ledger co-own Money and AccountNumber, "one
	// shared library between us and the ledger; we change it together and release
	// it together" (DISCOVERY: Accounts Team lead). Two owners make one pairwise
	// kernel, not a context of its own (decision 16's note of 2026-09-10, card
	// 120). The kernel sits beside Accounts' conformist relationship to the
	// ledger's events, which `relationship-duplicate` allows for two relationships
	// of different types. Payments, Lending and Reporting borrow Money from Ledger over the
	// relationships above; Cards borrows it over the one below. None of the four
	// is a co-owner (card 157).
	accountsBC.sharesKernelWith(ledgerBC, {
		description:
			"Money and AccountNumber, from @northbank/money, changed and released together by the two teams",
		comments: [
			{
				text: "Money and AccountNumber live in @northbank/money, which Accounts and Ledger change and release together.",
				link: {
					kind: "code",
					url: "https://github.com/example/northbank/blob/main/packages/money/src/Money.ts",
					label: "packages/money/src/Money.ts",
				},
			},
			{
				text: "Kept deliberately tiny: two value objects and their parsers, changed only by agreement of the Accounts Team and the Core Banking Team.",
				link: {
					kind: "adr",
					url: "https://github.com/example/northbank/blob/main/docs/adr/006-money-kernel.md",
					label: "ADR-006 The money kernel",
				},
			},
		],
	});

	// Both contexts that name an account outside the bank's own walls take the
	// standard's IBAN as it stands: nobody here negotiates with ISO, and there is
	// nothing to consume — what the body publishes is the shape (decision 28's
	// amendment of 2026-09-09).
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: isoBC,
		downstream: accountsBC,
		description:
			"Accounts holds the IBAN of every current account and takes ISO 13616's definition of it, checksum and all",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
	});
}
