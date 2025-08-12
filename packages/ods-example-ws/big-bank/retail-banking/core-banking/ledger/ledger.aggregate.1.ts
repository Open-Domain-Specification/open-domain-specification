import { consumableRef } from "open-domain-schema";
import { retailBankingDomain } from "../../retail-banking.domain.ts";
import { coreBankingSubDomain } from "../core-banking.subdomain.ts";
import {
	fundsTransferAggregate,
	fundsTransferInitiatedEvent,
} from "../transactions/funds-transfer.aggregate.ts";
import { transactions } from "../transactions/transactions.boundedcontext.ts";
import { ledgerAggregate } from "./ledger.aggregate.ts";

ledgerAggregate.consumes.push({
	consumable: consumableRef(
		retailBankingDomain,
		coreBankingSubDomain,
		transactions,
		fundsTransferAggregate,
		fundsTransferInitiatedEvent,
	),
	pattern: "conformist",
});
