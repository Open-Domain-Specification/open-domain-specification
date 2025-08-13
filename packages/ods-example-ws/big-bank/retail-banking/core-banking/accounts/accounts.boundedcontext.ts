import { boundedcontext } from "open-domain-schema";
import { coreBankingSubDomain } from "../core-banking.subdomain.ts";

export const accountsBC = boundedcontext(coreBankingSubDomain, {
	id: "accounts",
	name: "Accounts Management",
	description: "Handles customer accounts and related operations.",
});
