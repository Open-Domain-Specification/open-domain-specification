import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as AccountsSurface } from "./accounts.ts";
import type { Published as CoreBankingSurface } from "./core_banking.ts";
import type { Published as FinancialCrimeSurface } from "./financial_crime.ts";
import { foreign } from "./foreign.ts";

/** This team's file in the NorthBank set. */
export const FILE = "cards.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Cards",
	attributes: {
		id: "northbank_cards",
		description:
			"NorthBank's Cards Team: issuing, authorisation and the integration with CardCo, the outsourced card processor.",
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
		"#/boundedcontexts/cards/aggregates/card/provides/card_authorised",
		"#/boundedcontexts/cards/services/cards_app/provides/block_card",
	],
	contexts: ["#/boundedcontexts/cards"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const cardsTeam = ws.addTeam("Cards Team", {
		description: "Issuing and the CardCo integration",
	});

	const cardsBC = ws.addBoundedContext("Cards", {
		description: "Issued cards and their authorisations, via CardCo",
		team: cardsTeam,
	});

	const cardCoBC = ws.addBoundedContext("CardCo", {
		description:
			"The outsourced card processor: it sends the authorisation requests and takes the answers, in its own format",
		external: true,
	});

	// CARDS
	// DISCOVERY: Cards Team lead. Tokenised PAN passing Luhn; nothing on a
	// blocked or expired card; within available balance; CardCo's format translated.
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

	card.addAttribute("cardId", { type: "string", identity: true });
	const cardAccountIdAttr = card.addAttribute("accountId", { type: "string" });
	card.addAttribute("pan", { type: "PAN", valueobject: panVO });
	card.addAttribute("expiry", { type: "Expiry", valueobject: expiryVO });
	card.addAttribute("status", {
		type: "CardStatus",
		valueobject: cardStatusVO,
	});
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
	const cardAuthorisationAmountAttr = cardAuthorisation.addAttribute("amount", {
		type: "Money",
	});
	cardAuthorisation.addAttribute("at", { type: "date-time" });
	card.includes(cardAuthorisation, "authorised", "*");
	card.uses(panVO, "numbered", "1");
	card.uses(expiryVO, "expires", "1");
	card.uses(cardStatusVO, "has-status", "1");
	// Account lives in Accounts: `accountId` above is the only thing that crosses
	// the boundary. Money is borrowed from Ledger, so it is typed by
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
	const cardEventSchemaAccountIdAttr = cardEventSchema.addAttribute(
		"accountId",
		{
			type: "string",
		},
	);
	const cardAuthorisedSchema = cardsBC.addSchema("CardAuthorised", {
		description:
			"Card, account and the authorised amount; Accounts needs the amount to place the hold",
	});
	cardAuthorisedSchema.addAttribute("cardId", {
		type: "string",
		identity: true,
	});
	const cardAuthorisedSchemaAccountIdAttr = cardAuthorisedSchema.addAttribute(
		"accountId",
		{
			type: "string",
		},
	);
	cardAuthorisedSchema.addAttribute("authorisationId", {
		type: "string",
		identifies: cardAuthorisation,
	});
	const cardAuthorisedSchemaAmountAttr = cardAuthorisedSchema.addAttribute(
		"amount",
		{
			type: "Money",
		},
	);

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
	const cardApprovalSchemaAmountAttr = cardApprovalSchema.addAttribute(
		"amount",
		{
			type: "Money",
		},
	);
	const cardDeclineSchema = cardsBC.addSchema("CardAuthorisationDeclined", {
		description:
			"Why the request was declined: the card is blocked, the card has expired, or the available balance does not cover it. No authorisation exists, so there is no card event to raise",
	});
	cardDeclineSchema.addAttribute("cardId", {
		type: "string",
		identifies: card,
	});
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

	const blockOnFlaggedCardTransactionPolicy = cardsBC
		.addPolicy("Block on flagged card transaction", {
			description: "A flag on a card-channel transaction blocks the card",
		})
		.issues(blockCard);

	cardsBC.addTerm("PAN", {
		definition: "The card number; held as a token and the last four digits",
		embodiedBy: panVO,
	});
	cardsBC.addTerm("Authorisation", {
		definition:
			"A merchant's approved request to take an amount. Not a mandate",
		embodiedBy: cardAuthorisation,
	});
	cardsBC.addTerm("Payment", {
		definition:
			"A card transaction. The Payments Hub's payment is an instruction to a payee",
		embodiedBy: cardAuthorisation,
	});
	return {
		cardsBC,
		cardAccountIdAttr,
		cardAuthorisationAmountAttr,
		cardEventSchemaAccountIdAttr,
		cardAuthorisedSchemaAccountIdAttr,
		cardAuthorisedSchemaAmountAttr,
		cardApprovalSchemaAmountAttr,
		blockOnFlaggedCardTransactionPolicy,
		cardCoFeed,
		authoriseCard,
		cardCoBC,
		cardsApp,
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
		cardsBC,
		cardAccountIdAttr,
		cardAuthorisationAmountAttr,
		cardEventSchemaAccountIdAttr,
		cardAuthorisedSchemaAccountIdAttr,
		cardAuthorisedSchemaAmountAttr,
		cardApprovalSchemaAmountAttr,
		blockOnFlaggedCardTransactionPolicy,
		cardCoFeed,
		authoriseCard,
		cardCoBC,
		cardsApp,
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
	const cardsSD = coreBanking.subdomain(
		"#/domains/banking_products/subdomains/cards",
	);
	const cardMoney = coreBanking.valueobject(
		"#/boundedcontexts/ledger/valueobjects/money",
	);
	const ledgerBC = coreBanking.context("#/boundedcontexts/ledger");
	const financialCrime = foreign<FinancialCrimeSurface>(
		set,
		"financial_crime.json",
	);
	const scoreTransaction = financialCrime.consumable(
		"#/boundedcontexts/fraud/services/fraud_app/provides/score_transaction",
	);
	const transactionFlagged = financialCrime.consumable(
		"#/boundedcontexts/fraud/services/transaction_scorer/provides/transaction_flagged",
	);
	const fraudBC = financialCrime.context("#/boundedcontexts/fraud");

	cardsBC.serves(cardsSD);
	cardAccountIdAttr.identifies = account;
	cardAuthorisationAmountAttr.valueobject = cardMoney;
	cardEventSchemaAccountIdAttr.identifies = account;
	cardAuthorisedSchemaAccountIdAttr.identifies = account;
	cardAuthorisedSchemaAmountAttr.valueobject = cardMoney;
	cardApprovalSchemaAmountAttr.valueobject = cardMoney;

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
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: cardCoBC,
		downstream: cardsBC,
		description:
			"CardCo's format is CardCo's: it dictates the message every authorisation arrives in, and Cards translates it at its own boundary rather than adopting it. The bank provides the operation and offers it as an open host; who provides is not who is upstream",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
	});

	cardsApp.consumes(getAvailableBalance, {
		pattern: "anti-corruption-layer",
		by: [authoriseCard],
	});

	cardsApp.consumes(scoreTransaction, {
		pattern: "anti-corruption-layer",
		by: [authoriseCard],
	});
	cardsApp.consumes(transactionFlagged, { pattern: "anti-corruption-layer" });

	blockOnFlaggedCardTransactionPolicy.on(transactionFlagged);

	ws.addRelationship({
		type: "customer-supplier",
		upstream: fraudBC,
		downstream: cardsBC,
		upstreamRoles: ["open-host-service", "published-language"],
		downstreamRoles: ["anti-corruption-layer"],
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: accountsBC,
		downstream: cardsBC,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
		description: "The balance check at authorisation time",
	});

	// Cards carries an amount on a card and an authorisation and has no other
	// relationship with Ledger. Card 56 wrote Cards as a sharer of the library;
	// the Cards lead never mentioned it, so whether Cards compiles against
	// @northbank/money at all is the model's assumption, kept rather than dropped,
	// and it is written as what a user of the library is: a conformist that takes
	// Money as the owners publish it and has no say in changing it (card 157).
	ws.addRelationship({
		type: "upstream-downstream",
		upstream: ledgerBC,
		downstream: cardsBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
		description:
			"Money only, from @northbank/money, taken as Accounts and Ledger release it. Assumed: the Cards lead did not mention the library",
	});
}
