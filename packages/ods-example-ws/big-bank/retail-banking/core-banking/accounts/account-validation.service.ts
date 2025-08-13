import { service } from "open-domain-schema";
import { accountsBC } from "./accounts.boundedcontext.ts";

export const accountValidationService = service(accountsBC, {
	id: "account_validation_service",
	type: "domain",
	name: "Account Validation Service",
	description: "Validates the existence and status of accounts.",
});
