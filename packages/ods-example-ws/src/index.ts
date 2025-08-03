import { writeFileSync } from "node:fs";
import {
	type Aggregate,
	type BoundedContext,
	type Consumable,
	type Consumption,
	type Domain,
	type Entity,
	type EntityRelation,
	type Invariant,
	RelationType,
	type Service,
	type ValueObject,
	type Workspace,
} from "open-domain-schema";

/* ===========================
   ENTITY RELATIONSHIPS
=========================== */
const accountToBalance: EntityRelation = {
	id: "account_balance",
	target: "money_vo",
	relation: RelationType.ExactlyOne_ExactlyOne,
	label: "has balance",
};

const transferToDetails: EntityRelation = {
	id: "transfer_details",
	target: "transfer_details_vo",
	relation: RelationType.ExactlyOne_ExactlyOne,
	label: "has details",
};

const transferToSourceAccount: EntityRelation = {
	id: "transfer_source_account",
	target: "account_entity",
	relation: RelationType.ExactlyOne_ExactlyOne_Dashed,
	label: "source account",
};

const transferToDestAccount: EntityRelation = {
	id: "transfer_dest_account",
	target: "account_entity",
	relation: RelationType.ExactlyOne_ExactlyOne_Dashed,
	label: "destination account",
};

const ledgerToAmount: EntityRelation = {
	id: "ledger_entry_amount",
	target: "entryAmount_vo",
	relation: RelationType.ExactlyOne_ExactlyOne,
	label: "has amount",
};

const ledgerToAccount: EntityRelation = {
	id: "ledger_entry_account",
	target: "account_entity",
	relation: RelationType.ExactlyOne_ExactlyOne_Dashed,
	label: "posted to account",
};

/* ===========================
   ENTITIES & VALUE OBJECTS
=========================== */
const accountEntity: Entity = {
	id: "account_entity",
	name: "Account",
	description: "Bank account with balance and ownership details.",
	root: true,
	relations: [accountToBalance],
};

const fundsTransferEntity: Entity = {
	id: "transfer",
	name: "FundsTransfer",
	description: "Funds transfer transaction entity.",
	root: true,
	relations: [
		transferToDetails,
		transferToSourceAccount,
		transferToDestAccount,
	],
};

const ledgerEntryEntity: Entity = {
	id: "ledgerEntry",
	name: "LedgerEntry",
	description: "Represents a credit or debit in the ledger.",
	root: true,
	relations: [ledgerToAmount, ledgerToAccount],
};

const moneyValueObject: ValueObject = {
	id: "money_vo",
	name: "Money",
	description: "Represents a monetary amount with currency.",
};

const transferDetailsVO: ValueObject = {
	id: "transfer_details_vo",
	name: "Transfer Details",
	description: "Contains amount, source and destination details.",
};

const entryAmountVO: ValueObject = {
	id: "entryAmount_vo",
	name: "Entry Amount",
	description: "Amount and currency of a ledger entry.",
};

/* ===========================
   INVARIANTS
=========================== */
const nonNegativeBalanceInvariant: Invariant = {
	id: "account_non_negative_balance",
	name: "Non-negative Balance",
	description: "An account's balance must never be negative.",
};

const positiveTransferAmountInvariant: Invariant = {
	id: "positive_transfer_amount",
	name: "Positive Transfer Amount",
	description: "A funds transfer must involve a positive amount.",
};

const differentSourceAndDestInvariant: Invariant = {
	id: "distinct_accounts",
	name: "Distinct Source and Destination Accounts",
	description: "Funds must be transferred between two different accounts.",
};

const ledgerBalancingInvariant: Invariant = {
	id: "ledger_balancing",
	name: "Balanced Ledger Entry",
	description: "Ledger entries must balance with equal debits and credits.",
};

/* ===========================
   OPERATIONS & EVENTS
=========================== */
const initiateFundsTransferOp: Consumable = {
	id: "initiateFundsTransfer",
	name: "Initiate Funds Transfer",
	description: "Operation to begin a transfer request.",
	type: "operation",
	pattern: "open-host-service",
};

const withdrawFundsOp: Consumable = {
	id: "withdrawFunds",
	name: "Withdraw Funds",
	description: "Operation to withdraw money from an account.",
	type: "operation",
	pattern: "open-host-service",
};

const depositFundsOp: Consumable = {
	id: "depositFunds",
	name: "Deposit Funds",
	description: "Operation to deposit money into an account.",
	type: "operation",
	pattern: "open-host-service",
};

const postLedgerEntryOp: Consumable = {
	id: "postLedgerEntry",
	name: "Post Ledger Entry",
	description: "Operation to record a ledger entry for a funds transfer.",
	type: "operation",
	pattern: "open-host-service",
};

const fundsTransferInitiatedEvent: Consumable = {
	id: "fundsTransferInitiated",
	name: "Funds Transfer Initiated",
	description: "Event raised when a funds transfer is started.",
	type: "event",
	pattern: "published-language",
};

