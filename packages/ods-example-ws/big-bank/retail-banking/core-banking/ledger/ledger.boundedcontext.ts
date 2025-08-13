import { boundedcontext } from "open-domain-schema";
import { coreBankingSubDomain } from "../core-banking.subdomain.ts";

export const ledger = boundedcontext(coreBankingSubDomain, {
	id: "ledger",
	name: "Ledger Management",
	description: "Maintains the financial ledger and accounting records.",
});
