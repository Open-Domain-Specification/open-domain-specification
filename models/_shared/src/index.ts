import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import {
	type BoundedContext,
	Workspace,
} from "@open-domain-specification/core";
import { toDoc } from "@open-domain-specification/doc";

const require = createRequire(import.meta.url);

/**
 * Generates one reference model package's build output: the docsify docs
 * under `docs/`, and `.ods/<file>.json` with `$schema` pointing at a copy of
 * core's JSON schema written beside it as `.ods/schema.json` -- what the VS
 * Code extension and the pages viewer open.
 */
export async function generate(
	workspace: Workspace,
	{ file }: { file: string },
): Promise<void> {
	const diagnostics = workspace.validate();
	console.log(`${workspace.name}: ${diagnostics.length} diagnostic(s)`);
	for (const d of diagnostics) {
		console.log(`  [${d.severity}] ${d.rule}: ${d.message} (${d.ref})`);
	}

	const docs = await toDoc(workspace);
	for (const [docFile, content] of Object.entries(docs)) {
		const target = path.join("docs", docFile);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, content, "utf-8");
	}

	fs.mkdirSync(".ods", { recursive: true });
	fs.writeFileSync(
		path.join(".ods", `${file}.json`),
		JSON.stringify(
			{ $schema: "./schema.json", ...workspace.toSchema() },
			null,
			2,
		),
		"utf-8",
	);

	const coreSchema = require.resolve(
		"@open-domain-specification/core/dist/workspace.schema.json",
	);
	fs.copyFileSync(coreSchema, path.join(".ods", "schema.json"));
}

/**
 * The assertions shared, byte-for-byte, by RiverMart's, StreamLine's and
 * NorthBank's workspace tests: at least three relationship types are used and
 * there is one big ball of mud, every context the enterprise owns has a team,
 * there's a glossary,
 * policies and schemas on cross-context events, `validate()` reports exactly
 * the deliberate problems (by rule id and severity), and the workspace
 * round-trips through `Workspace.fromSchema`.
 *
 * The relationship check is a floor, not a census. Requiring all five types of
 * every model would make a model invent a relationship it does not have -- a
 * partnership with traffic one way, say, which `partnership-backed` rightly
 * warns about. Covering all five is the reference set's job together, and
 * `relationship-types.test.ts` in this package asserts it.
 *
 * Each reference package keeps only its own id assertion, its `deliberate`
 * array, and a single `it` that calls this helper.
 */
export function assertStressTestWorkspace(
	workspace: Workspace,
	deliberate: Array<{ rule: string; severity: "error" | "warning" }>,
): void {
	const types = new Set(workspace.relationships.map((r) => r.type));
	assert.ok(
		types.size >= 3,
		`${workspace.name} shows only ${types.size} relationship type(s): ${[...types].sort().join(", ")}`,
	);
	const legacy = [...workspace.boundedcontexts.values()].filter(
		(bc) => bc.bigBallOfMud,
	);
	assert.strictEqual(legacy.length, 1);

	// Every context the enterprise owns has a team. An external context is
	// somebody else's system, so nobody here owns it and the model does not
	// invent a team to satisfy the check (decision 28).
	for (const bc of workspace.boundedcontexts.values()) {
		if (bc.external) continue;
		assert.notStrictEqual(bc.team, undefined, `${bc.name} has no team`);
	}

	const contexts = [...workspace.boundedcontexts.values()];
	assert.ok(contexts.some((bc) => bc.glossary.size > 0));
	assert.ok(contexts.reduce((n, bc) => n + bc.policies.size, 0) > 5);
	for (const bc of contexts) {
		for (const provider of [
			...bc.aggregates.values(),
			...bc.services.values(),
		]) {
			for (const c of provider.consumables.values()) {
				const consumedElsewhere = c.consumptions.some(
					(it) => it.consumer.boundedcontext !== bc,
				);
				if (c.type === "event" && consumedElsewhere && !c.internal) {
					assert.notStrictEqual(c.schema, undefined, `${c.name} has no schema`);
				}
			}
		}
	}

	const diagnostics = workspace
		.validate()
		.map(({ rule, severity }) => ({ rule, severity }))
		.sort((a, b) => a.rule.localeCompare(b.rule));
	assert.deepStrictEqual(
		diagnostics,
		[...deliberate].sort((a, b) => a.rule.localeCompare(b.rule)),
	);

	const schema = workspace.toSchema();
	const rebuilt = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
	assert.deepStrictEqual(rebuilt.toSchema(), schema);
	assert.deepStrictEqual(rebuilt.validate(), workspace.validate());
}

