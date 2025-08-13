import { boundedcontext } from "open-domain-schema";
import { coreBankingSubDomain } from "../core-banking.subdomain.ts";

export const transactions = boundedcontext(coreBankingSubDomain, {
	id: "transactions",
	name: "Transactions Management",
	description: "Manages customer transactions and financial operations.",
});
