import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Workspace, WorkspaceSet } from "@open-domain-specification/core";

/** The folder NorthBank's build writes its twelve workspace files to. */
export const NORTHBANK_ODS = join(__dirname, "../../../models/northbank/.ods");

/**
 * The actual NorthBank set as a host loads it: every `.json` file of the
 * folder but the schema, in code point order of file name, each stripped of
 * its `$schema` pointer.
 */
export function northbankSet(): WorkspaceSet {
	const files = readdirSync(NORTHBANK_ODS)
		.filter((it) => it.endsWith(".json") && it !== "schema.json")
		.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
	return WorkspaceSet.fromSchemas(
		files.map((file) => {
			const { $schema: _schema, ...schema } = JSON.parse(
				readFileSync(join(NORTHBANK_ODS, file), "utf8"),
			);
			return [file, schema];
		}),
	);
}

/** NorthBank as the single workspace it used to be, frozen for standalone regression. */
export function northbankMonolith(): Workspace {
	return Workspace.fromSchema(
		JSON.parse(
			readFileSync(
				join(
					__dirname,
					"../../../models/northbank/src/fixtures/northbank.monolith.json",
				),
				"utf8",
			),
		),
	);
}

/** Every inline link and image destination of a page, read with a paren counter. */
export function linkDestinations(md: string): string[] {
	const found: string[] = [];
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
		if (depth === 0) found.push(destination.trim());
	}
	return found;
}

/** Resolves a destination found in `from` against the site root. */
export function resolveLink(from: string, destination: string): string {
	const target = decodeURI(destination.split("#")[0]);
	const segments = target.startsWith("/")
		? target.slice(1).split("/")
		: [...from.split("/").slice(0, -1), ...target.split("/")];
	const stack: string[] = [];
	for (const segment of segments) {
		if (segment === "" || segment === ".") continue;
		if (segment === "..") stack.pop();
		else stack.push(segment);
	}
	return stack.join("/");
}

/** Links in `.md` pages that name a file the site does not have. */
export function brokenLinks(docs: Record<string, string>): string[] {
	const broken: string[] = [];
	for (const [file, content] of Object.entries(docs)) {
		if (!file.endsWith(".md")) continue;
		for (const destination of linkDestinations(content)) {
			if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(destination)) continue;
			if (destination.startsWith("#")) continue;
			const resolved = resolveLink(file, destination);
			if (!(resolved in docs)) broken.push(`${file} -> ${destination}`);
		}
	}
	return broken;
}