/** One entry of `_sidebar.md`: its nesting depth, link text and href. */
type SidebarEntry = { depth: number; label: string; href: string };

const SIDEBAR = "_sidebar.md";

/**
 * Docsify's heading slug: the rendered text, lowercased, punctuation dropped
 * and whitespace collapsed to single hyphens. Markdown links inside a heading
 * contribute only their text, since that is all the reader sees.
 */
function slugify(heading: string): string {
	return heading
		.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
		.toLowerCase()
		.replace(/[^\w\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-");
}

/**
 * Every inline markdown link and image in `md`, as raw destinations.
 *
 * Destinations are read with a paren counter rather than a regex: a workspace
 * named "Swagger Petstore (v3)" produces the page `swagger_petstore_(v3)/…`,
 * and a `[^)]+` destination would truncate at the inner bracket.
 */
function markdownLinks(md: string): string[] {
	const destinations: string[] = [];
	for (const match of md.matchAll(/!?\[[^\]]*\]\(/g)) {
		let index = (match.index as number) + match[0].length;
		let depth = 1;
		let destination = "";
		while (index < md.length) {
			const char = md[index];
			if (char === "(") depth++;
			else if (char === ")" && --depth === 0) break;
			destination += char;
			index++;
		}
		if (depth === 0) destinations.push(destination.trim());
	}
	return destinations;
}

/** Resolves a link destination found in `from` against the site root. */
function resolveFrom(from: string, destination: string): string {
	const segments = destination.startsWith("/")
		? destination.slice(1).split("/")
		: [...from.split("/").slice(0, -1), ...destination.split("/")];
	const stack: string[] = [];
	for (const segment of segments) {
		if (segment === "" || segment === ".") continue;
		if (segment === "..") stack.pop();
		else stack.push(segment);
	}
	return stack.join("/");
}

/** The `index.md` (and, for the workspace, `glossary.md`) pages toDoc emits. */
function expectedPages(workspace: Workspace): string[] {
	const pages = [`${workspace.path}/index.md`, `${workspace.path}/glossary.md`];
	for (const domain of workspace.domains.values()) {
		pages.push(`${domain.path}/index.md`);
		for (const subdomain of domain.subdomains.values()) {
			pages.push(`${subdomain.path}/index.md`);
		}
	}
	for (const context of workspace.boundedcontexts.values()) {
		pages.push(`${context.path}/index.md`);
		for (const aggregate of context.aggregates.values()) {
			pages.push(`${aggregate.path}/index.md`);
		}
		for (const service of context.services.values()) {
			pages.push(`${service.path}/index.md`);
		}
	}
	return pages;
}

/**
 * The sidebar the generator should emit, depth-first: the workspace, its
 * glossary, then each domain, its subdomains, and every context under each
 * subdomain it serves; contexts serving no subdomain hang off the workspace.
 */
function expectedSidebar(workspace: Workspace): SidebarEntry[] {
	const entry = (depth: number, label: string, file: string): SidebarEntry => ({
		depth,
		label,
		href: `/${file}`,
	});

	const contextEntry = (context: BoundedContext, depth: number) =>
		entry(depth, context.name, `${context.path}/index.md`);

	const entries: SidebarEntry[] = [
		entry(0, workspace.name, `${workspace.path}/index.md`),
		entry(1, "Glossary", `${workspace.path}/glossary.md`),
	];
	for (const domain of workspace.domains.values()) {
		entries.push(entry(1, domain.name, `${domain.path}/index.md`));
		for (const subdomain of domain.subdomains.values()) {
			entries.push(entry(2, subdomain.name, `${subdomain.path}/index.md`));
			for (const context of subdomain.boundedcontexts.values()) {
				entries.push(contextEntry(context, 3));
			}
		}
	}
	for (const context of workspace.boundedcontexts.values()) {
		if (context.subdomains.size === 0) entries.push(contextEntry(context, 1));
	}
	return entries;
}

/** Parses `_sidebar.md` into its entries, one per `* [label](href)` line. */
function parseSidebar(sidebar: string): SidebarEntry[] {
	return sidebar
		.split("\n")
		.filter((line) => line.trim().length > 0)
		.map((line) => {
			const match = /^(\t*)\* \[([^\]]*)\]\((.*)\)$/.exec(line);
			assert.ok(match, `_sidebar.md line is not a list entry: ${line}`);
			return { depth: match[1].length, label: match[2], href: match[3] };
		});
}

/** Fails with every problem listed under `title`, or passes if there are none. */
function assertNoProblems(title: string, problems: string[]): void {
	assert.deepStrictEqual(
		problems,
		[],
		`${title}:\n  ${problems.join("\n  ")}\n`,
	);
}

/** The anchors each `.md` page offers, one per heading, keyed by file. */
function headingAnchors(
	docs: Record<string, string>,
): Map<string, Set<string>> {
	const anchors = new Map<string, Set<string>>();
	for (const [file, content] of markdownPages(docs)) {
		anchors.set(
			file,
			new Set(
				content
					.split("\n")
					.filter((line) => /^#{1,6} /.test(line))
					.map((line) => slugify(line.replace(/^#+ /, ""))),
			),
		);
	}
	return anchors;
}

/**
 * Every link in every page that points at a file the site does not have, or at
 * an anchor the target page does not offer. Links carrying a URL scheme, and
 * protocol-relative links, are somebody else's to check.
 */
function brokenLinks(docs: Record<string, string>): string[] {
	const files = new Set(Object.keys(docs));
	const anchors = headingAnchors(docs);
	const broken = new Set<string>();
	for (const [file, content] of markdownPages(docs)) {
		for (const destination of markdownLinks(content)) {
			if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(destination)) continue;
			const [target, anchor] = destination.split("#");
			const resolved = target ? resolveFrom(file, target) : file;
			if (!files.has(resolved)) {
				broken.add(`${file} -> ${destination} (no file ${resolved})`);
			} else if (anchor && !anchors.get(resolved)?.has(anchor)) {
				broken.add(`${file} -> ${destination} (no heading #${anchor})`);
			}
		}
	}
	return [...broken];
}

/** The `.md` entries of a generated site; `.svg` diagrams are targets only. */
function markdownPages(docs: Record<string, string>): [string, string][] {
	return Object.entries(docs).filter(([file]) => file.endsWith(".md"));
}

/**
 * The docsify site `toDoc` generates for `workspace` is complete and internally
 * consistent: every workspace node the generator documents has a page, every
 * relative link and image in every page resolves to a generated file (and every
 * `#anchor` to a heading in that file), and `_sidebar.md` navigates the whole
 * tree in depth-first order.
 *
 * Runs entirely in memory against the file map `toDoc` returns; nothing is
 * written to disk. Only `.md` files are read for links -- `.svg` diagrams and
 * any `index.html` are link targets, never sources. External `http(s)` and
 * `mailto:` links are skipped.
 */
export async function assertDocSite(workspace: Workspace): Promise<void> {
	const docs = await toDoc(workspace);
	const files = new Set(Object.keys(docs));

	const pages = expectedPages(workspace);
	assertNoProblems(
		"pages missing from the generated site",
		pages.filter((page) => !files.has(page)),
	);
	const known = new Set([SIDEBAR, ...pages]);
	assertNoProblems(
		"pages generated for no workspace node",
		markdownPages(docs)
			.map(([file]) => file)
			.filter((file) => !known.has(file)),
	);

	assertNoProblems("broken links", brokenLinks(docs));

	assert.ok(docs[SIDEBAR], "_sidebar.md was not generated");
	assert.deepStrictEqual(
		parseSidebar(docs[SIDEBAR]),
		expectedSidebar(workspace),
		"_sidebar.md does not navigate the workspace tree depth-first",
	);
}
