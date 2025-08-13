import { domain } from "open-domain-schema";
import { bigBankWorkspace } from "../workspace.ts";

export const retailBankingDomain = domain(bigBankWorkspace, {
	id: "retail_banking",
	name: "Retail Banking",
	type: "core",
	description: "All aspects of retail banking operations.",
});
