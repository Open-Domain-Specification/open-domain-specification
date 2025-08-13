import {
	aggregate,
	consumable,
	entity,
	entityRef,
	invariant,
	RelationType,
	valueObjectRef,
	valueobject,
} from "open-domain-schema";
import { retailBankingDomain } from "../../retail-banking.domain.ts";
import {
	accountAggregate,
	accountEntity,
} from "../accounts/account.aggregate.ts";
import { accountsBC } from "../accounts/accounts.boundedcontext.ts";
import { coreBankingSubDomain } from "../core-banking.subdomain.ts";
import { ledger } from "./ledger.boundedcontext.ts";

export const ledgerAggregate = aggregate(ledger, {
	id: "ledger_entry",
	name: "Ledger Entry",
	description: "Posts accounting entries for financial transactions.",
});

invariant(ledgerAggregate, {
	id: "ledger_balancing",
	name: "Balanced Ledger Entry",
	description: "Ledger entries must balance with equal debits and credits.",
});

const entryAmountVO = valueobject(ledgerAggregate, {
	id: "entryAmount_vo",
	name: "Entry Amount",
	description: "Amount and currency of a ledger entry.",
});

export const ledgerEntryEntity = entity(ledgerAggregate, {
	id: "ledgerEntry",
	name: "LedgerEntry",
	description: "Represents a credit or debit in the ledger.",
	root: true,
});

ledgerEntryEntity.relations.push({
	target: valueObjectRef(
		retailBankingDomain,
		coreBankingSubDomain,
		ledger,
		ledgerAggregate,
		entryAmountVO,
	),
	relation: RelationType.ExactlyOne_ExactlyOne,
	label: "has amount",
});

ledgerEntryEntity.relations.push({
	target: entityRef(
		retailBankingDomain,
		coreBankingSubDomain,
		accountsBC,
		accountAggregate,
		accountEntity,
	),
	relation: RelationType.ExactlyOne_ExactlyOne_Dashed,
	label: "posted to account",
});

export const ledgerUpdatedEvent = consumable(ledgerAggregate, {
	id: "ledgerUpdated",
	name: "Ledger Updated",
	description: "Indicates that a ledger entry was successfully created.",
	type: "event",
	pattern: "published-language",
});

export const postLedgerEntryOp = consumable(ledgerAggregate, {
	id: "postLedgerEntry",
	name: "Post Ledger Entry",
	description: "Operation to record a ledger entry for a funds transfer.",
	type: "operation",
	pattern: "open-host-service",
});
