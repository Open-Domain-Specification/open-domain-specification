import { aggregate, type Case, runCases, world } from "./rule-cases.support";
import { Workspace } from "./workspace";

/**
 * Slice 9 of issue #57: the rules about the file itself, which are the only
 * rules the DSL cannot express a fault in. A model built through the DSL is
 * written against this core, holds only refs that resolve and carries only
 * fields the metamodel knows, so the hostile models here are JSON: a clean
 * workspace is written out with `toSchema()`, the one fault is put in the JSON
 * the way an author editing the file would put it, and the result is read back
 * through `Workspace.fromSchema`, the loader the extension and the viewer use.
 * The near-miss is the same JSON without the fault. See
 * `rule-cases.boundary.test.ts` for the shape of a pair.
 */

type Json = {
	odsVersion?: string;
	boundedcontexts: Record<string, Record<string, unknown>>;
};

/** A clean one-context workspace, as the JSON a file would hold. */
function file(): Json {
	const { ws, context } = world();
	aggregate(context("Sales"), "Order");
	return JSON.parse(JSON.stringify(ws.toSchema()));
}

/** Reads the JSON back the way the loader does. */
const load = (json: Json) =>
	Workspace.fromSchema(
		json as unknown as Parameters<typeof Workspace.fromSchema>[0],
	);

const fileCases: Case[] = [
	{
		rules: ["ods-version"],
		name: "a file's odsVersion has this core's major",
		fires: ["ods-version"],
		build: (hostile) => {
			const json = file();
			if (hostile) json.odsVersion = "2.0.0";
			return load(json);
		},
	},
	{
		rules: ["ods-version"],
		name: "a file states the odsVersion it was written against, and a newer minor is still this major",
		fires: ["ods-version"],
		build: (hostile) => {
			const json = file();
			if (hostile) delete json.odsVersion;
			else json.odsVersion = "3.99.0";
			return load(json);
		},
	},
	{
		rules: ["unresolved-ref"],
		name: "every $ref a file writes names something",
		// The link is left unset, so the context now serves nothing.
		fires: ["context-serves-subdomain", "unresolved-ref"],
		build: (hostile) => {
			const json = file();
			json.boundedcontexts.sales.subdomains = [
				{
					$ref: hostile
						? "#/domains/domain/subdomains/nothing"
						: "#/domains/domain/subdomains/domain.sub",
				},
			];
			return load(json);
		},
	},
	{
		rules: ["unresolved-ref"],
		name: "a $ref names something of the kind the field holds: a subdomain, not a context",
		fires: ["context-serves-subdomain", "unresolved-ref"],
		build: (hostile) => {
			const json = file();
			json.boundedcontexts.sales.subdomains = [
				{
					$ref: hostile
						? "#/boundedcontexts/sales"
						: "#/domains/domain/subdomains/domain.sub",
				},
			];
			return load(json);
		},
	},
	{
		rules: ["unknown-field"],
		name: "every field a file writes is one the metamodel knows",
		fires: ["unknown-field"],
		build: (hostile) => {
			const json = file();
			if (hostile) json.boundedcontexts.sales.colour = "red";
			return load(json);
		},
	},
	{
		rules: ["unknown-field"],
		name: "a field the metamodel knows, written where it belongs, is not unknown",
		fires: ["unknown-field"],
		build: (hostile) => {
			const json = file();
			// `external` is a field of a context; `nickname` is not.
			if (hostile) json.boundedcontexts.sales.nickname = "S";
			else json.boundedcontexts.sales.external = false;
			return load(json);
		},
	},
];

runCases("rule cases: the file itself", ["file-and-loading"], fileCases);
