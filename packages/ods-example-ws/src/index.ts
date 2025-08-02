import * as fs from "node:fs";
import type { BoundedContext, Domain, Workspace } from "open-domain-schema";

const accounts: BoundedContext = {
	id: "accounts",
	name: "Accounts Management",
	description: "Handles customer accounts and related operations.",
};

const transactions: BoundedContext = {
	id: "transactions",
	name: "Transactions Management",
	description: "Manages customer transactions and financial operations.",
};

const ledger: BoundedContext = {
	id: "ledger",
	name: "Ledger Management",
	description: "Maintains the financial ledger and accounting records.",
};

const identity: BoundedContext = {
	id: "identity_management",
	name: "Identity Management",
	description: "Manages customer identities and authentication.",
};

const accessControl: BoundedContext = {
	id: "access_control",
	name: "Access Control",
	description: "Handles access control and permissions for banking services.",
};

const kyc: BoundedContext = {
	id: "kyc",
	name: "Know Your Customer (KYC)",
	description:
		"Ensures compliance with KYC regulations and customer verification.",
};

const retailBankingDomain: Domain = {
	id: "retail_banking",
	name: "Retail Banking",
	type: "core",
	description: "All aspects of retail banking operations.",
	subdomains: [
		{
			id: "core_banking",
			name: "Core Banking",
			description:
				"Core banking operations including accounts and transactions.",
			boundedContexts: [accounts, transactions, ledger],
		},
		{
			id: "identity_and_access_management",
			name: "Identity and Access Management",
			description:
				"Manages customer identities, authentication, and access control.",
			boundedContexts: [identity, accessControl, kyc],
		},
		{
			id: "digital_banking",
			name: "Digital Banking",
			description: "Customer-facing digital banking services.",
			boundedContexts: [
				{
					id: "digital_access",
					name: "Digital Access",
					description:
						"Provides digital access to banking services managing logins, sessions, and user authentication and authorisation flows.",
				},
				{
					id: "customer_banking",
					name: "Customer Banking",
					description:
						"Enables customers to view accounts, make transfers, and deposit cheques.",
				},
			],
		},
	],
};

const bigBankWorkspace: Workspace = {
	odsVersion: "0.0.0",
	logoUrl: "https://cdn-icons-png.flaticon.com/512/1511/1511168.png",
	name: "Big Bank PLC - Core Banking System",
	homepage: "https://bigbank.example.com",
	primaryColor: "#0F68BD",
	description:
		"This workspace models the core banking system of Big Bank PLC using Domain-Driven Design concepts and the Open Domain Schema.",
	version: "1.0.0",
	domains: [retailBankingDomain],
};

fs.writeFileSync(
	"./dist/big-bank-workspace.json",
	JSON.stringify(bigBankWorkspace, null, 2),
	"utf-8",
);