const accountDebitedEvent: Consumable = {
	id: "accountDebited",
	name: "Account Debited",
	description: "Event indicating that an account has been debited.",
	type: "event",
	pattern: "published-language",
};

const ledgerUpdatedEvent: Consumable = {
	id: "ledgerUpdated",
	name: "Ledger Updated",
	description: "Indicates that a ledger entry was successfully created.",
	type: "event",
	pattern: "published-language",
};

/* ===========================
   CONSUMPTIONS
=========================== */
const consumesWithdrawFunds: Consumption = {
	target: "withdrawFunds",
	pattern: "customer-supplier",
};

const consumesDepositFunds: Consumption = {
	target: "depositFunds",
	pattern: "customer-supplier",
};

const consumesPostLedgerEntry: Consumption = {
	target: "postLedgerEntry",
	pattern: "customer-supplier",
};

const consumesAccountDebited: Consumption = {
	target: "accountDebited",
	pattern: "customer-supplier",
};

const consumesFundsTransferInitiated: Consumption = {
	target: "fundsTransferInitiated",
	pattern: "conformist",
};

/* ===========================
   AGGREGATES
=========================== */
const accountAggregate: Aggregate = {
	id: "account",
	name: "Account",
	description: "Represents a customer's bank account.",
	entities: [accountEntity],
	valueObjects: [moneyValueObject],
	provides: [accountDebitedEvent, withdrawFundsOp, depositFundsOp],
	invariants: [nonNegativeBalanceInvariant],
};

const fundsTransferAggregate: Aggregate = {
	id: "funds_transfer",
	name: "Funds Transfer",
	description: "Initiates and tracks funds transfers between accounts.",
	entities: [fundsTransferEntity],
	valueObjects: [transferDetailsVO],
	provides: [fundsTransferInitiatedEvent],
	invariants: [
		positiveTransferAmountInvariant,
		differentSourceAndDestInvariant,
	],
};

const ledgerAggregate: Aggregate = {
	id: "ledger_entry",
	name: "Ledger Entry",
	description: "Posts accounting entries for financial transactions.",
	entities: [ledgerEntryEntity],
	valueObjects: [entryAmountVO],
	provides: [ledgerUpdatedEvent, postLedgerEntryOp],
	consumes: [consumesFundsTransferInitiated],
	invariants: [ledgerBalancingInvariant],
};

/* ===========================
   SERVICES
=========================== */
const fundsTransferService: Service = {
	id: "funds_transfer_service",
	type: "application",
	name: "Funds Transfer Service",
	description: "Coordinates account debits and ledger postings for a transfer.",
	provides: [initiateFundsTransferOp],
	consumes: [
		consumesWithdrawFunds,
		consumesDepositFunds,
		consumesPostLedgerEntry,
		consumesAccountDebited,
	],
};

const accountValidationService: Service = {
	id: "account_validation_service",
	type: "domain",
	name: "Account Validation Service",
	description: "Validates the existence and status of accounts.",
};

const ledgerPostingService: Service = {
	id: "ledger_posting_service",
	type: "domain",
	name: "Ledger Posting Service",
	description:
		"Listens to transaction events and posts appropriate ledger entries.",
	consumes: [consumesFundsTransferInitiated],
};

/* ===========================
   BOUNDED CONTEXTS
=========================== */
const accounts: BoundedContext = {
	id: "accounts",
	name: "Accounts Management",
	description: "Handles customer accounts and related operations.",
	aggregates: [accountAggregate],
	services: [accountValidationService],
};

const transactions: BoundedContext = {
	id: "transactions",
	name: "Transactions Management",
	description: "Manages customer transactions and financial operations.",
	aggregates: [fundsTransferAggregate],
	services: [fundsTransferService],
};

const ledger: BoundedContext = {
	id: "ledger",
	name: "Ledger Management",
	description: "Maintains the financial ledger and accounting records.",
	aggregates: [ledgerAggregate],
	services: [ledgerPostingService],
};

/* ===========================
   DOMAIN & WORKSPACE
=========================== */
const retailBankingDomain: Domain = {
	id: "retail_banking",
	name: "Retail Banking",
	type: "core",
	description: "All aspects of retail banking operations.",
	subdomains: [
		{
			id: "core_banking",
			name: "Core Banking",
			description:
				"Core banking operations including accounts and transactions.",
			boundedContexts: [accounts, transactions, ledger],
		},
	],
};

const bigBankWorkspace: Workspace = {
	odsVersion: "0.0.0",
	name: "Big Bank PLC - Core Banking System",
	homepage: "https://bigbank.example.com",
	logoUrl: "https://cdn-icons-png.flaticon.com/512/1511/1511168.png",
	primaryColor: "#0F68BD",
	description:
		"This workspace models the core banking system of Big Bank PLC using Domain-Driven Design concepts and the Open Domain Schema.",
	version: "1.0.0",
	domains: [retailBankingDomain],
};

/* ===========================
   OUTPUT
=========================== */
writeFileSync(
	"./dist/big-bank-workspace.json",
	JSON.stringify(bigBankWorkspace, null, 2),
	"utf-8",
);
