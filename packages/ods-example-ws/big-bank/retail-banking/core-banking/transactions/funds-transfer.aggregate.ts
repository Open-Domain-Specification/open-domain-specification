import {
	aggregate,
	consumable,
	entity,
	entityRef,
	invariant,
	RelationType,
	type ValueObject,
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
import { transactions } from "./transactions.boundedcontext.ts";

export const fundsTransferAggregate = aggregate(transactions, {
	id: "funds_transfer",
	name: "Funds Transfer",
	description: "Initiates and tracks funds transfers between accounts.",
});

invariant(fundsTransferAggregate, {
	id: "positive_transfer_amount",
	name: "Positive Transfer Amount",
	description: "A funds transfer must involve a positive amount.",
});

invariant(fundsTransferAggregate, {
	id: "distinct_accounts",
	name: "Distinct Source and Destination Accounts",
	description: "Funds must be transferred between two different accounts.",
});

export const fundsTransferInitiatedEvent = consumable(fundsTransferAggregate, {
	id: "fundsTransferInitiated",
	name: "Funds Transfer Initiated",
	description: "Event raised when a funds transfer is started.",
	type: "event",
	pattern: "published-language",
});

const fundsTransferEntity = entity(fundsTransferAggregate, {
	id: "transfer",
	name: "FundsTransfer",
	description: "Funds transfer transaction entity.",
	root: true,
});

const transferDetailsVO: ValueObject = valueobject(fundsTransferAggregate, {
	id: "transfer_details_vo",
	name: "Transfer Details",
	description: "Contains amount, source and destination details.",
});

fundsTransferEntity.relations.push({
	target: valueObjectRef(
		retailBankingDomain,
		coreBankingSubDomain,
		transactions,
		fundsTransferAggregate,
		transferDetailsVO,
	),
	relation: RelationType.ExactlyOne_ExactlyOne,
	label: "has details",
});

fundsTransferEntity.relations.push({
	target: entityRef(
		retailBankingDomain,
		coreBankingSubDomain,
		accountsBC,
		accountAggregate,
		accountEntity,
	),
	relation: RelationType.ExactlyOne_ExactlyOne_Dashed,
	label: "source account",
});

fundsTransferEntity.relations.push({
	target: entityRef(
		retailBankingDomain,
		coreBankingSubDomain,
		accountsBC,
		accountAggregate,
		accountEntity,
	),
	relation: RelationType.ExactlyOne_ExactlyOne_Dashed,
	label: "destination account",
});
