/**
 * The two authoring surfaces have to accept the same file.
 *
 * An author writing raw JSON in `.ods` is checked by the generated JSON
 * schema; the same file loaded through `Workspace.fromSchema` is checked by
 * the loader and the rules. Where the two disagree, one of them is lying about
 * what the model is — and until card 135 they did: every map of elements in
 * the schema is optional and an absent one is an empty one (card 104), except
 * that `attributes` was required on `Entity` and on `DataSchema`, so a marker
 * payload with no fields, or a subtype that adds only relations, loaded
 * cleanly and failed `ajv`.
 *
 * The schema read here is core's build output, which is the file the extension
 * and `models/petstore/.ods/schema.json` both carry.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import {
	ODS_VERSION,
	Workspace,
	type WorkspaceSchema,
} from "@open-domain-specification/core";
import { Ajv } from "ajv";
import { describe, expect, it } from "vitest";

const require_ = createRequire(import.meta.url);
const corePkgRoot = dirname(
	require_.resolve("@open-domain-specification/core/package.json"),
);
const jsonSchema = require_(
	join(corePkgRoot, "dist/workspace.schema.json"),
) as object;

/** Whether the generated JSON schema accepts a document, and why not. */
function ajvAccepts(document: unknown): true | string[] {
	const ajv = new Ajv({ strict: false, allErrors: true });
	if (ajv.validate(jsonSchema, document)) return true;
	return (ajv.errors ?? []).map((e) => `${e.instancePath} ${e.message}`);
}

/**
 * A minimal workspace whose entity and whose payload schema both leave
 * `attributes` out, which is what an author writes for a shape that carries
 * nothing and a kind that adds nothing.
 */
function omittingAttributes(): WorkspaceSchema {
	return {
		id: "p",
		name: "P",
		description: "d",
		version: "1",
		odsVersion: ODS_VERSION,
		domains: {
			d: {
				name: "D",
				description: "d",
				subdomains: { s: { name: "S", type: "core", description: "s" } },
			},
		},
		teams: { t: { name: "T" } },
		relationships: [],
		boundedcontexts: {
			a: {
				name: "A",
				description: "a",
				subdomains: [{ $ref: "#/domains/d/subdomains/s" }],
				team: { $ref: "#/teams/t" },
				schemas: { marker: { name: "Marker", description: "carries nothing" } },
				aggregates: {
					x: {
						name: "X",
						description: "x",
						entities: {
							x: {
								name: "X",
								description: "x",
								root: true,
								attributes: {
									id: { name: "id", type: "string", identity: true },
								},
							},
							y: {
								name: "Y",
								description: "a kind of X that adds only relations",
								specialises: {
									$ref: "#/boundedcontexts/a/aggregates/x/entities/x",
								},
							},
						},
					},
				},
			},
		},
	};
}

describe("the JSON schema and the loader accept the same file", () => {
	it("accepts an entity and a payload schema that omit attributes", () => {
		const document = omittingAttributes();
		expect(ajvAccepts(document)).toBe(true);
		expect(Workspace.fromSchema(document).validate()).toEqual([]);
	});

	// Said as the two facts the card is about, so a schema change that makes
	// either required again fails here and not only through the fixture.
	it("requires attributes on neither Entity nor DataSchema", () => {
		const definitions = (
			jsonSchema as {
				definitions: Record<string, { required?: string[] }>;
			}
		).definitions;
		expect(definitions.EntitySchema.required ?? []).not.toContain("attributes");
		expect(definitions.DataSchemaSchema.required ?? []).not.toContain(
			"attributes",
		);
	});
});
