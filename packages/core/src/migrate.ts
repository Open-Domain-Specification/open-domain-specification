import { getDebug } from "./debug";
import {
	boundedcontextRef,
	type SubdomainType,
	subdomainRef,
	type WorkspaceSchema,
} from "./schema";

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
	/** Pre-decision-02: contexts were nested under one subdomain. */
	boundedcontexts?: Record<string, LegacyBoundedContext>;
};

type LegacyBoundedContext = {
	subdomains?: { $ref: string }[];
};

type LegacyWorkspace = {
	domains?: Record<string, LegacyDomain>;
	boundedcontexts?: Record<string, LegacyBoundedContext>;
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

/**
 * Decision 02: bounded contexts belong to the workspace and reference the
 * subdomains they serve. Nested contexts are hoisted and every `$ref` that
 * pointed beneath them is rewritten to the new location.
 */
function hoistBoundedContexts(doc: LegacyWorkspace): void {
	doc.boundedcontexts ??= {};
	const refPrefixes = new Map<string, string>();

	for (const [domainId, domain] of Object.entries(doc.domains ?? {})) {
		for (const [subdomainId, subdomain] of Object.entries(
			domain.subdomains ?? {},
		)) {
			const { $ref: servedSubdomain } = subdomainRef(domainId, subdomainId);
			for (const [legacyId, boundedcontext] of Object.entries(
				subdomain.boundedcontexts ?? {},
			)) {
				const id =
					legacyId in doc.boundedcontexts
						? `${legacyId}_${subdomainId}`
						: legacyId;
				debug(`Hoisting bounded context ${legacyId} to ${id}`);
				boundedcontext.subdomains = [{ $ref: servedSubdomain }];
				doc.boundedcontexts[id] = boundedcontext;
				refPrefixes.set(
					`${servedSubdomain}/boundedcontexts/${legacyId}`,
					boundedcontextRef(id).$ref,
				);
			}
			delete subdomain.boundedcontexts;
		}
	}

	rewriteRefs(doc, refPrefixes);
}

/** Rewrites every `$ref` in the document whose value starts with a mapped prefix. */
function rewriteRefs(node: unknown, prefixes: Map<string, string>): void {
	if (Array.isArray(node)) {
		for (const item of node) rewriteRefs(item, prefixes);
		return;
	}
	if (typeof node !== "object" || node === null) return;

	const record = node as Record<string, unknown>;
	if (typeof record.$ref === "string") {
		for (const [from, to] of prefixes) {
			if (record.$ref === from || record.$ref.startsWith(`${from}/`)) {
				record.$ref = to + record.$ref.slice(from.length);
				break;
			}
		}
	}
	for (const value of Object.values(record)) rewriteRefs(value, prefixes);
}

const MIGRATIONS: Array<(doc: LegacyWorkspace) => void> = [
	classifySubdomains,
	hoistBoundedContexts,
];

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
