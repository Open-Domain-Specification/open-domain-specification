import { getDebug } from "./debug";
import type { SubdomainType, WorkspaceSchema } from "./schema";

const debug = getDebug("migrate");

/**
 * The shapes older ODS documents may carry. Each field here has been
 * removed or relocated in the current {@link WorkspaceSchema}; the
 * migrations below translate them forward so `Workspace.fromSchema`
 * keeps accepting documents produced by earlier releases.
 */
type LegacyDomain = {
	/** Pre-decision-01: classification lived on the domain. */
	type?: SubdomainType;
	subdomains?: Record<string, LegacySubdomain>;
};

type LegacySubdomain = {
	type?: SubdomainType;
};

type LegacyWorkspace = {
	domains?: Record<string, LegacyDomain>;
};

const DEFAULT_SUBDOMAIN_TYPE: SubdomainType = "supporting";

/**
 * Decision 01: subdomains carry the core/supporting/generic classification.
 * A subdomain without a type inherits its domain's legacy type.
 */
function classifySubdomains(doc: LegacyWorkspace): void {
	for (const [domainId, domain] of Object.entries(doc.domains ?? {})) {
		for (const [subdomainId, subdomain] of Object.entries(
			domain.subdomains ?? {},
		)) {
			if (subdomain.type) continue;
			subdomain.type = domain.type ?? DEFAULT_SUBDOMAIN_TYPE;
			debug(
				`Subdomain ${domainId}/${subdomainId} had no type; set to ${subdomain.type}`,
			);
		}
		delete domain.type;
	}
}

const MIGRATIONS: Array<(doc: LegacyWorkspace) => void> = [classifySubdomains];

/**
 * Brings a workspace document produced by any earlier ODS release up to the
 * current schema. Mutates and returns a deep copy of the input, so the
 * caller's object is left untouched.
 */
export function migrateWorkspaceSchema(raw: unknown): WorkspaceSchema {
	const doc = JSON.parse(JSON.stringify(raw)) as LegacyWorkspace;
	for (const migration of MIGRATIONS) migration(doc);
	return doc as WorkspaceSchema;
}
