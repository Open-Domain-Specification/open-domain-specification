import {
	aggregate,
	consumable,
	entity,
	invariant,
	RelationType,
	valueObjectRef,
	valueobject,
} from "open-domain-schema";
import { retailBankingDomain } from "../../retail-banking.domain.ts";
import { coreBankingSubDomain } from "../core-banking.subdomain.ts";
import { accountsBC } from "./accounts.boundedcontext.ts";

export const accountAggregate = aggregate(accountsBC, {
	id: "account",
	name: "Account",
	description: "Represents a customer's bank account.",
});

export const accountEntity = entity(accountAggregate, {
	id: "account_entity",
	name: "Account",
	description: "Bank account with balance and ownership details.",
	root: true,
});

export const accountDebitedEvent = consumable(accountAggregate, {
	id: "accountDebited",
	name: "Account Debited",
	description: "Event indicating that an account has been debited.",
	type: "event",
	pattern: "published-language",
});

export const depositFundsOp = consumable(accountAggregate, {
	id: "depositFunds",
	name: "Deposit Funds",
	description: "Operation to deposit money into an account.",
	type: "operation",
	pattern: "open-host-service",
});

export const withdrawFundsOp = consumable(accountAggregate, {
	id: "withdrawFunds",
	name: "Withdraw Funds",
	description: "Operation to withdraw money from an account.",
	type: "operation",
	pattern: "open-host-service",
});

export const moneyValueObject = valueobject(accountAggregate, {
	id: "money_vo",
	name: "Money",
	description: "Represents a monetary amount with currency.",
});

export const nonNegativeBalanceInvariant = invariant(accountAggregate, {
	id: "account_non_negative_balance",
	name: "Non-negative Balance",
	description: "An account's balance must never be negative.",
});

accountEntity.relations.push({
	target: valueObjectRef(
		retailBankingDomain,
		coreBankingSubDomain,
		accountsBC,
		accountAggregate,
		moneyValueObject,
	),
	relation: RelationType.ExactlyOne_ExactlyOne,
	label: "has balance",
});
