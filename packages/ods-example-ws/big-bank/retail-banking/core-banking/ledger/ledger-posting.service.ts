import { consumableRef, service } from "open-domain-schema";
import { retailBankingDomain } from "../../retail-banking.domain.ts";
import { coreBankingSubDomain } from "../core-banking.subdomain.ts";
import {
	fundsTransferAggregate,
	fundsTransferInitiatedEvent,
} from "../transactions/funds-transfer.aggregate.ts";
import { transactions } from "../transactions/transactions.boundedcontext.ts";
import { ledger } from "./ledger.boundedcontext.ts";

const ledgerPostingService = service(ledger, {
	id: "ledger_posting_service",
	type: "domain",
	name: "Ledger Posting Service",
	description:
		"Listens to transaction events and posts appropriate ledger entries.",
});

ledgerPostingService.consumes.push({
	consumable: consumableRef(
		retailBankingDomain,
		coreBankingSubDomain,
		transactions,
		fundsTransferAggregate,
		fundsTransferInitiatedEvent,
	),
	pattern: "conformist",
});
