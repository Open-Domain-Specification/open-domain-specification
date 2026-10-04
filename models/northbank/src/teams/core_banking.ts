import type {
	Attribute,
	Workspace,
	WorkspaceSet,
} from "@open-domain-specification/core";

/** This team's file in the NorthBank set. */
export const FILE = "core_banking.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Core Banking",
	attributes: {
		id: "northbank_core_banking",
		description:
			"NorthBank's Core Banking Team: the double-entry ledger, the Sovereign legacy core and the Banking Products domain.",
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
		"#/boundedcontexts/ledger/aggregates/journal_entry/provides/entry_posted",
		"#/boundedcontexts/ledger/services/ledger_app/provides/post_entry",
		"#/boundedcontexts/sovereign_core_(legacy)/aggregates/savings_account_record/provides/nightly_batch_completed",
	],
	contexts: [
		"#/boundedcontexts/ledger",
		"#/boundedcontexts/sovereign_core_(legacy)",
	],
	subdomains: [
		"#/domains/banking_products/subdomains/cards",
		"#/domains/banking_products/subdomains/current_&_savings_accounts",
	],
	valueobjects: [
		"#/boundedcontexts/ledger/valueobjects/account_number",
		"#/boundedcontexts/ledger/valueobjects/money",
	],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const products = ws.addDomain("Banking Products", {
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
	products.addSubdomain("Cards", {
		type: "generic",
		description:
			'Issuing and authorisation. "We would outsource it if the contract allowed"',
	});

	const coreBankingTeam = ws.addTeam("Core Banking Team", {
		description: "The ledger, and Sovereign",
	});

	const ledgerBC = ledgerSD.addBoundedcontext("Ledger", {
		description: "Balanced, immutable journal entries",
		team: coreBankingTeam,
	});

	// DISCOVERY: Core Banking lead. "Nobody touches Sovereign's tables. It is what it is."
	const sovereignBC = accountsSD.addBoundedcontext("Sovereign Core (legacy)", {
		description:
			"The 1989 COBOL core that still holds savings accounts and runs the nightly batch. Modelled at its edge only",
		bigBallOfMud: true,
		team: coreBankingTeam,
	});

	// SHARED KERNEL: MONEY AND ACCOUNTNUMBER
	// DISCOVERY: Accounts Team lead, "Money and account numbers are one shared
	// library between us and the ledger; we change it together and release it
	// together." Accounts and Ledger co-own the two, so the kernel is theirs and
	// pairwise (decision 16's note of 2026-09-10, card 120). A value object has
	// one home, and the model has to write it in one of the two owners: it is Ledger,
	// because every other context that carries an amount already stands
	// downstream of Ledger over a relationship that lets it borrow, and Cards
	// needs one new conformist relationship to do the same (card 157). The
	// co-ownership is the shared-kernel relationship with Accounts, and each
	// description says so. Neither value object is typed by a `uses` relation
	// from a borrower: a relation never crosses a context boundary (decision 15),
	// so the attribute's `valueobject` reference is the only link.
	const kernelMoneyVO = ledgerBC.addValueObject("Money", {
		description:
			"Minor units and an ISO 4217 code. Never a float; @northbank/money is the one implementation. Co-owned by Accounts and Ledger through their shared kernel; declared in Ledger only because a value object has one home",
	});
	kernelMoneyVO.addAttribute("amountMinor", { type: "int64" });
	kernelMoneyVO.addAttribute("currency", { type: "ISO 4217 code" });
	const kernelAccountNumberVO = ledgerBC.addValueObject("AccountNumber", {
		description:
			"Sort code and eight-digit number, from the same library as Money. Co-owned by Accounts and Ledger through their shared kernel; declared in Ledger only because a value object has one home",
	});
	kernelAccountNumberVO.addAttribute("sortCode", { type: "string" });
	kernelAccountNumberVO.addAttribute("number", { type: "string" });

	// LEDGER
	// DISCOVERY: Core Banking lead. Debits equal credits; one currency; never
	// changed once posted; the nightly batch is translated line by line.
	const entryAgg = ledgerBC.addAggregate("JournalEntry", {
		description: "Postings that balance; the whole entry posts or nothing does",
	});
	const entry = entryAgg.addRootEntity("JournalEntry", {
		description: "One balanced movement of money",
	});
	const posting = entryAgg.addEntity("Posting", {
		description: "A debit or credit of an amount to one ledger account",
	});
	// Money and AccountNumber are this context's own, declared above with the
	// shared kernel it keeps with Accounts.
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
	const nominalLedgerAccountVO = ledgerBC.addValueObject(
		"NominalLedgerAccount",
		{
			description:
				"An account of the bank's own chart rather than a customer's: the loan book, scheme suspense, fee income",
			specialises: ledgerAccountVO,
		},
	);
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
		// Money itself is the kernel's, which Ledger keeps with Accounts; the rule
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
	ledgerApp
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
			description:
				"Translate each line of Sovereign's batch file into an entry",
			type: "operation",
			internal: true,
		})
		.raises(entryPosted);

	ledgerBC.addTerm("Posting", {
		definition:
			"One side of a movement: a debit or credit to one ledger account",
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

	// SOVEREIGN CORE (legacy)
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

	ledgerBC
		.addPolicy("Import nightly batch", {
			description: "Each line of the batch file becomes a ledger entry",
		})
		.on(nightlyBatchCompleted)
		.issues(importBatch);
	return {
		ledgerApp,
		nightlyBatchCompleted,
		ledgerBC,
		sovereignBC,
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
	const { ledgerApp, nightlyBatchCompleted, ledgerBC, sovereignBC } = own;

	// DISCOVERY: Core Banking lead, "runs the nightly batch". Card 81 turned that
	// into a NightlyBatch service with a RunNightlyBatch operation so the event had
	// a raiser, and nobody at NorthBank could have told you that: what the lead
	// knows is that the file appears each night, not which of Sovereign's programs
	// cuts it. A big ball of mud says what it emits without saying how, and
	// `event-unraised` no longer asks it to (decision 28, second amendment; card
	// 90). The service and its operation are gone.
	ledgerApp.consumes(nightlyBatchCompleted, {
		pattern: "anti-corruption-layer",
	});

	ws.addRelationship({
		type: "upstream-downstream",
		upstream: sovereignBC,
		downstream: ledgerBC,
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
		description: "Every line of the batch file is translated",
	});
}
