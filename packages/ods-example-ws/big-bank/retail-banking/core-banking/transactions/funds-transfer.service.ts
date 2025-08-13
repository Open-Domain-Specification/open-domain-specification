import { consumable, consumableRef, service } from "open-domain-schema";
import { retailBankingDomain } from "../../retail-banking.domain.ts";
import {
	accountAggregate,
	accountDebitedEvent,
	depositFundsOp,
	withdrawFundsOp,
} from "../accounts/account.aggregate.ts";
import { accountsBC } from "../accounts/accounts.boundedcontext.ts";
import { coreBankingSubDomain } from "../core-banking.subdomain.ts";
import {
	ledgerAggregate,
	postLedgerEntryOp,
} from "../ledger/ledger.aggregate.ts";
import { ledger } from "../ledger/ledger.boundedcontext.ts";
import { transactions } from "./transactions.boundedcontext.ts";

export const fundsTransferService = service(transactions, {
	id: "funds_transfer_service",
	type: "application",
	name: "Funds Transfer Service",
	description: "Coordinates account debits and ledger postings for a transfer.",
});

fundsTransferService.consumes.push({
	consumable: consumableRef(
		retailBankingDomain,
		coreBankingSubDomain,
		accountsBC,
		accountAggregate,
		withdrawFundsOp,
	),
	pattern: "customer-supplier",
});

fundsTransferService.consumes.push({
	consumable: consumableRef(
		retailBankingDomain,
		coreBankingSubDomain,
		accountsBC,
		accountAggregate,
		depositFundsOp,
	),
	pattern: "customer-supplier",
});

fundsTransferService.consumes.push({
	consumable: consumableRef(
		retailBankingDomain,
		coreBankingSubDomain,
		ledger,
		ledgerAggregate,
		postLedgerEntryOp,
	),
	pattern: "customer-supplier",
});

fundsTransferService.consumes.push({
	consumable: consumableRef(
		retailBankingDomain,
		coreBankingSubDomain,
		accountsBC,
		accountAggregate,
		accountDebitedEvent,
	),
	pattern: "customer-supplier",
});

export const initiateFundsTransferOp = consumable(fundsTransferService, {
	id: "initiateFundsTransfer",
	name: "Initiate Funds Transfer",
	description: "Operation to begin a transfer request.",
	type: "operation",
	pattern: "open-host-service",
});
