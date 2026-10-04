import type { Workspace, WorkspaceSet } from "@open-domain-specification/core";
import type { Published as CustomerPlatformSurface } from "./customer_platform.ts";
import { foreign } from "./foreign.ts";

/** This team's file in the NorthBank set. */
export const FILE = "digital_platform.json";

/** The workspace this team owns, as the build creates it before `declare`. */
export const meta = {
	name: "NorthBank Digital Platform",
	attributes: {
		id: "northbank_digital_platform",
		description:
			"NorthBank's Digital Platform Team: identity and access, and the Platform domain.",
		version: "1.0.0",
		primaryColor: "#1d4ed8",
	},
} as const;

/**
 * What other teams may name in this file. A team's `link` reaches into another
 * team's workspace only through these refs, type-checked against this list.
 */
export const published = {
	consumables: [
		"#/boundedcontexts/identity_&_access/services/identity_app/provides/authenticate_customer",
	],
	contexts: ["#/boundedcontexts/identity_&_access"],
} as const;
export type Published = typeof published;

/**
 * Everything this team states about its own file. An attribute, policy, process or
 * context that names an element of another file is created here without that
 * name and given it in `link`, so the order of every list in the file is the
 * order it was written in.
 */
function build(ws: Workspace) {
	const platform = ws.addDomain("Platform", {
		description: "Shared technical capabilities",
	});
	platform.addSubdomain("Identity & Access", {
		type: "generic",
		description:
			"Login and step-up authentication. Vendor built; never placed on the capability map",
	});

	const digitalPlatformTeam = ws.addTeam("Digital Platform Team", {
		description: "Identity and access",
	});

	// DELIBERATE (context-serves-subdomain): the vendor-built login platform was
	// never placed on the capability map, so it serves no subdomain here.
	const identityBC = ws.addBoundedContext("Identity & Access", {
		description: "Usernames, credentials, step-up authentication",
		team: digitalPlatformTeam,
	});

	// IDENTITY & ACCESS
	const credentialAgg = identityBC.addAggregate("Credential", {
		description: "A customer's login",
	});
	const credential = credentialAgg.addRootEntity("Credential", {
		description: "Username and step-up factors for one customer",
	});
	// The credential is identified by whose it is, and the Customer root is in
	// Customer & KYC: the same id is this entity's identity and a foreign one.
	const credentialCustomerIdAttr = credential.addAttribute("customerId", {
		type: "string",
		identity: true,
	});
	credential.addAttribute("username", { type: "string" });
	credential.addAttribute("stepUpEnrolled", { type: "boolean" });
	const customerAuthenticated = credentialAgg.provides(
		"CustomerAuthenticated",
		{
			description: "A customer proved who they are on a channel",
			type: "event",
			pattern: "published-language",
		},
	);
	// What a context offers outward leaves an application service; an
	// aggregate's operations are its own context's (decision 17).
	const identityApp = identityBC.addService("IdentityApp", {
		description:
			"Identity & Access' application service: the boundary channels authenticate customers through",
		type: "application",
	});
	identityApp
		.provides("AuthenticateCustomer", {
			description: "Verify credentials and step-up",
			type: "operation",
			pattern: "open-host-service",
		})
		.raises(customerAuthenticated);
	return {
		credentialCustomerIdAttr,
	};
}

const built = new WeakMap<Workspace, ReturnType<typeof build>>();

/** Phase one: everything this team can state without naming another team's file. */
export function declare(ws: Workspace): void {
	built.set(ws, build(ws));
}

/** Phase two: every statement that names an element of another file. Run after the set exists. */
export function link(set: WorkspaceSet): void {
	const ws = set.byPath(FILE);
	const own = ws && built.get(ws);
	if (!own) throw new Error(`${FILE} was not declared before it was linked`);
	const { credentialCustomerIdAttr } = own;
	const customerPlatform = foreign<CustomerPlatformSurface>(
		set,
		"customer_platform.json",
	);
	const customer = customerPlatform.entity(
		"#/boundedcontexts/customer_&_kyc/aggregates/customer/entities/customer",
	);

	credentialCustomerIdAttr.identifies = customer;
}
