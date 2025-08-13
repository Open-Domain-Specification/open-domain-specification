import { subdomain } from "open-domain-schema";
import { retailBankingDomain } from "../retail-banking.domain.ts";

export const coreBankingSubDomain = subdomain(retailBankingDomain, {
	id: "core_banking",
	name: "Core Banking",
	description: "Core banking operations including accounts and transactions.",
});
